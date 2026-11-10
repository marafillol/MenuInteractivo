// =======================================================
// MODELO MULTIMEDIA
// =======================================================
//
// Este modelo administra la información relacionada con
// los archivos multimedia asociados a las fichas.
//
// Relación:
//
//          ficha
//            |
//            |
//       multimedia
//
// Una ficha puede tener múltiples archivos multimedia.
//
// Responsabilidades:
// - Obtener todos los archivos multimedia.
// - Crear registros multimedia.
// - Actualizar multimedia existente.
// - Eliminar multimedia.
// - Buscar multimedia por ficha.
// - Buscar multimedia por identificador.
//
// No maneja:
// - Peticiones HTTP.
// - Respuestas al cliente.
// - Carga de archivos.
// - Manejo físico de carpetas.
//
// La comunicación con la base de datos se realiza
// mediante SQLite.
//

const db = require("../database");
const { estaPreparado } = require("../servicios/sincronizacion/esquema");
const { randomUUID, createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { esModoLocal } = require("../config/modoServidor");
const { registrarEvento } = require("../servicios/sincronizacion/outbox");
const { obtenerIdDispositivo } = require("../servicios/sincronizacion/dispositivo");

function consultarPromesa(sql, valores = []) {
    return new Promise((resolve, reject) => db.all(sql, valores, (error, filas) =>
        error ? reject(error) : resolve(filas)
    ));
}

async function outboxMultimediaDisponible() {
    if (!await estaPreparado(["multimedia", "ficha"])) return false;
    try {
        const columnas = await estaPreparado(["multimedia"]);
        const { columnasDe } = require("../servicios/sincronizacion/esquema");
        const filas = await columnasDe("multimedia");
        const nombres = new Set(filas.map((columna) => columna.name));
        return ["checksum_sha256", "mime_type", "tamano_bytes", "storage_key"].every((nombre) => nombres.has(nombre));
    } catch {
        return false;
    }
}

async function obtenerMetadatosArchivo(datos, syncId, anterior = {}) {
    const ruta = String(datos.ruta_archivo || "");
    const raizProyecto = path.resolve(__dirname, "../..");
    const rutaAbsoluta = path.resolve(raizProyecto, ruta);
    const raizMultimedia = path.join(raizProyecto, "imagenes", "multimedia");
    const relativa = path.relative(raizMultimedia, rutaAbsoluta);
    const esArchivoLocalSeguro = Boolean(ruta) &&
        !path.isAbsolute(ruta) &&
        relativa !== "" &&
        !relativa.startsWith("..") &&
        !path.isAbsolute(relativa);

    if (!esArchivoLocalSeguro) {
        return {
            checksum_sha256: datos.checksum_sha256 ?? anterior.checksum_sha256 ?? null,
            mime_type: datos.mime_type ?? anterior.mime_type ?? null,
            tamano_bytes: datos.tamano_bytes ?? anterior.tamano_bytes ?? null,
            storage_key: datos.storage_key ?? anterior.storage_key ?? null
        };
    }

    const contenido = await fs.promises.readFile(rutaAbsoluta);
    const extensionOriginal = path.extname(rutaAbsoluta).toLowerCase();
    const extension = /^\.[a-z0-9]{1,10}$/.test(extensionOriginal) ? extensionOriginal : "";
    const tipo = String(datos.tipo_multi || anterior.tipo_multi || "archivo").replace(/[^a-z0-9_-]/gi, "").toLowerCase();
    return {
        checksum_sha256: createHash("sha256").update(contenido).digest("hex"),
        mime_type: datos.mime_type ?? anterior.mime_type ?? null,
        tamano_bytes: contenido.length,
        storage_key: syncId ? `multimedia/${tipo}/${syncId}${extension}` : null
    };
}






// =======================================================
// OBTENER TODO EL MULTIMEDIA
// =======================================================
//
// Obtiene todos los registros multimedia.
//
// Incluye información de la ficha asociada mediante JOIN
// para mostrar el título de la ficha relacionada.
//
// Retorna:
// Lista de archivos multimedia registrados.
//


const obtenerMultimedia = async () => {
    const filtro = await outboxMultimediaDisponible() ? "WHERE multimedia.sync_deleted_at IS NULL" : "";
    return new Promise((resolve, reject) => db.all(`
        SELECT multimedia.*, ficha.titulo AS ficha, menu.nombre AS menu
        FROM multimedia
        LEFT JOIN ficha ON multimedia.id_ficha = ficha.id_ficha
        LEFT JOIN menu ON ficha.id_menu = menu.id_menu
        ${filtro}
    `, [], (error, filas) => error ? reject(error) : resolve(filas)));
};

// =======================================================
// CREAR MULTIMEDIA
// =======================================================
//
// Inserta un nuevo archivo multimedia asociado a una ficha.
//
// Guarda:
// - Ficha relacionada.
// - Descripción.
// - Ruta del archivo.
// - Tipo de multimedia.
// - Miniatura.
// - Estado activo.
// - Fecha de creación.
//
// Retorna:
// ID generado del nuevo registro.
//

const crear = async (datos) => {
    if (!await outboxMultimediaDisponible()) {
        return new Promise((resolve, reject) => db.run(`
            INSERT INTO multimedia (
                id_ficha, descripcion, ruta_archivo, tipo_multi, miniatura, activo, creado
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            datos.id_ficha, datos.descripcion, datos.ruta_archivo,
            datos.tipo_multi, datos.miniatura, datos.activo, datos.creado
        ], function(error) {
            if (error) reject(error);
            else resolve(this.lastID);
        }));
    }

    const dispositivoId = await obtenerIdDispositivo();
    const syncId = randomUUID();
    const metadatos = await obtenerMetadatosArchivo(datos, syncId);
    return db.withTransaction(async (consultar) => {
        const ficha = await consultar("SELECT sync_id FROM ficha WHERE id_ficha = ?", [datos.id_ficha]);
        const fichaSyncId = ficha.rows[0]?.sync_id;
        if (!fichaSyncId) {
            const local = await consultar(`
                INSERT INTO multimedia (
                    id_ficha, descripcion, ruta_archivo, tipo_multi, miniatura, activo, creado,
                    checksum_sha256, mime_type, tamano_bytes, storage_key
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                datos.id_ficha, datos.descripcion, datos.ruta_archivo,
                datos.tipo_multi, datos.miniatura, datos.activo, datos.creado,
                metadatos.checksum_sha256, metadatos.mime_type,
                metadatos.tamano_bytes, null
            ]);
            return local.lastID;
        }

        const insercion = await consultar(`
            INSERT INTO multimedia (
                id_ficha, descripcion, ruta_archivo, tipo_multi, miniatura, activo, creado,
                sync_id, sync_version, sync_deleted_at,
                checksum_sha256, mime_type, tamano_bytes, storage_key
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?, ?, ?)
        `, [
            datos.id_ficha, datos.descripcion, datos.ruta_archivo,
            datos.tipo_multi, datos.miniatura, datos.activo, datos.creado,
            syncId, metadatos.checksum_sha256, metadatos.mime_type,
            metadatos.tamano_bytes, metadatos.storage_key
        ]);
        await registrarEvento(consultar, {
            dispositivoId, entidad: "multimedia", operacion: "INSERT",
            syncId, versionBase: 0, versionResultado: 1,
            payload: {
                ficha_sync_id: fichaSyncId,
                descripcion: datos.descripcion ?? null,
                tipo_multi: datos.tipo_multi,
                miniatura: datos.miniatura ?? null,
                activo: datos.activo ?? 1,
                ...metadatos
            }
        });
        return insercion.lastID;
    });
};

