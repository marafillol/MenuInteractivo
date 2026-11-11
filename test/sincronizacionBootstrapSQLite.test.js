const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sqlite3 = require("sqlite3");

const proyecto = path.resolve(__dirname, "..");
const uuid = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");

test("bootstrap importa una instantánea completa en SQLite vacía y bloquea el intercambio prematuro", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-bootstrap-sync-"));
    const rutaDb = path.join(directorio, "offline.db");
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-bootstrap-2026-123456789",
        DATABASE_SQLITE_PATH: rutaDb,
        SYNC_REMOTE_URL: "https://servidor-prueba.invalid",
        SYNC_SHARED_SECRET: "secreto-temporal-bootstrap-2026-123456789012345",
        SYNC_ALLOW_SCHEMA_MIGRATION: "true",
        SYNC_SCHEMA_CONFIRMATION: "I_HAVE_A_BACKUP_AND_APPROVE"
    };
    const ejecutar = (args) => spawnSync(process.execPath, args, {
        cwd: proyecto, env, encoding: "utf8"
    });

    try {
        const crearArchivo = new sqlite3.Database(rutaDb);
        crearArchivo.close();
        const esquema = ejecutar(["scripts/preparar-esquema-sincronizacion.js"]);
        assert.equal(esquema.status, 0, esquema.stderr || esquema.stdout);

        const snapshot = {
            version: 1,
            cursor: 42,
            generado_en: "2026-11-11T12:00:00.000Z",
            data: {
                plantilla: [{
                    id_plantilla: 1, nombre: "Plantilla", descripcion: null,
                    plantilla_json: { campos: [] }, activo: 1, creado: null,
                    actualizado: null, sync_id: uuid(1), sync_version: 1, sync_deleted_at: null
                }],
                menu: [{
                    id_menu: 1, nombre: "Menú", descripcion: null, imagen: null,
                    id_plantilla: 1, visible: 1, creado: null, actualizado: null,
                    sync_id: uuid(2), sync_version: 1, sync_deleted_at: null,
                    imagen_storage_key: null, imagen_checksum_sha256: null,
                    imagen_mime_type: null, imagen_tamano_bytes: null
                }],
                ficha: [
                    {
                        id_ficha: 1, id_menu: 1, titulo: "Ficha A", resumen: null,
                        texto: "Contenido A", imagen: null, datos_json: { a: 1 },
                        visible: 1, id_usuario: 77, creado: null, actualizado: null,
                        sync_id: uuid(3), sync_version: 2, sync_deleted_at: null,
                        imagen_storage_key: null, imagen_checksum_sha256: null,
                        imagen_mime_type: null, imagen_tamano_bytes: null
                    },
                    {
                        id_ficha: 2, id_menu: 1, titulo: "Ficha B", resumen: null,
                        texto: null, imagen: null, datos_json: null,
                        visible: 1, id_usuario: null, creado: null, actualizado: null,
                        sync_id: uuid(4), sync_version: 1, sync_deleted_at: null,
                        imagen_storage_key: null, imagen_checksum_sha256: null,
                        imagen_mime_type: null, imagen_tamano_bytes: null
                    }
                ],
                etiqueta: [{
                    id_etiqueta: 1, nombre: "Historia", descripcion: null,
                    activo: 1, sync_id: uuid(5), sync_version: 1, sync_deleted_at: null
                }],
                ficha_etiqueta: [{
                    id_ficha: 1, id_etiqueta: 1, creado: null,
                    sync_id: uuid(6), sync_version: 1, sync_deleted_at: null
                }],
                relacion_ficha: [{
                    id_relacion: 1, id_ficha_origen: 1, id_ficha_destino: 2,
                    tipo_relacion: "relacionada", sync_id: uuid(7),
                    sync_version: 1, sync_deleted_at: null
                }],
                multimedia: [{
                    id_multi: 1, id_ficha: 1, descripcion: "Imagen", ruta_archivo: "imagenes/multimedia/imagen/prueba.png",
                    tipo_multi: "imagen", miniatura: "🖼️", activo: 1, creado: null,
                    actualizado: null, sync_id: uuid(8), sync_version: 1, sync_deleted_at: null,
                    checksum_sha256: "a".repeat(64), mime_type: "image/png",
                    tamano_bytes: 12, storage_key: "multimedia/imagen/" + uuid(8) + "/v1.png",
                    sync_previous_path: null
                }]
            }
        };

        const operacion = ejecutar(["-e", `
            const db = require("./src/database");
            const { aplicarSnapshot, validarSnapshot } = require("./src/servicios/sincronizacion/bootstrap");
            const cliente = require("./src/servicios/sincronizacion/cliente");
            const all = (sql, values = []) => new Promise((resolve, reject) =>
                db.all(sql, values, (error, rows) => error ? reject(error) : resolve(rows))
            );
            const run = (sql, values = []) => new Promise((resolve, reject) =>
                db.run(sql, values, error => error ? reject(error) : resolve())
            );
            const snapshot = ${JSON.stringify(snapshot)};
            (async () => {
                await db.preparar();
                await run("INSERT INTO configuracion (clave, valor) VALUES (?, ?)", ["preferencia_local", "conservar"]);
                let llamadasRed = 0;
                global.fetch = async () => { llamadasRed++; throw new Error("No debe llamar a la red antes del bootstrap"); };
                const bloqueado = await cliente.sincronizarUnaVez();
                if (bloqueado.estado !== "inicializacion_pendiente" || llamadasRed !== 0) {
                    throw new Error("El cliente intentó sincronizar antes de inicializar");
                }

                validarSnapshot(snapshot);
                const resultado = await aplicarSnapshot(db, snapshot);
                if (resultado.estado !== "inicializado" || resultado.cursor !== 42) {
                    throw new Error("El resultado del bootstrap es incorrecto");
                }
                const relaciones = await all("SELECT f.titulo, e.nombre FROM ficha_etiqueta fe JOIN ficha f ON f.id_ficha = fe.id_ficha JOIN etiqueta e ON e.id_etiqueta = fe.id_etiqueta");
                const vinculadas = await all("SELECT id_ficha_origen, id_ficha_destino FROM relacion_ficha");
                const ficha = await all("SELECT datos_json, id_usuario, sync_version FROM ficha WHERE id_ficha = 1");
                const estado = await all("SELECT valor FROM configuracion WHERE clave = 'sync.bootstrap.estado'");
                const cursor = await all("SELECT valor FROM configuracion WHERE clave = 'sync.cursor.supabase'");
                const preferencia = await all("SELECT valor FROM configuracion WHERE clave = 'preferencia_local'");
                if (relaciones.length !== 1 || relaciones[0].titulo !== "Ficha A" || relaciones[0].nombre !== "Historia") {
                    throw new Error("No se importaron correctamente las relaciones ficha-etiqueta");
                }
                if (vinculadas.length !== 1 || vinculadas[0].id_ficha_destino !== 2) {
                    throw new Error("No se importó la relación entre fichas");
                }
                if (ficha[0].datos_json !== '{"a":1}' || ficha[0].id_usuario !== null || ficha[0].sync_version !== 2) {
                    throw new Error("No se conservaron JSON/versiones o se replicó un ID de usuario");
                }
                if (estado[0].valor !== "completo" || cursor[0].valor !== "42" || preferencia[0].valor !== "conservar") {
                    throw new Error("No se guardó el cursor/estado o se alteró la configuración local");
                }
                await assert.rejects(aplicarSnapshot(db, snapshot), error => error.code === "BASE_LOCAL_NO_VACIA");
                const conteo = await all("SELECT COUNT(*) AS cantidad FROM ficha");
                if (conteo[0].cantidad !== 2) throw new Error("Un segundo bootstrap alteró los registros ya importados");
                process.stdout.write("bootstrap validado\\n");
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `]);
        assert.equal(operacion.status, 0, operacion.stderr || operacion.stdout);
        assert.match(operacion.stdout, /bootstrap validado/);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }
});

