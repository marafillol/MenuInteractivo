const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const proyecto = path.resolve(__dirname, "..");

test("reemplazar etiquetas genera eventos versionados y transaccionales para relaciones", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-relacion-outbox-"));
    const rutaDb = path.join(directorio, "prueba.db");
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-integracion-relacion-2026",
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
            const FichaEtiqueta = require("./src/modelos/fichaEtiquetaModelo");
            const run = (sql, values = []) => new Promise((resolve, reject) =>
                db.run(sql, values, error => error ? reject(error) : resolve())
            );
            const all = (sql, values = []) => new Promise((resolve, reject) =>
                db.all(sql, values, (error, rows) => error ? reject(error) : resolve(rows))
            );
            (async () => {
                await db.preparar();
                await run("INSERT INTO plantilla (nombre, plantilla_json, sync_id) VALUES (?, ?, ?)", [
                    "Plantilla", "{}", "33333333-3333-4333-8333-333333333333"
                ]);
                await run("INSERT INTO menu (nombre, id_plantilla, sync_id) VALUES (?, ?, ?)", [
                    "Menú", 1, "44444444-4444-4444-8444-444444444444"
                ]);
                await run("INSERT INTO ficha (id_menu, titulo, sync_id) VALUES (?, ?, ?)", [
                    1, "Ficha", "55555555-5555-4555-8555-555555555555"
                ]);

                const tag1 = await Etiqueta.crear({ nombre: "Historia", descripcion: null, activo: 1 });
                const tag2 = await Etiqueta.crear({ nombre: "Geografía", descripcion: null, activo: 1 });
                await FichaEtiqueta.reemplazar(1, [tag1.id_etiqueta, tag2.id_etiqueta]);

                let relaciones = await all("SELECT * FROM ficha_etiqueta WHERE id_ficha = 1 ORDER BY id_etiqueta");
                if (relaciones.length !== 2 || relaciones.some(relacion => !relacion.sync_id)) {
                    throw new Error("No se generaron identidades para las relaciones nuevas");
                }
                let eventos = await all("SELECT operacion, entidad, sync_id, version_base, version_resultado FROM sync_eventos WHERE entidad = 'ficha_etiqueta' ORDER BY id_evento");
                if (eventos.length !== 2 || eventos.some(evento => evento.operacion !== "INSERT" || evento.version_resultado !== 1)) {
                    throw new Error("Eventos INSERT de relaciones incorrectos");
                }

                await FichaEtiqueta.reemplazar(1, [tag1.id_etiqueta]);
                let eliminada = (await all("SELECT sync_deleted_at, sync_version FROM ficha_etiqueta WHERE id_ficha = 1 AND id_etiqueta = ?", [tag2.id_etiqueta]))[0];
                if (!eliminada.sync_deleted_at || eliminada.sync_version !== 2) throw new Error("No se creó tombstone de relación");
                eventos = await all("SELECT operacion, version_resultado FROM sync_eventos WHERE entidad = 'ficha_etiqueta' ORDER BY id_evento");
                if (eventos.length !== 3 || eventos[2].operacion !== "DELETE" || eventos[2].version_resultado !== 2) {
                    throw new Error("Evento DELETE de relación incorrecto");
                }

                await FichaEtiqueta.reemplazar(1, [tag1.id_etiqueta, tag2.id_etiqueta]);
                eliminada = (await all("SELECT sync_deleted_at, sync_version FROM ficha_etiqueta WHERE id_ficha = 1 AND id_etiqueta = ?", [tag2.id_etiqueta]))[0];
                if (eliminada.sync_deleted_at !== null || eliminada.sync_version !== 3) throw new Error("No se reactivó correctamente la relación");
                eventos = await all("SELECT operacion, version_resultado FROM sync_eventos WHERE entidad = 'ficha_etiqueta' ORDER BY id_evento");
                if (eventos.length !== 4 || eventos[3].operacion !== "UPDATE" || eventos[3].version_resultado !== 3) {
                    throw new Error("Evento UPDATE de reactivación incorrecto");
                }

                const tag3 = await Etiqueta.crear({ nombre: "Política", descripcion: null, activo: 1 });
                const cantidadAntes = eventos.length;
                await run("CREATE TRIGGER forzar_fallo_outbox_relacion BEFORE INSERT ON sync_eventos WHEN NEW.entidad = 'ficha_etiqueta' AND NEW.operacion = 'INSERT' BEGIN SELECT RAISE(ABORT, 'fallo outbox relacion'); END");
                let rollback = false;
                try {
                    await FichaEtiqueta.reemplazar(1, [tag1.id_etiqueta, tag2.id_etiqueta, tag3.id_etiqueta]);
                } catch (error) {
                    rollback = /fallo outbox relacion/.test(error.message);
                }
                if (!rollback) throw new Error("No se propagó el fallo de outbox de relación");
                await run("DROP TRIGGER forzar_fallo_outbox_relacion");
                const nueva = await all("SELECT * FROM ficha_etiqueta WHERE id_ficha = 1 AND id_etiqueta = ?", [tag3.id_etiqueta]);
                const cantidadDespues = await all("SELECT COUNT(*) AS cantidad FROM sync_eventos WHERE entidad = 'ficha_etiqueta'");
                if (nueva.length || cantidadDespues[0].cantidad !== cantidadAntes) {
                    throw new Error("El rollback no revirtió la relación y su evento");
                }

                const visibles = await FichaEtiqueta.obtenerPorFicha(1);
                if (visibles.length !== 2) throw new Error("La consulta incluyó una relación eliminada o excluyó una activa");

                process.stdout.write(JSON.stringify({ eventos, visibles: visibles.length }) + "\\n");
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `]);
        assert.equal(operacion.status, 0, operacion.stderr || operacion.stdout);
        assert.match(operacion.stdout, /"operacion":"INSERT"/);
        assert.match(operacion.stdout, /"operacion":"DELETE"/);
        assert.match(operacion.stdout, /"operacion":"UPDATE"/);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }
});
