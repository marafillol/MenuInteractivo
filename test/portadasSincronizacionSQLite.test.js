const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const proyecto = path.resolve(__dirname, "..");

test("prepara una portada local con storage_key, checksum y staging inmutable", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-portada-sync-"));
    const rutaDb = path.join(directorio, "prueba.db");
    const rutaImagen = path.join(directorio, "portada.png");
    const contenido = Buffer.from("imagen de portada de prueba");
    fs.writeFileSync(rutaImagen, contenido);
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-portada-sync-2026-123",
        DATABASE_SQLITE_PATH: rutaDb
    };
    try {
        const esquema = spawnSync(process.execPath, ["scripts/preparar-outbox-fichas-local.js"], {
            cwd: proyecto, env, encoding: "utf8"
        });
        assert.equal(esquema.status, 0, esquema.stderr || esquema.stdout);

        const operacion = spawnSync(process.execPath, ["-e", `
            const fs = require("node:fs");
            const path = require("node:path");
            const crypto = require("node:crypto");
            const db = require("./src/database");
            const Menu = require("./src/modelos/menu");
            const Ficha = require("./src/modelos/ficha");
            const { prepararPortada } = require("./src/servicios/sincronizacion/portadas");
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
                const preparar = entidad => prepararPortada({
                    path: process.env.TEST_PORTADA,
                    originalname: "portada.png",
                    mimetype: "image/png"
                }, entidad);
                const portadaMenu = await preparar("menu");
                const bytes = fs.readFileSync(path.join(process.cwd(), "database", ".sync-pending-covers",
                    path.basename(portadaMenu.imagen_storage_key)));
                if (crypto.createHash("sha256").update(bytes).digest("hex") !== portadaMenu.imagen_checksum_sha256) {
                    throw new Error("El staging no coincide con el checksum");
                }
                if (portadaMenu.imagen_tamano_bytes !== bytes.length || portadaMenu.imagen_mime_type !== "image/png") {
                    throw new Error("Los metadatos de portada no coinciden");
                }

                const idMenu = await Menu.crear({
                    nombre: "Menú con portada", descripcion: null, id_plantilla: 1, visible: 1,
                    ...portadaMenu
                });
                const portadaFicha = await preparar("ficha");
                const idFicha = await Ficha.crear({
                    id_menu: idMenu, titulo: "Ficha con portada", resumen: null, texto: "Texto",
                    datos_json: "{}", visible: 1, ...portadaFicha
                });

                const portadaMenuActualizada = await preparar("menu");
                await Menu.actualizar(idMenu, {
                    nombre: "Menú actualizado", descripcion: null, id_plantilla: 1, visible: 1,
                    ...portadaMenuActualizada
                });
                const portadaFichaActualizada = await preparar("ficha");
                await Ficha.actualizar(idFicha, {
                    id_menu: idMenu, titulo: "Ficha actualizada", resumen: null, texto: "Texto nuevo",
                    datos_json: "{}", visible: 1, ...portadaFichaActualizada
                });

                const filasMenu = await all("SELECT imagen_storage_key, imagen_checksum_sha256, imagen_tamano_bytes, sync_version FROM menu WHERE id_menu = ?", [idMenu]);
                const filasFicha = await all("SELECT imagen_storage_key, imagen_checksum_sha256, imagen_tamano_bytes, sync_version FROM ficha WHERE id_ficha = ?", [idFicha]);
                if (!filasMenu[0].imagen_storage_key || filasMenu[0].sync_version !== 2) {
                    throw new Error("No se guardó/actualizó la portada de menú");
                }
                if (!filasFicha[0].imagen_storage_key || filasFicha[0].sync_version !== 2) {
                    throw new Error("No se guardó/actualizó la portada de ficha");
                }
                const eventos = await all("SELECT entidad, operacion, payload_json FROM sync_eventos WHERE entidad IN ('menu', 'ficha') ORDER BY id_evento");
                if (eventos.length !== 4 || eventos.some(evento => !JSON.parse(evento.payload_json).imagen_storage_key)) {
                    throw new Error("Los eventos no incluyeron metadatos de portada");
                }

                for (const portada of [portadaMenu, portadaFicha, portadaMenuActualizada, portadaFichaActualizada]) {
                    const ruta = path.join(process.cwd(), "database", ".sync-pending-covers",
                        path.basename(portada.imagen_storage_key));
                    try { fs.unlinkSync(ruta); } catch {}
                }
                try { fs.rmdirSync(path.join(process.cwd(), "database", ".sync-pending-covers")); } catch {}
                process.stdout.write(JSON.stringify({ idMenu, idFicha, eventos: eventos.length }));
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `], {
            cwd: proyecto,
            env: { ...env, TEST_PORTADA: rutaImagen },
            encoding: "utf8"
        });
        assert.equal(operacion.status, 0, operacion.stderr || operacion.stdout);
        assert.match(operacion.stdout, /multimedia\\/covers\\/menu\\//);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }
});
