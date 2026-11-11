const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const proyecto = path.resolve(__dirname, "..");

test("altas y modificaciones de fichas generan eventos atómicos en SQLite local", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-ficha-outbox-"));
    const rutaDb = path.join(directorio, "prueba.db");
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-integracion-ficha-2026",
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
            const Ficha = require("./src/modelos/ficha");
            const run = (sql, values = []) => new Promise((resolve, reject) =>
                db.run(sql, values, error => error ? reject(error) : resolve())
            );
            const all = (sql, values = []) => new Promise((resolve, reject) =>
                db.all(sql, values, (error, rows) => error ? reject(error) : resolve(rows))
            );
            (async () => {
                await db.preparar();
                await run("INSERT INTO plantilla (nombre, plantilla_json) VALUES (?, ?)", ["Plantilla test", "{}"]);
                await run("INSERT INTO menu (nombre, id_plantilla) VALUES (?, ?)", ["Menu test", 1]);
                await run("UPDATE menu SET sync_id = ? WHERE id_menu = 1", ["11111111-1111-4111-8111-111111111111"]);
                const id = await Ficha.crear({
                    id_menu: 1, titulo: "Ficha offline", resumen: "Resumen",
                    texto: "Texto", imagen: null, datos_json: "{}", visible: 1
                });
                await Ficha.actualizar(id, {
                    id_menu: 1, titulo: "Ficha editada", resumen: "Resumen 2",
                    texto: "Texto 2", datos_json: "{}", visible: 1
                });
                const ficha = (await all("SELECT * FROM ficha WHERE id_ficha = ?", [id]))[0];
                const eventos = await all(
                    "SELECT entidad, operacion, sync_id, version_base, version_resultado FROM sync_eventos ORDER BY id_evento"
                );
                if (!ficha.sync_id || ficha.sync_version !== 2) throw new Error("Metadatos de ficha incorrectos");
                if (eventos.length !== 2) throw new Error("Se esperaban dos eventos");
                if (eventos[0].operacion !== "INSERT" || eventos[1].operacion !== "UPDATE") throw new Error("Operaciones incorrectas");
                if (eventos.some(evento => evento.sync_id !== ficha.sync_id)) throw new Error("El sync_id no coincide");
                if (eventos[1].version_base !== 1 || eventos[1].version_resultado !== 2) throw new Error("Versionado incorrecto");

                await run("CREATE TRIGGER forzar_fallo_outbox_update BEFORE INSERT ON sync_eventos WHEN NEW.operacion = 'UPDATE' BEGIN SELECT RAISE(ABORT, 'fallo de outbox intencional'); END");
                let rollbackDetectado = false;
                try {
                    await Ficha.actualizar(id, {
                        id_menu: 1, titulo: "No debe persistir", resumen: "x",
                        texto: "x", datos_json: "{}", visible: 1
                    });
                } catch (error) {
                    rollbackDetectado = /fallo de outbox intencional/.test(error.message);
                }
                if (!rollbackDetectado) throw new Error("No se propagó el fallo de outbox");
                await run("DROP TRIGGER forzar_fallo_outbox_update");
                const trasRollback = (await all("SELECT titulo, sync_version FROM ficha WHERE id_ficha = ?", [id]))[0];
                if (trasRollback.titulo !== "Ficha editada" || trasRollback.sync_version !== 2) {
                    throw new Error("La modificación no se revirtió junto con el evento");
                }

                // Preparar asociaciones ya reconciliadas para comprobar que
                // el borrado de la ficha también propaga sus tombstones.
                await run("INSERT INTO ficha (id_menu, titulo, sync_id, sync_version) VALUES (?, ?, ?, 1)", [
                    1, "Ficha relacionada", "55555555-5555-4555-8555-555555555555"
                ]);
                await run("INSERT INTO etiqueta (nombre, sync_id, sync_version) VALUES (?, ?, 1)", [
                    "Etiqueta test", "66666666-6666-4666-8666-666666666666"
                ]);
                await run("INSERT INTO relacion_ficha (id_ficha_origen, id_ficha_destino, tipo_relacion, sync_id, sync_version) VALUES (?, ?, ?, ?, 1)", [
                    id, 2, "relacionada", "77777777-7777-4777-8777-777777777777"
                ]);
                await run("INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta, sync_id, sync_version) VALUES (?, ?, ?, 1)", [
                    id, 1, "88888888-8888-4888-8888-888888888888"
                ]);

                const borrado = await Ficha.eliminarCompleta(id);
                if (!borrado.eliminada || !borrado.pendienteSincronizacion) throw new Error("No se creó tombstone");
                const tombstone = (await all("SELECT sync_deleted_at, sync_version FROM ficha WHERE id_ficha = ?", [id]))[0];
                if (!tombstone.sync_deleted_at || tombstone.sync_version !== 3) throw new Error("Tombstone incorrecto");
                const totalEventos = await all("SELECT entidad, operacion, version_resultado FROM sync_eventos ORDER BY id_evento");
                const bajas = totalEventos.slice(2);
                if (bajas.length !== 3 ||
                    bajas[0].entidad !== "relacion_ficha" || bajas[0].operacion !== "DELETE" || bajas[0].version_resultado !== 2 ||
                    bajas[1].entidad !== "ficha_etiqueta" || bajas[1].operacion !== "DELETE" || bajas[1].version_resultado !== 2 ||
                    bajas[2].entidad !== "ficha" || bajas[2].operacion !== "DELETE" || bajas[2].version_resultado !== 3) {
                    throw new Error("El borrado debe emitir primero los tombstones de relaciones y etiquetas, y luego el de la ficha");
                }
                const relacionesBorradas = await all("SELECT sync_deleted_at, sync_version FROM relacion_ficha WHERE id_ficha_origen = ?", [id]);
                const etiquetasBorradas = await all("SELECT sync_deleted_at, sync_version FROM ficha_etiqueta WHERE id_ficha = ?", [id]);
                if (!relacionesBorradas[0]?.sync_deleted_at || relacionesBorradas[0].sync_version !== 2 ||
                    !etiquetasBorradas[0]?.sync_deleted_at || etiquetasBorradas[0].sync_version !== 2) {
                    throw new Error("Las asociaciones no quedaron tombstoneadas");
                }
                const visibles = await Ficha.obtenerFichas();
                if (visibles.some(fila => fila.id_ficha === id)) throw new Error("La ficha eliminada sigue visible en las consultas");

                // Una ficha cuyo menú aún no fue reconciliado debe seguir
                // funcionando offline, pero no puede emitir un evento inválido.
                await run("UPDATE menu SET sync_id = NULL WHERE id_menu = 1");
                const localId = await Ficha.crear({
                    id_menu: 1, titulo: "Ficha solo local", resumen: null,
                    texto: null, imagen: null, datos_json: null, visible: 1
                });
                const local = (await all("SELECT sync_id FROM ficha WHERE id_ficha = ?", [localId]))[0];
                const eventosTrasLocal = await all("SELECT COUNT(*) AS cantidad FROM sync_eventos");
                if (local.sync_id !== null || eventosTrasLocal[0].cantidad !== 3) {
                    throw new Error("Una ficha con menú no reconciliado generó un evento o UUID inválido");
                }

                process.stdout.write(JSON.stringify({ id, syncId: ficha.sync_id, eventos: totalEventos }) + "\\n");
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `]);
        assert.equal(operacion.status, 0, operacion.stderr || operacion.stdout);
        assert.match(operacion.stdout, /"operacion":"INSERT"/);
        assert.match(operacion.stdout, /"operacion":"UPDATE"/);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }
});
