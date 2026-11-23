const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const proyecto = path.resolve(__dirname, "..");

test("las relaciones entre fichas generan INSERT y tombstone DELETE por UUID", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-relacion-ficha-sync-"));
    const rutaDb = path.join(directorio, "relaciones.db");
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-relaciones-sync-2026",
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
            const RelacionFicha = require("./src/modelos/relacionFichaModelo");
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
                    1, "Origen", "33333333-3333-4333-8333-333333333333"
                ]);
                await run("INSERT INTO ficha (id_menu, titulo, sync_id) VALUES (?, ?, ?)", [
                    1, "Destino", "44444444-4444-4444-8444-444444444444"
                ]);
                await run("INSERT INTO ficha (id_menu, titulo) VALUES (?, ?)", [1, "Histórica"]);

                await RelacionFicha.guardarRelaciones(1, [
                    { id_ficha_destino: 2, tipo_relacion: "relacionada" }
                ]);
                let filas = await all("SELECT * FROM relacion_ficha WHERE id_ficha_origen = 1");
                if (filas.length !== 1 || !filas[0].sync_id || filas[0].sync_version !== 1) {
                    throw new Error("No se creó identidad de relación");
                }
                let eventos = await all("SELECT operacion, payload_json FROM sync_eventos WHERE entidad = 'relacion_ficha'");
                if (eventos.length !== 1 || eventos[0].operacion !== "INSERT") {
                    throw new Error("No se registró INSERT de relación");
                }
                const payload = JSON.parse(eventos[0].payload_json);
                if (payload.ficha_origen_sync_id !== "33333333-3333-4333-8333-333333333333" ||
                    payload.ficha_destino_sync_id !== "44444444-4444-4444-8444-444444444444") {
                    throw new Error("La relación no usa UUID de fichas");
                }

                const idRelacion = filas[0].id_relacion;
                await RelacionFicha.eliminarRelacion(idRelacion);
                filas = await all("SELECT sync_deleted_at, sync_version FROM relacion_ficha WHERE id_relacion = ?", [idRelacion]);
                if (!filas[0].sync_deleted_at || filas[0].sync_version !== 2) {
                    throw new Error("La baja no generó tombstone");
                }
                eventos = await all("SELECT operacion, version_resultado FROM sync_eventos WHERE entidad = 'relacion_ficha' ORDER BY id_evento");
                if (eventos.length !== 2 || eventos[1].operacion !== "DELETE" || eventos[1].version_resultado !== 2) {
                    throw new Error("No se registró DELETE de relación");
                }
                if ((await RelacionFicha.obtenerRelaciones(1)).length !== 0) {
                    throw new Error("La relación eliminada sigue visible");
                }

                await RelacionFicha.guardarRelaciones(1, [
                    { id_ficha_destino: 3, tipo_relacion: "histórica" }
                ]);
                const historica = (await all("SELECT sync_id FROM relacion_ficha WHERE id_ficha_destino = 3"))[0];
                if (historica.sync_id !== null) throw new Error("Se inventó identidad para una ficha histórica");
                const cantidad = await all("SELECT COUNT(*) AS cantidad FROM sync_eventos WHERE entidad = 'relacion_ficha'");
                if (cantidad[0].cantidad !== 2) throw new Error("Se emitió evento con referencia no reconciliada");

                process.stdout.write("relaciones sincronizadas\\n");
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `]);
        assert.equal(operacion.status, 0, operacion.stderr || operacion.stdout);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }
});
