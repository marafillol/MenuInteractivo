const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const proyecto = path.resolve(__dirname, "..");

test("etiquetas registran cambios atómicos y conservan tombstones con relaciones", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-etiqueta-outbox-"));
    const rutaDb = path.join(directorio, "prueba.db");
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-integracion-etiqueta-2026",
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
            const Etiqueta = require("./src/modelos/etiquetaModelo");
            const run = (sql, values = []) => new Promise((resolve, reject) =>
                db.run(sql, values, error => error ? reject(error) : resolve())
            );
            const all = (sql, values = []) => new Promise((resolve, reject) =>
                db.all(sql, values, (error, rows) => error ? reject(error) : resolve(rows))
            );
            (async () => {
                await db.preparar();
                const etiqueta = await Etiqueta.crear({
                    nombre: "Historia", descripcion: "Etiqueta de prueba", activo: 1
                });
                await Etiqueta.editar(etiqueta.id_etiqueta, {
                    nombre: "Historia editada", descripcion: "Descripción editada", activo: 1
                });

                let fila = (await all("SELECT * FROM etiqueta WHERE id_etiqueta = ?", [etiqueta.id_etiqueta]))[0];
                let eventos = await all("SELECT operacion, sync_id, version_base, version_resultado FROM sync_eventos ORDER BY id_evento");
                if (!fila.sync_id || fila.sync_version !== 2) throw new Error("Metadatos de etiqueta incorrectos");
                if (eventos.length !== 2 || eventos[0].operacion !== "INSERT" || eventos[1].operacion !== "UPDATE") {
                    throw new Error("Eventos INSERT/UPDATE de etiqueta incorrectos");
                }
                if (eventos.some(evento => evento.sync_id !== fila.sync_id)) throw new Error("El sync_id de etiqueta no coincide");
                if (eventos[1].version_base !== 1 || eventos[1].version_resultado !== 2) throw new Error("Versionado de etiqueta incorrecto");

                await run("CREATE TRIGGER forzar_fallo_outbox_etiqueta BEFORE INSERT ON sync_eventos WHEN NEW.operacion = 'UPDATE' BEGIN SELECT RAISE(ABORT, 'fallo outbox etiqueta'); END");
                let rollback = false;
                try {
                    await Etiqueta.editar(etiqueta.id_etiqueta, {
                        nombre: "No persiste", descripcion: "x", activo: 0
                    });
                } catch (error) {
                    rollback = /fallo outbox etiqueta/.test(error.message);
                }
                if (!rollback) throw new Error("No se propagó el fallo de outbox de etiqueta");
                await run("DROP TRIGGER forzar_fallo_outbox_etiqueta");
                fila = (await all("SELECT nombre, sync_version FROM etiqueta WHERE id_etiqueta = ?", [etiqueta.id_etiqueta]))[0];
                if (fila.nombre !== "Historia editada" || fila.sync_version !== 2) throw new Error("El UPDATE de etiqueta no hizo rollback");

                const borrado = await Etiqueta.eliminar(etiqueta.id_etiqueta);
                if (!borrado.eliminado || !borrado.pendienteSincronizacion) throw new Error("No se creó tombstone de etiqueta");
                fila = (await all("SELECT activo, sync_deleted_at, sync_version FROM etiqueta WHERE id_etiqueta = ?", [etiqueta.id_etiqueta]))[0];
                if (fila.activo !== 0 || !fila.sync_deleted_at || fila.sync_version !== 3) throw new Error("Tombstone de etiqueta incorrecto");
                eventos = await all("SELECT operacion, version_resultado FROM sync_eventos ORDER BY id_evento");
                if (eventos.length !== 3 || eventos[2].operacion !== "DELETE" || eventos[2].version_resultado !== 3) throw new Error("Evento DELETE de etiqueta incorrecto");
                const visibles = await Etiqueta.obtenerTodas();
                if (visibles.some(item => item.id_etiqueta === etiqueta.id_etiqueta)) throw new Error("La etiqueta eliminada sigue en el listado");

                const relacionada = await Etiqueta.crear({
                    nombre: "Etiqueta relacionada", descripcion: null, activo: 1
                });
                await run("INSERT INTO plantilla (nombre, plantilla_json) VALUES (?, ?)", ["Plantilla", "{}"]);
                await run("INSERT INTO menu (nombre, id_plantilla) VALUES (?, ?)", ["Menu", 1]);
                await run("INSERT INTO ficha (id_menu, titulo) VALUES (?, ?)", [1, "Ficha sin sync_id"]);
                await run("INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES (?, ?)", [1, relacionada.id_etiqueta]);

                let bloqueada = false;
                try {
                    await Etiqueta.eliminar(relacionada.id_etiqueta);
                } catch (error) {
                    bloqueada = /sin identidad reconciliada/.test(error.message);
                }
                if (!bloqueada) throw new Error("Se eliminó etiqueta relacionada con ficha sin identidad reconciliada");
                fila = (await all("SELECT activo, sync_deleted_at FROM etiqueta WHERE id_etiqueta = ?", [relacionada.id_etiqueta]))[0];
                if (fila.activo !== 1 || fila.sync_deleted_at !== null) throw new Error("La eliminación bloqueada modificó la etiqueta");

                process.stdout.write(JSON.stringify({ id: etiqueta.id_etiqueta, eventos }) + "\\n");
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
