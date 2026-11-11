const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const proyecto = path.resolve(__dirname, "..");

test("el protocolo aplica eventos por UUID, evita duplicados y registra conflictos", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-protocolo-sync-"));
    const rutaDb = path.join(directorio, "protocolo.db");
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-protocolo-sync-2026",
        DATABASE_SQLITE_PATH: rutaDb
    };
    const ejecutar = (args) => spawnSync(process.execPath, args, {
        cwd: proyecto, env, encoding: "utf8"
    });

    try {
        const esquema = ejecutar(["scripts/preparar-outbox-fichas-local.js"]);
        assert.equal(esquema.status, 0, esquema.stderr || esquema.stdout);

        const operacion = ejecutar(["-e", `
            const db = require("./src/database");
            const { aplicarEvento } = require("./src/servicios/sincronizacion/protocolo");
            const run = (sql, values = []) => new Promise((resolve, reject) =>
                db.run(sql, values, error => error ? reject(error) : resolve())
            );
            const all = (sql, values = []) => new Promise((resolve, reject) =>
                db.all(sql, values, (error, rows) => error ? reject(error) : resolve(rows))
            );
            const uuid = n => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
            const evento = (n, entidad, operacion, sync_id, version_base, version_resultado, payload) => ({
                evento_id: uuid(100 + n), origen_device_id: uuid(999), entidad, operacion,
                sync_id, version_base, version_resultado, payload_json: payload
            });
            (async () => {
                await db.preparar();
                const aplicar = evento => db.withTransaction(consultar =>
                    aplicarEvento(consultar, evento, { registrarRecepcion: true })
                );

                const plantilla = evento(1, "plantilla", "INSERT", uuid(1), 0, 1, {
                    nombre: "Plantilla compartida", descripcion: null,
                    plantilla_json: "{}", activo: 1
                });
                assert.equal((await aplicar(plantilla)).estado, "aplicado");
                assert.equal((await aplicar(plantilla)).estado, "duplicado");

                const menu = evento(2, "menu", "INSERT", uuid(2), 0, 1, {
                    plantilla_sync_id: uuid(1), nombre: "Menú compartido",
                    descripcion: null, imagen: "https://storage.example/menu.png",
                    imagen_storage_key: "multimedia/covers/menu/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png",
                    imagen_checksum_sha256: "a".repeat(64),
                    imagen_mime_type: "image/png", imagen_tamano_bytes: 123,
                    visible: 1
                });
                assert.equal((await aplicar(menu)).estado, "aplicado");
                const portadaMenu = await all("SELECT imagen_storage_key, imagen_checksum_sha256, imagen_tamano_bytes FROM menu WHERE sync_id = ?", [uuid(2)]);
                assert.equal(portadaMenu[0].imagen_storage_key, "multimedia/covers/menu/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png");
                assert.equal(portadaMenu[0].imagen_checksum_sha256, "a".repeat(64));
                assert.equal(portadaMenu[0].imagen_tamano_bytes, 123);

                const ficha = evento(3, "ficha", "INSERT", uuid(3), 0, 1, {
                    menu_sync_id: uuid(2), titulo: "Ficha compartida",
                    resumen: null, texto: "Contenido", imagen: null,
                    datos_json: "{}", visible: 1
                });
                assert.equal((await aplicar(ficha)).estado, "aplicado");

                const etiqueta = evento(4, "etiqueta", "INSERT", uuid(4), 0, 1, {
                    nombre: "Historia", descripcion: null, activo: 1
                });
                assert.equal((await aplicar(etiqueta)).estado, "aplicado");

                const relacion = evento(5, "ficha_etiqueta", "INSERT", uuid(5), 0, 1, {
                    ficha_sync_id: uuid(3), etiqueta_sync_id: uuid(4)
                });
                assert.equal((await aplicar(relacion)).estado, "aplicado");

                const segundaFicha = evento(6, "ficha", "INSERT", uuid(6), 0, 1, {
                    menu_sync_id: uuid(2), titulo: "Segunda ficha",
                    resumen: null, texto: null, imagen: null, datos_json: "{}", visible: 1
                });
                assert.equal((await aplicar(segundaFicha)).estado, "aplicado");

                const relacionFichas = evento(7, "relacion_ficha", "INSERT", uuid(7), 0, 1, {
                    ficha_origen_sync_id: uuid(3),
                    ficha_destino_sync_id: uuid(6),
                    tipo_relacion: "relacionada"
                });
                assert.equal((await aplicar(relacionFichas)).estado, "aplicado");

                const filas = await all(
                    "SELECT f.titulo, m.nombre AS menu, p.nombre AS plantilla " +
                    "FROM ficha f JOIN menu m ON m.id_menu = f.id_menu " +
                    "JOIN plantilla p ON p.id_plantilla = m.id_plantilla WHERE f.sync_id = ?",
                    [uuid(3)]
                );
                if (filas.length !== 1 || filas[0].titulo !== "Ficha compartida" ||
                    filas[0].menu !== "Menú compartido" || filas[0].plantilla !== "Plantilla compartida") {
                    throw new Error("No se resolvieron las referencias por UUID");
                }
                const relaciones = await all("SELECT * FROM ficha_etiqueta WHERE sync_id = ?", [uuid(5)]);
                if (relaciones.length !== 1) throw new Error("No se aplicó la relación ficha-etiqueta");

                const relacionGuardada = await all("SELECT tipo_relacion FROM relacion_ficha WHERE sync_id = ?", [uuid(7)]);
                if (relacionGuardada.length !== 1 || relacionGuardada[0].tipo_relacion !== "relacionada") {
                    throw new Error("No se aplicó la relación entre fichas");
                }

                // Un hijo recibido antes que su menú no se confirma ni consume su evento.
                const fichaFueraDeOrden = evento(11, "ficha", "INSERT", uuid(8), 0, 1, {
                    menu_sync_id: uuid(9), titulo: "Hija fuera de orden",
                    resumen: null, texto: null, imagen: null, datos_json: "{}", visible: 1
                });
                await assert.rejects(aplicar(fichaFueraDeOrden), /Falta reconciliar la entidad padre/);
                const noRecibida = await all("SELECT evento_id FROM sync_eventos WHERE evento_id = ?", [uuid(111)]);
                assert.equal(noRecibida.length, 0);
                const menuPadreTardio = evento(12, "menu", "INSERT", uuid(9), 0, 1, {
                    plantilla_sync_id: uuid(1), nombre: "Menú padre tardío", visible: 1
                });
                assert.equal((await aplicar(menuPadreTardio)).estado, "aplicado");
                assert.equal((await aplicar(fichaFueraDeOrden)).estado, "aplicado");
                const hijaGuardada = await all("SELECT titulo FROM ficha WHERE sync_id = ?", [uuid(8)]);
                assert.equal(hijaGuardada[0].titulo, "Hija fuera de orden");

                // Simula que este nodo ya avanzó localmente a la versión 2.
                // El evento remoto todavía parte de la versión 1 y debe quedar en conflicto.
                await run("UPDATE ficha SET titulo = ?, sync_version = 2 WHERE sync_id = ?", [
                    "Edición local concurrente", uuid(3)
                ]);
                const conflicto = evento(8, "ficha", "UPDATE", uuid(3), 1, 2, {
                    menu_sync_id: uuid(2), titulo: "Edición concurrente", visible: 1
                });
                assert.equal((await aplicar(conflicto)).estado, "conflicto");
                assert.equal((await aplicar(conflicto)).estado, "duplicado",
                    "un reintento del mismo conflicto no debe crear otra recepción");
                const mismoResultadoOtraOperacion = evento(9, "ficha", "UPDATE", uuid(3), 0, 1, {
                    menu_sync_id: uuid(2), titulo: "Otro evento sobre versión ocupada", visible: 1
                });
                assert.equal((await aplicar(mismoResultadoOtraOperacion)).estado, "conflicto");
                const borradoAusente = evento(10, "ficha", "DELETE", uuid(44), 0, 1, {});
                assert.equal((await aplicar(borradoAusente)).estado, "conflicto");
                assert.equal((await aplicar(borradoAusente)).estado, "duplicado",
                    "un DELETE de una fila ausente tampoco debe duplicar conflictos al reintentar");
                const original = await all("SELECT titulo, sync_version FROM ficha WHERE sync_id = ?", [uuid(3)]);
                const conflictos = await all("SELECT entidad, sync_id, resuelto FROM sync_conflictos");
                if (original[0].titulo !== "Edición local concurrente" || original[0].sync_version !== 2) {
                    throw new Error("El conflicto sobrescribió el contenido local");
                }
                if (conflictos.length !== 3 || conflictos.some(conflicto => conflicto.entidad !== "ficha")) {
                    throw new Error("El conflicto no quedó registrado");
                }
                const recibidos = await all("SELECT COUNT(*) AS cantidad FROM sync_eventos");
                if (recibidos[0].cantidad !== 12) throw new Error("No se registraron los eventos aplicados y los conflictos confirmados");

                process.stdout.write(JSON.stringify({ entidades: 7, conflictos: conflictos.length }) + "\\n");
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `]);
        assert.equal(operacion.status, 0, operacion.stderr || operacion.stdout);
        assert.match(operacion.stdout, /"entidades":7,"conflictos":3/);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }
});


