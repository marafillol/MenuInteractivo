const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const proyecto = path.resolve(__dirname, "..");

test("el cliente sube y descarga portadas verificando su SHA-256", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-portada-cliente-"));
    const rutaDb = path.join(directorio, "cliente.db");
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-portada-cliente-2026",
        DATABASE_SQLITE_PATH: rutaDb
    };
    try {
        const operacion = spawnSync(process.execPath, ["-e", `
            const fs = require("node:fs");
            const path = require("node:path");
            const crypto = require("node:crypto");
            const db = require("./src/database");
            const cliente = require("./src/servicios/sincronizacion/cliente");
            const contenido = Buffer.from("portada transferida y verificada");
            const checksum = crypto.createHash("sha256").update(contenido).digest("hex");
            const assetId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
            const storageKey = "multimedia/covers/menu/" + assetId + ".png";
            const raizStaging = path.join(process.cwd(), "database", ".sync-pending-covers");
            const rutaStaging = path.join(raizStaging, assetId + ".png");
            const evento = {
                evento_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                entidad: "menu",
                operacion: "INSERT",
                sync_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                version_resultado: 1,
                payload_json: {
                    imagen_storage_key: storageKey,
                    imagen_checksum_sha256: checksum,
                    imagen_mime_type: "image/png",
                    imagen_tamano_bytes: contenido.length
                }
            };
            (async () => {
                fs.mkdirSync(raizStaging, { recursive: true });
                fs.writeFileSync(rutaStaging, contenido);
                let subido = false;
                global.fetch = async (url, opciones = {}) => {
                    if (String(url).endsWith("/media/upload")) {
                        const archivo = opciones.body.get("file");
                        const bytes = Buffer.from(await archivo.arrayBuffer());
                        if (!bytes.equals(contenido)) throw new Error("Los bytes subidos no coinciden");
                        if (opciones.body.get("storage_key") !== storageKey) throw new Error("Storage key incorrecta");
                        subido = true;
                        return { ok: true };
                    }
                    if (String(url).includes("/media/download")) {
                        return new Response(contenido, { status: 200 });
                    }
                    throw new Error("Endpoint inesperado: " + url);
                };

                await cliente.subirMultimediaPendiente(evento, "https://sync.example/api/sync/v1/exchange", "secreto");
                if (!subido) throw new Error("No se subió la portada");
                const archivosNuevos = [];
                const entrante = await cliente.prepararMultimediaEntrante(
                    evento, "https://sync.example/api/sync/v1/exchange", "secreto", archivosNuevos
                );
                const rutaLocal = path.resolve(process.cwd(), entrante.payload_json.imagen);
                if (!fs.readFileSync(rutaLocal).equals(contenido)) throw new Error("La portada descargada no coincide");
                if (archivosNuevos.length !== 1) throw new Error("No se registró el archivo nuevo para rollback");

                await cliente.limpiarStagingConfirmado([evento], [evento.evento_id]);
                if (fs.existsSync(rutaStaging)) throw new Error("No se limpió el staging confirmado");
                await fs.promises.unlink(rutaLocal);
                try { await fs.promises.rmdir(path.dirname(rutaLocal)); } catch {}
                try { await fs.promises.rmdir(raizStaging); } catch {}
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `], { cwd: proyecto, env, encoding: "utf8" });
        assert.equal(operacion.status, 0, operacion.stderr || operacion.stdout);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
        const stage = path.join(proyecto, "database", ".sync-pending-covers", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png");
        const portada = path.join(proyecto, "imagenes", "menus", "portada-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png");
        for (const ruta of [stage, portada]) {
            try { fs.unlinkSync(ruta); } catch {}
        }
        for (const carpeta of [path.dirname(stage), path.dirname(portada)]) {
            try { fs.rmdirSync(carpeta); } catch {}
        }
    }
});
