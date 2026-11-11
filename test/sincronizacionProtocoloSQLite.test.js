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
                    descripcion: null, imagen: null, visible: 1
                });
                assert.equal((await aplicar(menu)).estado, "aplicado");

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

                // El primer cambio desde la versión 1 se aplica.
                const primeraEdicion = evento(8, "ficha", "UPDATE", uuid(3), 1, 2, {
                    menu_sync_id: uuid(2), titulo: "Primera edición", visible: 1
                });
                assert.equal((await aplicar(primeraEdicion)).estado, "aplicado");

                // Otro evento distinto intenta aplicar la misma versión 2
                // desde la misma versión base: debe ser conflicto, no duplicado.
                const mismaVersion = evento(9, "ficha", "UPDATE", uuid(3), 1, 2, {
                    menu_sync_id: uuid(2), titulo: "Edición concurrente", visible: 1
                });
                assert.equal((await aplicar(mismaVersion)).estado, "conflicto");

                // También se conserva el caso de una edición basada en una
                // versión obsoleta.
                const versionObsoleta = evento(10, "ficha", "UPDATE", uuid(3), 0, 2, {
                    menu_sync_id: uuid(2), titulo: "Edición obsoleta", visible: 1
                });
                assert.equal((await aplicar(versionObsoleta)).estado, "conflicto");

                const original = await all("SELECT titulo, sync_version FROM ficha WHERE sync_id = ?", [uuid(3)]);
                const conflictos = await all("SELECT entidad, sync_id, resuelto FROM sync_conflictos");
                if (original[0].titulo !== "Primera edición" || original[0].sync_version !== 2) {
                    throw new Error("Un evento concurrente sobrescribió la primera edición");
                }
                if (conflictos.length !== 2 || conflictos.some(fila => fila.entidad !== "ficha")) {
                    throw new Error("Los dos conflictos no quedaron registrados");
                }
                const recibidos = await all("SELECT COUNT(*) AS cantidad FROM sync_eventos");
                if (recibidos[0].cantidad !== 8) throw new Error("Los eventos aplicados no se registraron como recibidos");

                process.stdout.write(JSON.stringify({ entidades: 7, conflictos: conflictos.length }) + "\\n");
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `]);
        assert.equal(operacion.status, 0, operacion.stderr || operacion.stdout);
        assert.match(operacion.stdout, /"entidades":7,"conflictos":1/);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }
});
