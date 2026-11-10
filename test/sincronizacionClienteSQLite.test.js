const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const proyecto = path.resolve(__dirname, "..");

test("el cliente envía la outbox, aplica eventos entrantes y persiste el cursor", () => {
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
            const assert = require("node:assert/strict");
            const db = require("./src/database");
            const { obtenerIdDispositivo } = require("./src/servicios/sincronizacion/dispositivo");
            const { registrarEvento } = require("./src/servicios/sincronizacion/outbox");
            const cliente = require("./src/servicios/sincronizacion/cliente");
            const all = (sql, values = []) => new Promise((resolve, reject) =>
                db.all(sql, values, (error, rows) => error ? reject(error) : resolve(rows))
            );
            const uuid = n => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
            (async () => {
                await db.preparar();
                const deviceId = await obtenerIdDispositivo();
                await db.withTransaction(consultar => registrarEvento(consultar, {
                    dispositivoId: deviceId, entidad: "plantilla", operacion: "INSERT",
                    syncId: uuid(10), versionBase: 0, versionResultado: 1,
                    payload: { nombre: "Plantilla enviada", plantilla_json: "{}", activo: 1 }
                }));

                let solicitud;
                global.fetch = async (url, opciones) => {
                    solicitud = { url, opciones, cuerpo: JSON.parse(opciones.body) };
                    return {
                        ok: true,
                        status: 200,
                        async json() {
                            return {
                                device_id: uuid(999),
                                acknowledged: solicitud.cuerpo.events.map(evento => evento.evento_id),
                                rejected: [],
                                events: [{
                                    id_evento: 7,
                                    evento_id: uuid(701),
                                    origen_device_id: uuid(999),
                                    entidad: "plantilla",
                                    operacion: "INSERT",
                                    sync_id: uuid(702),
                                    version_base: 0,
                                    version_resultado: 1,
                                    payload_json: {
                                        nombre: "Plantilla recibida",
                                        descripcion: null,
                                        plantilla_json: "{}",
                                        activo: 1
                                    }
                                }],
                                next_cursor: 7
                            };
                        }
                    };
                };

                const resultado = await cliente.sincronizarUnaVez();
                assert.equal(solicitud.url, "https://servidor-prueba.invalid/api/sync/v1/exchange");
                assert.equal(solicitud.cuerpo.device_id, deviceId);
                assert.equal(solicitud.cuerpo.events.length, 1);
                assert.deepEqual(resultado, {
                    estado: "sincronizado", enviados: 1, recibidos: 1,
                    conflictos: 0, cursor: 7
                });

                const salida = await all("SELECT aplicado FROM sync_eventos WHERE evento_id = ?", [
                    solicitud.cuerpo.events[0].evento_id
                ]);
                const entrada = await all("SELECT aplicado FROM sync_eventos WHERE evento_id = ?", [uuid(701)]);
                const plantilla = await all("SELECT nombre, sync_version FROM plantilla WHERE sync_id = ?", [uuid(702)]);
                const cursor = await all("SELECT valor FROM configuracion WHERE clave = 'sync.cursor.supabase'");
                if (salida[0].aplicado !== 1 || entrada[0].aplicado !== 1 ||
                    plantilla[0].nombre !== "Plantilla recibida" || plantilla[0].sync_version !== 1 ||
                    cursor[0].valor !== "7") {
                    throw new Error("El cliente no persistió el intercambio completo");
                }

                process.stdout.write(JSON.stringify(resultado) + "\\n");
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `]);
        assert.equal(operacion.status, 0, operacion.stderr || operacion.stdout);
        assert.match(operacion.stdout, /"recibidos":1/);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }
});
