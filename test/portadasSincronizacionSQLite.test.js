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
            const { prepararPortada } = require("./src/servicios/sincronizacion/portadas");
            (async () => {
                await db.preparar();
                const portada = await prepararPortada({
                    path: process.env.TEST_PORTADA,
                    originalname: "portada.png",
                    mimetype: "image/png"
                }, "menu");
                const nombre = path.basename(portada.imagen_storage_key);
                const assetId = path.parse(nombre).name;
                const staging = path.join(process.cwd(), "database", ".sync-pending-covers", nombre);
                const bytes = fs.readFileSync(staging);
                if (crypto.createHash("sha256").update(bytes).digest("hex") !== portada.imagen_checksum_sha256) {
                    throw new Error("El staging no coincide con el checksum");
                }
                if (portada.imagen_tamano_bytes !== bytes.length || portada.imagen_mime_type !== "image/png") {
                    throw new Error("Los metadatos de portada no coinciden");
                }
                fs.unlinkSync(staging);
                try { fs.rmdirSync(path.dirname(staging)); } catch {}
                process.stdout.write(JSON.stringify({ assetId, storage_key: portada.imagen_storage_key }));
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
