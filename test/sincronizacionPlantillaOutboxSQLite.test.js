const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const proyecto = path.resolve(__dirname, "..");

test("plantillas registran INSERT, UPDATE y DELETE atómicos en la outbox SQLite", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-plantilla-outbox-"));
    const rutaDb = path.join(directorio, "prueba.db");
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-integracion-plantilla-2026",
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
            const Plantilla = require("./src/modelos/plantilla");
            const run = (sql, values = []) => new Promise((resolve, reject) =>
                db.run(sql, values, error => error ? reject(error) : resolve())
            );
            const all = (sql, values = []) => new Promise((resolve, reject) =>
                db.all(sql, values, (error, rows) => error ? reject(error) : resolve(rows))
            );
            (async () => {
                await db.preparar();
                const id = await Plantilla.crear({
                    nombre: "Plantilla offline", descripcion: "Descripción",
                    plantilla_json: JSON.stringify({ campos: [] }), activo: 1
                });
                await Plantilla.actualizar(id, {
                    nombre: "Plantilla editada", descripcion: "Descripción editada",
                    plantilla_json: JSON.stringify({ campos: [{ nombre: "titulo" }] }), activo: 1
                });

                let plantilla = (await all("SELECT * FROM plantilla WHERE id_plantilla = ?", [id]))[0];
                let eventos = await all("SELECT operacion, sync_id, version_base, version_resultado FROM sync_eventos ORDER BY id_evento");
                if (!plantilla.sync_id || plantilla.sync_version !== 2) throw new Error("Metadatos de plantilla incorrectos");
                if (eventos.length !== 2 || eventos[0].operacion !== "INSERT" || eventos[1].operacion !== "UPDATE") {
                    throw new Error("Eventos INSERT/UPDATE de plantilla incorrectos");
                }
                if (eventos.some(evento => evento.sync_id !== plantilla.sync_id)) throw new Error("El sync_id de plantilla no coincide");
                if (eventos[1].version_base !== 1 || eventos[1].version_resultado !== 2) throw new Error("Versionado de plantilla incorrecto");

                await run("CREATE TRIGGER forzar_fallo_outbox_plantilla BEFORE INSERT ON sync_eventos WHEN NEW.operacion = 'UPDATE' BEGIN SELECT RAISE(ABORT, 'fallo outbox plantilla'); END");
                let rollback = false;
                try {
                    await Plantilla.actualizar(id, {
                        nombre: "No persiste", descripcion: "x",
                        plantilla_json: "{}", activo: 0
                    });
                } catch (error) {
                    rollback = /fallo outbox plantilla/.test(error.message);
                }
                if (!rollback) throw new Error("No se propagó el fallo de outbox de plantilla");
                await run("DROP TRIGGER forzar_fallo_outbox_plantilla");
                plantilla = (await all("SELECT nombre, sync_version FROM plantilla WHERE id_plantilla = ?", [id]))[0];
                if (plantilla.nombre !== "Plantilla editada" || plantilla.sync_version !== 2) {
                    throw new Error("El UPDATE de plantilla no hizo rollback");
                }

                const borrado = await Plantilla.eliminar(id);
                if (!borrado.eliminada || !borrado.pendienteSincronizacion) throw new Error("No se creó tombstone de plantilla");
                plantilla = (await all("SELECT activo, sync_deleted_at, sync_version FROM plantilla WHERE id_plantilla = ?", [id]))[0];
                if (plantilla.activo !== 0 || !plantilla.sync_deleted_at || plantilla.sync_version !== 3) {
                    throw new Error("Tombstone de plantilla incorrecto");
                }
                eventos = await all("SELECT operacion, version_resultado FROM sync_eventos ORDER BY id_evento");
                if (eventos.length !== 3 || eventos[2].operacion !== "DELETE" || eventos[2].version_resultado !== 3) {
                    throw new Error("Evento DELETE de plantilla incorrecto");
                }
                const visibles = await Plantilla.obtenerPlantillas();
                if (visibles.some(fila => fila.id_plantilla === id)) throw new Error("La plantilla eliminada sigue en el listado");

                process.stdout.write(JSON.stringify({ id, syncId: eventos[0].sync_id, eventos }) + "\\n");
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `]);
        assert.equal(operacion.status, 0, operacion.stderr || operacion.stdout);
        assert.match(operacion.stdout, /"operacion":"INSERT"/);
        assert.match(operacion.stdout, /"operacion":"UPDATE"/);
        assert.match(operacion.stdout, /"operacion":"DELETE"/);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }
});