// =======================================================
// ACTUALIZAR MULTIMEDIA
// =======================================================
//
// Modifica la información de un archivo multimedia existente.
//
// Actualiza:
// - Ficha asociada.
// - Descripción.
// - Ruta del archivo.
// - Tipo.
// - Miniatura.
// - Estado.
// - Fecha de actualización.
//
// Si no encuentra el registro devuelve error.
//

const actualizar = async (id, datos) => {
    if (!await outboxMultimediaDisponible()) {
        return new Promise((resolve, reject) => db.run(`
            UPDATE multimedia SET
                id_ficha = ?, descripcion = ?, ruta_archivo = ?, tipo_multi = ?,
                miniatura = ?, activo = ?, actualizado = ?
            WHERE id_multi = ?
        `, [
            datos.id_ficha, datos.descripcion, datos.ruta_archivo,
            datos.tipo_multi, datos.miniatura, datos.activo, datos.actualizado, id
        ], function(error) {
            if (error) reject(error);
            else if (this.changes === 0) reject(new Error("No se encontró la multimedia."));
            else resolve();
        }));
    }

    const dispositivoId = await obtenerIdDispositivo();
    return db.withTransaction(async (consultar) => {
        const consulta = await consultar("SELECT * FROM multimedia WHERE id_multi = ?", [id]);
        const anterior = consulta.rows[0];
        if (!anterior || anterior.sync_deleted_at) throw new Error("No se encontró la multimedia.");
        const ficha = await consultar("SELECT sync_id FROM ficha WHERE id_ficha = ?", [datos.id_ficha]);
        const fichaSyncId = ficha.rows[0]?.sync_id;
        if (anterior.sync_id && !fichaSyncId) {
            throw new Error("No se puede mover multimedia sincronizada a una ficha sin identidad reconciliada.");
        }

        if (!fichaSyncId) {
            if (anterior.sync_id) {
                throw new Error("No se puede modificar multimedia sincronizada hacia una ficha sin identidad reconciliada.");
            }
            const metadatosLocales = await obtenerMetadatosArchivo(datos, randomUUID(), anterior);
            await consultar(`
                UPDATE multimedia SET
                    id_ficha = ?, descripcion = ?, ruta_archivo = ?, tipo_multi = ?,
                    miniatura = ?, activo = ?, actualizado = ?,
                    checksum_sha256 = ?, mime_type = ?, tamano_bytes = ?, storage_key = ?
                WHERE id_multi = ?
            `, [
                datos.id_ficha, datos.descripcion, datos.ruta_archivo,
                datos.tipo_multi, datos.miniatura, datos.activo, datos.actualizado,
                metadatosLocales.checksum_sha256, metadatosLocales.mime_type,
                metadatosLocales.tamano_bytes, null, id
            ]);
            return;
        }

        const syncId = anterior.sync_id || randomUUID();
        const metadatos = await obtenerMetadatosArchivo(datos, syncId, anterior);
        const versionBase = Number(anterior.sync_version || 1);
        const versionResultado = anterior.sync_id ? versionBase + 1 : 1;
        await consultar(`
            UPDATE multimedia SET
                id_ficha = ?, descripcion = ?, ruta_archivo = ?, tipo_multi = ?,
                miniatura = ?, activo = ?, actualizado = ?,
                sync_id = ?, sync_version = ?, sync_deleted_at = NULL,
                checksum_sha256 = ?, mime_type = ?, tamano_bytes = ?, storage_key = ?
            WHERE id_multi = ?
        `, [
            datos.id_ficha, datos.descripcion, datos.ruta_archivo,
            datos.tipo_multi, datos.miniatura, datos.activo, datos.actualizado,
            syncId, versionResultado, metadatos.checksum_sha256,
            metadatos.mime_type, metadatos.tamano_bytes, metadatos.storage_key, id
        ]);

        await registrarEvento(consultar, {
            dispositivoId, entidad: "multimedia",
            operacion: anterior.sync_id ? "UPDATE" : "INSERT",
            syncId, versionBase: anterior.sync_id ? versionBase : 0,
            versionResultado,
            payload: {
                ficha_sync_id: fichaSyncId,
                descripcion: datos.descripcion ?? null,
                tipo_multi: datos.tipo_multi,
                miniatura: datos.miniatura ?? null,
                activo: datos.activo ?? 1,
                ...metadatos
            }
        });
    });
};

