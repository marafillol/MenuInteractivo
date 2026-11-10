const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const proyecto = path.resolve(__dirname, "..");

test("multimedia registra eventos con checksum y storage_key, sin rutas locales", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-multimedia-outbox-"));
    const rutaArchivos = path.join(proyecto, "imagenes", "multimedia", "imagen", randomUUID());
    fs.mkdirSync(rutaArchivos, { recursive: true });
    const rutaRelativa = path.relative(proyecto, rutaArchivos).split(path.sep).join("/");
    const rutaInicial = path.join(rutaArchivos, "inicial.png");
    const rutaNueva = path.join(rutaArchivos, "actualizada.png");
    fs.writeFileSync(rutaInicial, Buffer.from("contenido multimedia inicial"));
    fs.writeFileSync(rutaNueva, Buffer.from("contenido multimedia actualizado"));

    const rutaDb = path.join(directorio, "prueba.db");
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-integracion-multimedia-2026",
        DATABASE_SQLITE_PATH: rutaDb,
        MULTIMEDIA_TEST_DIR: rutaRelativa
    };
    const ejecutar = (args) => spawnSync(process.execPath, args, {
        cwd: proyecto, env, encoding: "utf8"
    });

    try {
        const esquema = ejecutar(["scripts/preparar-outbox-fichas-local.js"]);
        assert.equal(esquema.status, 0, esquema.stderr || esquema.stdout);

        const operacion = ejecutar(["-e", `
            const db = require("./src/database");
            const Multimedia = require("./src/modelos/multimedia");
            const fs = require("node:fs");
            const path = require("node:path");
            const crypto = require("node:crypto");
            const run = (sql, values = []) => new Promise((resolve, reject) =>
                db.run(sql, values, error => error ? reject(error) : resolve())
            );
            const all = (sql, values = []) => new Promise((resolve, reject) =>
                db.all(sql, values, (error, rows) => error ? reject(error) : resolve(rows))
            );
            (async () => {
                await db.preparar();
                await run("INSERT INTO plantilla (nombre, plantilla_json, sync_id) VALUES (?, ?, ?)", [
                    "Plantilla", "{}", "11111111-1111-4111-8111-111111111111"
                ]);
                await run("INSERT INTO menu (nombre, id_plantilla, sync_id) VALUES (?, ?, ?)", [
                    "Menú", 1, "22222222-2222-4222-8222-222222222222"
                ]);
                await run("INSERT INTO ficha (id_menu, titulo, sync_id) VALUES (?, ?, ?)", [
                    1, "Ficha", "33333333-3333-4333-8333-333333333333"
                ]);

                const rutaInicialRelativa = process.env.MULTIMEDIA_TEST_DIR + "/inicial.png";
                const rutaNuevaRelativa = process.env.MULTIMEDIA_TEST_DIR + "/actualizada.png";
                const inicial = fs.readFileSync(path.join(process.cwd(), rutaInicialRelativa));
                const nueva = fs.readFileSync(path.join(process.cwd(), rutaNuevaRelativa));
                const id = await Multimedia.crear({
                    id_ficha: 1, descripcion: "Archivo de prueba",
                    ruta_archivo: rutaInicialRelativa, tipo_multi: "imagen",
                    miniatura: "🖼️", activo: 1, creado: new Date().toISOString(),
                    mime_type: "image/png", tamano_bytes: inicial.length
                });

                let fila = (await all("SELECT * FROM multimedia WHERE id_multi = ?", [id]))[0];
                let eventos = await all("SELECT operacion, entidad, sync_id, version_base, version_resultado, payload_json FROM sync_eventos WHERE entidad = 'multimedia' ORDER BY id_evento");
                const checksumInicial = crypto.createHash("sha256").update(inicial).digest("hex");
                if (!fila.sync_id || fila.sync_version !== 1 || fila.checksum_sha256 !== checksumInicial) {
                    throw new Error("Metadatos iniciales de multimedia incorrectos");
                }
                if (fila.tamano_bytes !== inicial.length || fila.mime_type !== "image/png" || !fila.storage_key) {
                    throw new Error("Faltan metadatos del archivo");
                }
                if (eventos.length !== 1 || eventos[0].operacion !== "INSERT" || eventos[0].version_resultado !== 1) {
                    throw new Error("Evento INSERT de multimedia incorrecto");
                }
                const payloadInicial = JSON.parse(eventos[0].payload_json);
                if (payloadInicial.checksum_sha256 !== checksumInicial || payloadInicial.storage_key !== fila.storage_key) {
                    throw new Error("El evento no contiene integridad y storage_key");
                }
                if (JSON.stringify(payloadInicial).includes(rutaInicialRelativa)) {
                    throw new Error("El payload expuso una ruta local");
                }

                await run("CREATE TRIGGER forzar_fallo_outbox_multimedia BEFORE INSERT ON sync_eventos WHEN NEW.entidad = 'multimedia' AND NEW.operacion = 'UPDATE' BEGIN SELECT RAISE(ABORT, 'fallo outbox multimedia'); END");
                let rollback = false;
                try {
                    await Multimedia.actualizar(id, {
                        id_ficha: 1, descripcion: "No persiste",
                        ruta_archivo: rutaNuevaRelativa, tipo_multi: "imagen",
                        miniatura: "🖼️", activo: 1,
                        mime_type: "image/png", tamano_bytes: nueva.length,
                        actualizado: new Date().toISOString()
                    });
                } catch (error) {
                    rollback = /fallo outbox multimedia/.test(error.message);
                }
                if (!rollback) throw new Error("No se propagó el fallo de outbox multimedia");
                await run("DROP TRIGGER forzar_fallo_outbox_multimedia");
                fila = (await all("SELECT ruta_archivo, checksum_sha256, sync_version FROM multimedia WHERE id_multi = ?", [id]))[0];
                if (fila.ruta_archivo !== rutaInicialRelativa || fila.checksum_sha256 !== checksumInicial || fila.sync_version !== 1) {
                    throw new Error("El UPDATE de multimedia no hizo rollback");
                }

                await Multimedia.actualizar(id, {
                    id_ficha: 1, descripcion: "Archivo actualizado",
                    ruta_archivo: rutaNuevaRelativa, tipo_multi: "imagen",
                    miniatura: "🖼️", activo: 1,
                    mime_type: "image/png", tamano_bytes: nueva.length,
                    actualizado: new Date().toISOString()
                });
                fila = (await all("SELECT * FROM multimedia WHERE id_multi = ?", [id]))[0];
                const checksumNuevo = crypto.createHash("sha256").update(nueva).digest("hex");
                if (fila.sync_version !== 2 || fila.checksum_sha256 !== checksumNuevo || fila.ruta_archivo !== rutaNuevaRelativa) {
                    throw new Error("Metadatos UPDATE de multimedia incorrectos");
                }
                eventos = await all("SELECT operacion, version_base, version_resultado, payload_json FROM sync_eventos WHERE entidad = 'multimedia' ORDER BY id_evento");
                if (eventos.length !== 2 || eventos[1].operacion !== "UPDATE" || eventos[1].version_base !== 1 || eventos[1].version_resultado !== 2) {
                    throw new Error("Evento UPDATE de multimedia incorrecto");
                }
                if (JSON.stringify(JSON.parse(eventos[1].payload_json)).includes(rutaNuevaRelativa)) {
                    throw new Error("El evento UPDATE expuso una ruta local");
                }

                await Multimedia.eliminar(id);
                fila = (await all("SELECT activo, sync_deleted_at, sync_version FROM multimedia WHERE id_multi = ?", [id]))[0];
                if (fila.activo !== 0 || !fila.sync_deleted_at || fila.sync_version !== 3) {
                    throw new Error("Tombstone DELETE de multimedia incorrecto");
                }
                eventos = await all("SELECT operacion, version_resultado, payload_json FROM sync_eventos WHERE entidad = 'multimedia' ORDER BY id_evento");
                if (eventos.length !== 3 || eventos[2].operacion !== "DELETE" || eventos[2].version_resultado !== 3) {
                    throw new Error("Evento DELETE de multimedia incorrecto");
                }
                const visibles = await Multimedia.obtenerMultimedia();
                if (visibles.some(item => item.id_multi === id)) throw new Error("Multimedia eliminada sigue visible");

                await run("INSERT INTO ficha (id_menu, titulo) VALUES (?, ?)", [1, "Ficha histórica sin sync_id"]);
                const localId = await Multimedia.crear({
                    id_ficha: 2, descripcion: "Multimedia local histórica",
                    ruta_archivo: rutaInicialRelativa, tipo_multi: "imagen",
                    miniatura: "🖼️", activo: 1, creado: new Date().toISOString(),
                    mime_type: "image/png", tamano_bytes: inicial.length
                });
                const local = (await all("SELECT sync_id, storage_key, checksum_sha256 FROM multimedia WHERE id_multi = ?", [localId]))[0];
                const cantidadEventos = await all("SELECT COUNT(*) AS cantidad FROM sync_eventos WHERE entidad = 'multimedia'");
                if (local.sync_id !== null || local.storage_key !== null || local.checksum_sha256 !== checksumInicial) {
                    throw new Error("Multimedia bajo ficha histórica recibió identidad o storage_key inválidos");
                }
                if (cantidadEventos[0].cantidad !== 3) throw new Error("Multimedia local no reconciliada generó evento inválido");

                process.stdout.write(JSON.stringify({ id, eventos: eventos.map(e => e.operacion) }) + "\\n");
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `]);
        assert.equal(operacion.status, 0, operacion.stderr || operacion.stdout);
        assert.match(operacion.stdout, /"eventos":\["INSERT","UPDATE","DELETE"\]/);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
        fs.rmSync(rutaArchivos, { recursive: true, force: true });
    }
});