test("el protocolo rechaza saltos y retrocesos de versión antes de modificar contenido", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-versiones-sync-"));
    const rutaDb = path.join(directorio, "versiones.db");
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-versiones-sync-2026",
        DATABASE_SQLITE_PATH: rutaDb
    };
    const ejecutar = (args) => spawnSync(process.execPath, args, {
        cwd: proyecto, env, encoding: "utf8"
    });

    try {
        const esquema = ejecutar(["scripts/preparar-outbox-fichas-local.js"]);
        assert.equal(esquema.status, 0, esquema.stderr || esquema.stdout);
        const operacion = ejecutar(["-e", `
            const assert = require("node:assert/strict");
            const db = require("./src/database");
            const { aplicarEvento } = require("./src/servicios/sincronizacion/protocolo");
            const uuid = n => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
            const all = (sql, values = []) => new Promise((resolve, reject) =>
                db.all(sql, values, (error, rows) => error ? reject(error) : resolve(rows))
            );
            (async () => {
                await db.preparar();
                const base = {
                    origen_device_id: uuid(99), entidad: "plantilla",
                    sync_id: uuid(1), version_base: 0, version_resultado: 1,
                    operacion: "INSERT",
                    payload_json: { nombre: "Original", plantilla_json: "{}", activo: 1 }
                };
                await db.withTransaction(q => aplicarEvento(q, { ...base, evento_id: uuid(10) }));
                for (const [n, resultado] of [[11, 3], [12, 1]]) {
                    await assert.rejects(
                        db.withTransaction(q => aplicarEvento(q, {
                            ...base, evento_id: uuid(n), operacion: "UPDATE",
                            version_base: 1, version_resultado: resultado,
                            payload_json: { nombre: "No debe aplicarse" }
                        })),
                        /versión resultado debe ser exactamente/
                    );
                }
                const filas = await all("SELECT nombre, sync_version FROM plantilla WHERE sync_id = ?", [uuid(1)]);
                assert.equal(filas.length, 1);
                assert.equal(filas[0].nombre, "Original");
                assert.equal(filas[0].sync_version, 1);
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `]);
        assert.equal(operacion.status, 0, operacion.stderr || operacion.stdout);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }
});