test("bootstrap rechaza registros sin identidad compartida y multimedia sin checksum", () => {
    const { validarSnapshot } = require("../src/servicios/sincronizacion/bootstrap");
    const base = {
        version: 1,
        cursor: 0,
        data: {
            plantilla: [{ id_plantilla: 1, sync_id: uuid(1), sync_version: 1 }],
            menu: [{ id_menu: 1, id_plantilla: 1, imagen: null, sync_id: uuid(2), sync_version: 1 }],
            ficha: [{ id_ficha: 1, id_menu: 1, imagen: null, sync_id: uuid(3), sync_version: 1 }],
            etiqueta: [{ id_etiqueta: 1, sync_id: uuid(4), sync_version: 1 }],
            ficha_etiqueta: [],
            relacion_ficha: [],
            multimedia: []
        }
    };
    const sinIdentidad = structuredClone(base);
    sinIdentidad.data.ficha[0].sync_id = null;
    assert.throws(() => validarSnapshot(sinIdentidad), error => error.code === "SNAPSHOT_INCOMPLETO");

    const sinChecksum = structuredClone(base);
    sinChecksum.data.multimedia.push({
        id_multi: 1, id_ficha: 1, sync_id: uuid(5), sync_version: 1,
        sync_deleted_at: null, storage_key: "multimedia/imagen/" + uuid(5) + "/v1.png",
        checksum_sha256: null
    });
    assert.throws(() => validarSnapshot(sinChecksum), error => error.code === "SNAPSHOT_MULTIMEDIA_INCOMPLETO");
});
