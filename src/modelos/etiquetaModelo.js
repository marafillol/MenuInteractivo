// =======================================================
// MODELO ETIQUETA
// =======================================================
//
// Este modelo representa la entidad Etiqueta del sistema.
//
// Su responsabilidad es:
// - Realizar consultas sobre la tabla etiqueta.
// - Crear, consultar, modificar y eliminar etiquetas.
// - Devolver información obtenida desde la base de datos.
//
// No maneja:
// - Peticiones HTTP.
// - Respuestas al cliente.
// - Lógica de interfaz.
//

const db = require("../database");
const { randomUUID } = require("node:crypto");
const { esModoLocal } = require("../config/modoServidor");
const { registrarEvento } = require("../servicios/sincronizacion/outbox");
const { obtenerIdDispositivo } = require("../servicios/sincronizacion/dispositivo");

function consultarPromesa(sql, valores = []) {
    return new Promise((resolve, reject) => db.all(sql, valores, (error, filas) =>
        error ? reject(error) : resolve(filas)
    ));
}

async function outboxEtiquetaDisponible() {
    if (!esModoLocal || typeof db.withTransaction !== "function") return false;
    try {
        const columnas = await consultarPromesa('PRAGMA table_info("etiqueta")');
        const nombres = new Set(columnas.map((columna) => columna.name));
        if (!["sync_id", "sync_version", "sync_deleted_at"].every((nombre) => nombres.has(nombre))) return false;
        const tablas = await consultarPromesa("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sync_eventos'");
        return tablas.length === 1;
    } catch {
        return false;
    }
}




// =======================================================
// CLASE ETIQUETA
// =======================================================
//
// Contiene todas las operaciones relacionadas
// con la tabla "etiqueta".
//

class Etiqueta {





    // ===================================================
    // OBTENER TODAS LAS ETIQUETAS
    // ===================================================
    //
    // Consulta todas las etiquetas almacenadas.
    //
    // Ordena los resultados alfabéticamente
    // utilizando el nombre de la etiqueta.
    //
    // Retorna:
    // Array de etiquetas.
    //

    static async obtenerTodas(){
        const filtro = await outboxEtiquetaDisponible() ? "WHERE sync_deleted_at IS NULL" : "";
        return new Promise((resolve, reject) => db.all(
            `SELECT * FROM etiqueta ${filtro} ORDER BY nombre`,
            [], (error, filas) => error ? reject(error) : resolve(filas)
        ));
    }






    // ===================================================
    // CREAR ETIQUETA
    // ===================================================
    //
    // Inserta una nueva etiqueta en la base de datos.
    //
    // Recibe:
    // - nombre
    // - descripcion
    // - activo
    //
    // Retorna:
    // La etiqueta creada junto con su ID generado.
    //

    static async crear(datos){
        const valores = [datos.nombre, datos.descripcion, datos.activo];
        if (!await outboxEtiquetaDisponible()) {
            return new Promise((resolve, reject) => db.run(
                "INSERT INTO etiqueta (nombre, descripcion, activo) VALUES (?, ?, ?)",
                valores,
                function(error) {
                    if (error) reject(error);
                    else resolve({ id_etiqueta: this.lastID, ...datos });
                }
            ));
        }

        const dispositivoId = await obtenerIdDispositivo();
        const syncId = randomUUID();
        return db.withTransaction(async (consultar) => {
            const insercion = await consultar(`
                INSERT INTO etiqueta (
                    nombre, descripcion, activo, sync_id, sync_version, sync_deleted_at
                ) VALUES (?, ?, ?, ?, 1, NULL)
            `, [...valores, syncId]);
            await registrarEvento(consultar, {
                dispositivoId, entidad: "etiqueta", operacion: "INSERT",
                syncId, versionBase: 0, versionResultado: 1,
                payload: {
                    nombre: datos.nombre, descripcion: datos.descripcion ?? null,
                    activo: datos.activo ?? 1
                }
            });
            return { id_etiqueta: insercion.lastID, ...datos, sync_id: syncId };
        });
    }






    // ===================================================
    // OBTENER ETIQUETA POR ID
    // ===================================================
    //
    // Busca una etiqueta específica utilizando
    // su identificador único.
    //
    // Recibe:
    // ID de la etiqueta.
    //
    // Retorna:
    // Una etiqueta encontrada.
    //

    static async obtenerPorId(id){
        const filtro = await outboxEtiquetaDisponible() ? "AND sync_deleted_at IS NULL" : "";
        return new Promise((resolve, reject) => db.get(
            `SELECT * FROM etiqueta WHERE id_etiqueta = ? ${filtro}`,
            [id], (error, fila) => error ? reject(error) : resolve(fila)
        ));
    }






    // ===================================================
    // EDITAR ETIQUETA
    // ===================================================
    //
    // Actualiza los datos de una etiqueta existente.
    //
    // Modifica:
    // - Nombre.
    // - Descripción.
    // - Estado activo.
    //
    // Recibe:
    // - ID de etiqueta.
    // - Nuevos datos.
    //
    // Retorna:
    // La etiqueta actualizada.
    //

