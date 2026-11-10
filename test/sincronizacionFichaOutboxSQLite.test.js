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
                await run("ALTER TABLE menu ADD COLUMN sync_id TEXT");
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

                await run(`
                    CREATE TRIGGER forzar_fallo_outbox_update
                    BEFORE INSERT ON sync_eventos
                    WHEN NEW.operacion = 'UPDATE'
                    BEGIN SELECT RAISE(ABORT, 'fallo de outbox intencional'); END
                `);
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

                const borrado = await Ficha.eliminarCompleta(id);
                if (!borrado.eliminada || !borrado.pendienteSincronizacion) throw new Error("No se creó tombstone");
                const tombstone = (await all("SELECT sync_deleted_at, sync_version FROM ficha WHERE id_ficha = ?", [id]))[0];
                if (!tombstone.sync_deleted_at || tombstone.sync_version !== 3) throw new Error("Tombstone incorrecto");
                const totalEventos = await all("SELECT operacion, version_resultado FROM sync_eventos ORDER BY id_evento");
                if (totalEventos.length !== 3 || totalEventos[2].operacion !== "DELETE" || totalEventos[2].version_resultado !== 3) {
                    throw new Error("Evento de borrado lógico incorrecto");
                }
                const visibles = await Ficha.obtenerFichas();
                if (visibles.some(fila => fila.id_ficha === id)) throw new Error("La ficha eliminada sigue visible en las consultas");

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
