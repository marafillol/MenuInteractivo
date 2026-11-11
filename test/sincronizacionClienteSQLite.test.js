const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const proyecto = path.resolve(__dirname, "..");

test("el cliente envía eventos, transfiere multimedia, recibe archivos y persiste el cursor", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-cliente-sync-"));
    const rutaDb = path.join(directorio, "cliente.db");
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-cliente-sync-2026-123456",
        DATABASE_SQLITE_PATH: rutaDb,
        SYNC_REMOTE_URL: "https://servidor-prueba.invalid",
        SYNC_SHARED_SECRET: "secreto-temporal-cliente-sync-2026-123456789"
    };
    const ejecutar = (args) => spawnSync(process.execPath, args, {
        cwd: proyecto, env, encoding: "utf8"
    });

    try {
        const esquema = ejecutar(["scripts/preparar-outbox-fichas-local.js"]);
        assert.equal(esquema.status, 0, esquema.stderr || esquema.stdout);

        const operacion = ejecutar(["-e", `
            const db = require("./src/database");
            const fs = require("node:fs");
            const path = require("node:path");
            const crypto = require("node:crypto");
            const { obtenerIdDispositivo } = require("./src/servicios/sincronizacion/dispositivo");
            const { registrarEvento } = require("./src/servicios/sincronizacion/outbox");
            const cliente = require("./src/servicios/sincronizacion/cliente");
            const all = (sql, values = []) => new Promise((resolve, reject) =>
                db.all(sql, values, (error, rows) => error ? reject(error) : resolve(rows))
            );
            const run = (sql, values = []) => new Promise((resolve, reject) =>
                db.run(sql, values, error => error ? reject(error) : resolve())
            );
            const uuid = n => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
            (async () => {
                await db.preparar();
                const deviceId = await obtenerIdDispositivo();
                await run("INSERT INTO plantilla (nombre, plantilla_json, sync_id) VALUES (?, ?, ?)", [
                    "Plantilla local", "{}", uuid(1)
                ]);
                await run("INSERT INTO menu (nombre, id_plantilla, sync_id) VALUES (?, ?, ?)", [
                    "Menú local", 1, uuid(2)
                ]);
                await run("INSERT INTO ficha (id_menu, titulo, sync_id) VALUES (?, ?, ?)", [
                    1, "Ficha local", uuid(3)
                ]);

                const bytesSalida = Buffer.from("archivo multimedia de salida");
                const checksumSalida = crypto.createHash("sha256").update(bytesSalida).digest("hex");
                const syncMediaSalida = uuid(20);
                const claveSalida = "multimedia/imagen/" + syncMediaSalida + "/v1.png";
                const staging = path.join(process.cwd(), "database", ".sync-pending", syncMediaSalida);
                await fs.promises.mkdir(staging, { recursive: true });
                await fs.promises.writeFile(path.join(staging, "v1.png"), bytesSalida);

                await db.withTransaction(async consultar => {
                    await registrarEvento(consultar, {
                        dispositivoId: deviceId, entidad: "plantilla", operacion: "INSERT",
                        syncId: uuid(10), versionBase: 0, versionResultado: 1,
                        payload: { nombre: "Plantilla enviada", plantilla_json: "{}", activo: 1 }
                    });
                    await registrarEvento(consultar, {
                        dispositivoId: deviceId, entidad: "multimedia", operacion: "INSERT",
                        syncId: syncMediaSalida, versionBase: 0, versionResultado: 1,
                        payload: {
                            ficha_sync_id: uuid(3), descripcion: "Salida",
                            tipo_multi: "imagen", miniatura: "🖼️", activo: 1,
                            checksum_sha256: checksumSalida, mime_type: "image/png",
                            tamano_bytes: bytesSalida.length, storage_key: claveSalida
                        }
                    });
                });

                const bytesEntrada = Buffer.from("archivo multimedia de entrada");
                const checksumEntrada = crypto.createHash("sha256").update(bytesEntrada).digest("hex");
                const syncMediaEntrada = uuid(30);
                const claveEntrada = "multimedia/imagen/" + syncMediaEntrada + "/v1.png";
                const llamadas = [];
                let solicitud;

                global.fetch = async (url, opciones = {}) => {
                    if (url.endsWith("/media/upload")) {
                        const archivo = opciones.body.get("file");
                        const contenido = Buffer.from(await archivo.arrayBuffer());
                        llamadas.push({
                            tipo: "upload",
                            clave: opciones.body.get("storage_key"),
                            checksum: opciones.body.get("checksum_sha256"),
                            contenido
                        });
                        return { ok: true, status: 200, async json() { return { public_url: "https://storage.invalid/file" }; } };
                    }
                    if (url.startsWith("https://servidor-prueba.invalid/api/sync/v1/media/download")) {
                        llamadas.push({ tipo: "download", url });
                        return { ok: true, status: 200, async arrayBuffer() {
                            return bytesEntrada.buffer.slice(bytesEntrada.byteOffset, bytesEntrada.byteOffset + bytesEntrada.byteLength);
                        }};
                    }
                    solicitud = { url, opciones, cuerpo: JSON.parse(opciones.body) };
                    return {
                        ok: true,
                        status: 200,
                        async json() {
                            return {
                                device_id: uuid(999),
                                acknowledged: solicitud.cuerpo.events.map(evento => evento.evento_id),
                                rejected: [{
                                    evento_id: solicitud.cuerpo.events[0].evento_id,
                                    estado: "conflicto",
                                    conflicto_id: uuid(990),
                                    motivo: "Conflicto de versión de prueba"
                                }],
                                events: [
                                    {
                                        id_evento: 7, evento_id: uuid(701), origen_device_id: uuid(999),
                                        entidad: "plantilla", operacion: "INSERT", sync_id: uuid(702),
                                        version_base: 0, version_resultado: 1,
                                        payload_json: { nombre: "Plantilla recibida", descripcion: null, plantilla_json: "{}", activo: 1 }
                                    },
                                    {
                                        id_evento: 8, evento_id: uuid(703), origen_device_id: uuid(999),
                                        entidad: "multimedia", operacion: "INSERT", sync_id: syncMediaEntrada,
                                        version_base: 0, version_resultado: 1,
                                        payload_json: {
                                            ficha_sync_id: uuid(3), descripcion: "Entrada",
                                            tipo_multi: "imagen", miniatura: "🖼️", activo: 1,
                                            checksum_sha256: checksumEntrada, mime_type: "image/png",
                                            tamano_bytes: bytesEntrada.length, storage_key: claveEntrada,
                                            ruta_archivo: "https://storage.invalid/original.png"
                                        }
                                    }
                                ],
                                next_cursor: 8
                            };
                        }
                    };
                };

                const resultado = await cliente.sincronizarUnaVez();
                if (resultado.enviados !== 2 || resultado.recibidos !== 2 || resultado.conflictos !== 1 || resultado.cursor !== 8) {
                    throw new Error("Resumen del intercambio incorrecto");
                }
                const subida = llamadas.find(item => item.tipo === "upload");
                const descarga = llamadas.find(item => item.tipo === "download");
                if (!subida || subida.clave !== claveSalida || !subida.contenido.equals(bytesSalida)) {
                    throw new Error("No se transfirió el archivo local a Storage");
                }
                if (!descarga) throw new Error("No se descargó el archivo remoto");
                const salida = await all("SELECT aplicado FROM sync_eventos WHERE entidad = 'multimedia' AND sync_id = ?", [syncMediaSalida]);
                const entrada = await all("SELECT * FROM multimedia WHERE sync_id = ?", [syncMediaEntrada]);
                const plantilla = await all("SELECT nombre FROM plantilla WHERE sync_id = ?", [uuid(702)]);
                const cursor = await all("SELECT valor FROM configuracion WHERE clave = 'sync.cursor.supabase'");
                const conflictos = await all("SELECT entidad, sync_id, resuelto, version_remota_json FROM sync_conflictos");
                if (salida[0].aplicado !== 1 || entrada[0].checksum_sha256 !== checksumEntrada ||
                    plantilla[0].nombre !== "Plantilla recibida" || cursor[0].valor !== "8" ||
                    conflictos.length !== 1 || conflictos[0].entidad !== "plantilla" ||
                    conflictos[0].resuelto !== 0 ||
                    !conflictos[0].version_remota_json.includes("Conflicto de versión de prueba")) {
                    throw new Error("El cliente no persistió el intercambio completo");
                }
                const rutaEntrada = path.resolve(process.cwd(), entrada[0].ruta_archivo);
                if (!fs.readFileSync(rutaEntrada).equals(bytesEntrada)) {
                    throw new Error("El archivo recibido no coincide con su checksum");
                }
                await fs.promises.unlink(rutaEntrada);

                process.stdout.write(JSON.stringify({ enviados: resultado.enviados, recibidos: resultado.recibidos }) + "\\\\n");
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `]);
        assert.equal(operacion.status, 0, operacion.stderr || operacion.stdout);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }
});
