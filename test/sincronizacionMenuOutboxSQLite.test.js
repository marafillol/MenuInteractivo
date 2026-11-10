const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const proyecto = path.resolve(__dirname, "..");

test("menús registran INSERT, UPDATE y DELETE atómicos en la outbox SQLite", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-menu-outbox-"));
    const rutaDb = path.join(directorio, "prueba.db");
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-integracion-menu-2026",
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
            const Menu = require("./src/modelos/menu");
            const run = (sql, values = []) => new Promise((resolve, reject) =>
                db.run(sql, values, error => error ? reject(error) : resolve())
            );
            const all = (sql, values = []) => new Promise((resolve, reject) =>
                db.all(sql, values, (error, rows) => error ? reject(error) : resolve(rows))
            );
            (async () => {
                await db.preparar();
                await run("INSERT INTO plantilla (nombre, plantilla_json) VALUES (?, ?)", ["Plantilla sincronizada", "{}"]);
                await run("UPDATE plantilla SET sync_id = ? WHERE id_plantilla = 1", ["22222222-2222-4222-8222-222222222222"]);

                const id = await Menu.crear({
                    nombre: "Menú offline", descripcion: "Descripción",
                    id_plantilla: 1, visible: 1, imagen: null
                });
                await Menu.actualizar(id, {
                    nombre: "Menú editado", descripcion: "Descripción editada",
                    id_plantilla: 1, visible: 1
                });

                let menu = (await all("SELECT * FROM menu WHERE id_menu = ?", [id]))[0];
                let eventos = await all("SELECT operacion, sync_id, version_base, version_resultado FROM sync_eventos ORDER BY id_evento");
                if (!menu.sync_id || menu.sync_version !== 2) throw new Error("Metadatos de menú incorrectos");
                if (eventos.length !== 2 || eventos[0].operacion !== "INSERT" || eventos[1].operacion !== "UPDATE") {
                    throw new Error("Eventos INSERT/UPDATE incorrectos");
                }
                if (eventos.some(evento => evento.sync_id !== menu.sync_id)) throw new Error("El sync_id de menú no coincide");
                if (eventos[1].version_base !== 1 || eventos[1].version_resultado !== 2) throw new Error("Versionado de UPDATE incorrecto");

                await run("CREATE TRIGGER forzar_fallo_outbox_menu BEFORE INSERT ON sync_eventos WHEN NEW.operacion = 'UPDATE' BEGIN SELECT RAISE(ABORT, 'fallo outbox menu'); END");
                let rollback = false;
                try {
                    await Menu.actualizar(id, {
                        nombre: "No persiste", descripcion: "x",
                        id_plantilla: 1, visible: 0
                    });
                } catch (error) {
                    rollback = /fallo outbox menu/.test(error.message);
                }
                if (!rollback) throw new Error("No se propagó el fallo de outbox del menú");
                await run("DROP TRIGGER forzar_fallo_outbox_menu");
                menu = (await all("SELECT nombre, sync_version FROM menu WHERE id_menu = ?", [id]))[0];
                if (menu.nombre !== "Menú editado" || menu.sync_version !== 2) {
                    throw new Error("El UPDATE del menú no hizo rollback");
                }

                const borrado = await Menu.eliminarSiVacio(id);
                if (!borrado.eliminado || !borrado.pendienteSincronizacion) throw new Error("No se creó tombstone del menú");
                menu = (await all("SELECT visible, sync_deleted_at, sync_version FROM menu WHERE id_menu = ?", [id]))[0];
                if (menu.visible !== 0 || !menu.sync_deleted_at || menu.sync_version !== 3) {
                    throw new Error("Tombstone de menú incorrecto");
                }
                eventos = await all("SELECT operacion, version_resultado FROM sync_eventos ORDER BY id_evento");
                if (eventos.length !== 3 || eventos[2].operacion !== "DELETE" || eventos[2].version_resultado !== 3) {
                    throw new Error("Evento DELETE de menú incorrecto");
                }
                const visibles = await Menu.obtenerMenus();
                if (visibles.some(fila => fila.id_menu === id)) throw new Error("El menú eliminado sigue en el listado");

                await run("INSERT INTO plantilla (nombre, plantilla_json) VALUES (?, ?)", ["Plantilla local", "{}"]);
                const localId = await Menu.crear({
                    nombre: "Menú solo local", id_plantilla: 2, visible: 1
                });
                const local = (await all("SELECT sync_id FROM menu WHERE id_menu = ?", [localId]))[0];
                const total = await all("SELECT COUNT(*) AS cantidad FROM sync_eventos");
                if (local.sync_id !== null || total[0].cantidad !== 3) {
                    throw new Error("Un menú con plantilla no reconciliada generó evento inválido");
                }

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