    static async editar(id, datos){
        const valores = [datos.nombre, datos.descripcion, datos.activo, id];
        const sql = "UPDATE etiqueta SET nombre = ?, descripcion = ?, activo = ? WHERE id_etiqueta = ?";
        if (!await outboxEtiquetaDisponible()) {
            return new Promise((resolve, reject) => db.run(sql, valores, (error) =>
                error ? reject(error) : resolve({ id_etiqueta: id, ...datos })
            ));
        }

        const dispositivoId = await obtenerIdDispositivo();
        return db.withTransaction(async (consultar) => {
            const consulta = await consultar("SELECT * FROM etiqueta WHERE id_etiqueta = ?", [id]);
            const anterior = consulta.rows[0];
            if (!anterior || anterior.sync_deleted_at) return undefined;
            if (!anterior.sync_id) {
                await consultar(sql, valores);
                return { id_etiqueta: id, ...datos };
            }

            const versionBase = Number(anterior.sync_version || 1);
            const versionResultado = versionBase + 1;
            await consultar(`
                UPDATE etiqueta SET nombre = ?, descripcion = ?, activo = ?, sync_version = ?
                WHERE id_etiqueta = ?
            `, [datos.nombre, datos.descripcion, datos.activo, versionResultado, id]);
            await registrarEvento(consultar, {
                dispositivoId, entidad: "etiqueta", operacion: "UPDATE",
                syncId: anterior.sync_id, versionBase, versionResultado,
                payload: {
                    nombre: datos.nombre, descripcion: datos.descripcion ?? null,
                    activo: datos.activo ?? anterior.activo
                }
            });
            return { id_etiqueta: id, ...datos, sync_id: anterior.sync_id };
        });
    }






    // ===================================================
    // ELIMINAR ETIQUETA
    // ===================================================
    //
    // Elimina una etiqueta utilizando su ID.
    //
    // Recibe:
    // ID de la etiqueta a eliminar.
    //
    // Retorna:
    // Confirmación de eliminación.
    //

    static async eliminar(id){
        if (await outboxEtiquetaDisponible()) return this.eliminarConRelaciones(id);
        return new Promise((resolve, reject) => db.run(
            "DELETE FROM etiqueta WHERE id_etiqueta = ?", [id],
            function(error) {
                if (error) reject(error);
                else resolve({ eliminado: this.changes > 0 });
            }
        ));
    }

    static async eliminarConRelaciones(id) {
        if (!await outboxEtiquetaDisponible()) {
            return db.withTransaction(async (consultar) => {
                const etiqueta = await consultar("SELECT id_etiqueta FROM etiqueta WHERE id_etiqueta = ?", [id]);
                if (!etiqueta.rows.length) return { eliminado: false };
                await consultar("DELETE FROM ficha_etiqueta WHERE id_etiqueta = ?", [id]);
                await consultar("DELETE FROM etiqueta WHERE id_etiqueta = ?", [id]);
                return { eliminado: true };
            });
        }

        const dispositivoId = await obtenerIdDispositivo();
        return db.withTransaction(async (consultar) => {
            const consulta = await consultar("SELECT * FROM etiqueta WHERE id_etiqueta = ?", [id]);
            const etiqueta = consulta.rows[0];
            if (!etiqueta || etiqueta.sync_deleted_at) return { eliminado: false };
            if (!etiqueta.sync_id) {
                await consultar("DELETE FROM ficha_etiqueta WHERE id_etiqueta = ?", [id]);
                await consultar("DELETE FROM etiqueta WHERE id_etiqueta = ?", [id]);
                return { eliminado: true };
            }

            const relaciones = await consultar(`
                SELECT ficha.sync_id AS ficha_sync_id,
                    ficha_etiqueta.sync_id AS relacion_sync_id
                FROM ficha_etiqueta
                INNER JOIN ficha ON ficha.id_ficha = ficha_etiqueta.id_ficha
                WHERE ficha_etiqueta.id_etiqueta = ?
                    AND ficha_etiqueta.sync_deleted_at IS NULL
            `, [id]);
            if (relaciones.rows.some((fila) => !fila.ficha_sync_id || !fila.relacion_sync_id)) {
                throw new Error("No se puede eliminar una etiqueta sincronizada mientras tenga asociaciones o fichas relacionadas sin identidad reconciliada.");
            }

            const versionBase = Number(etiqueta.sync_version || 1);
            const versionResultado = versionBase + 1;
            const eliminadoEn = new Date().toISOString();
            await consultar(`
                UPDATE etiqueta SET activo = 0, sync_deleted_at = ?, sync_version = ?
                WHERE id_etiqueta = ?
            `, [eliminadoEn, versionResultado, id]);
            await registrarEvento(consultar, {
                dispositivoId, entidad: "etiqueta", operacion: "DELETE",
                syncId: etiqueta.sync_id, versionBase, versionResultado,
                payload: {
                    nombre: etiqueta.nombre,
                    fichas_sync_ids: relaciones.rows.map((fila) => fila.ficha_sync_id),
                    relaciones_sync_ids: relaciones.rows.map((fila) => fila.relacion_sync_id),
                    deleted_at: eliminadoEn
                }
            });
            return { eliminado: true, pendienteSincronizacion: true };
        });
    }

}



// =======================================================
// EXPORTACIÓN DEL MODELO
// =======================================================
//
// Permite utilizar la clase Etiqueta desde
// controladores u otros módulos del backend.
//

module.exports = Etiqueta;