// =======================================================
// ELIMINAR MULTIMEDIA
// =======================================================
//
// Elimina un registro multimedia utilizando su ID.
//
// Nota:
// Actualmente elimina solamente el registro de la base
// de datos.
//
// La eliminación del archivo físico del servidor debe
// manejarse en otra capa (por ejemplo controlador).
//

const eliminar = async (id) => {
    if (!await outboxMultimediaDisponible()) {
        return new Promise((resolve, reject) => db.run(
            "DELETE FROM multimedia WHERE id_multi = ?", [id],
            function(error) {
                if (error) reject(error);
                else if (this.changes === 0) reject(new Error("No se encontró la multimedia."));
                else resolve();
            }
        ));
    }

    const dispositivoId = await obtenerIdDispositivo();
    return db.withTransaction(async (consultar) => {
        const consulta = await consultar("SELECT * FROM multimedia WHERE id_multi = ?", [id]);
        const multimedia = consulta.rows[0];
        if (!multimedia || multimedia.sync_deleted_at) throw new Error("No se encontró la multimedia.");
        if (!multimedia.sync_id) {
            await consultar("DELETE FROM multimedia WHERE id_multi = ?", [id]);
            return;
        }

        const ficha = await consultar("SELECT sync_id FROM ficha WHERE id_ficha = ?", [multimedia.id_ficha]);
        const fichaSyncId = ficha.rows[0]?.sync_id;
        if (!fichaSyncId) {
            throw new Error("No se puede eliminar multimedia sincronizada sin la identidad reconciliada de su ficha.");
        }

        const versionBase = Number(multimedia.sync_version || 1);
        const versionResultado = versionBase + 1;
        const eliminadoEn = new Date().toISOString();
        await consultar(`
            UPDATE multimedia SET activo = 0, sync_deleted_at = ?, sync_version = ?,
                actualizado = ?
            WHERE id_multi = ?
        `, [eliminadoEn, versionResultado, eliminadoEn, id]);
        await registrarEvento(consultar, {
            dispositivoId, entidad: "multimedia", operacion: "DELETE",
            syncId: multimedia.sync_id, versionBase, versionResultado,
            payload: {
                ficha_sync_id: fichaSyncId,
                storage_key: multimedia.storage_key,
                checksum_sha256: multimedia.checksum_sha256,
                deleted_at: eliminadoEn
            }
        });
    });
};

// =======================================================
// OBTENER MULTIMEDIA POR FICHA
// =======================================================
//
// Obtiene todos los archivos multimedia asociados
// a una ficha determinada.
//
// Recibe:
// - id_ficha
//
// Retorna:
// Lista de multimedia perteneciente a esa ficha.
//

const obtenerPorFicha = async (id_ficha) => {
    const filtro = await outboxMultimediaDisponible() ? "AND multimedia.sync_deleted_at IS NULL" : "";
    return new Promise((resolve, reject) => {
        db.all(
            `
            SELECT
                multimedia.*,
                ficha.titulo AS ficha,
                menu.nombre AS menu
            FROM multimedia
            LEFT JOIN ficha
                ON multimedia.id_ficha = ficha.id_ficha
            LEFT JOIN menu
                ON ficha.id_menu = menu.id_menu
            WHERE multimedia.id_ficha = ? ${filtro}
            `,
            [id_ficha],
            (error, datos) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(datos);
                }
            }
        );
    });
};








// =======================================================
// OBTENER MULTIMEDIA POR ID
// =======================================================
//
// Busca un archivo multimedia específico.
//
// Incluye el título de la ficha relacionada.
//

const obtenerPorId = async (id) => {
    const filtro = await outboxMultimediaDisponible() ? "AND multimedia.sync_deleted_at IS NULL" : "";
    return new Promise((resolve, reject) => {
        db.get(
            `
            SELECT
                multimedia.*,
                ficha.titulo AS ficha,
                menu.nombre AS menu
            FROM multimedia
            LEFT JOIN ficha
                ON multimedia.id_ficha = ficha.id_ficha
            LEFT JOIN menu
                ON ficha.id_menu = menu.id_menu
            WHERE multimedia.id_multi = ? ${filtro}
            `,
            [id],
            (error, fila) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(fila);
                }
            }
        );
    });
};





// =======================================================
// EXPORTACIÓN DEL MODELO
// =======================================================
//
// Permite utilizar las funciones multimedia desde
// los controladores.
//

module.exports = {


    obtenerMultimedia,

    crear,

    actualizar,

    eliminar,

    obtenerPorFicha,

    obtenerPorId


};