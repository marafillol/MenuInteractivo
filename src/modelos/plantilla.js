// =======================================================
// MODELO PLANTILLA
// =======================================================
//
// Este modelo administra la entidad Plantilla.
//
// Una plantilla representa la estructura o interfaz
// utilizada por un menú.
//
// Relación:
//
//          plantilla
//              |
//              |
//             menu
//
// Responsabilidades:
// - Obtener plantillas disponibles.
// - Buscar plantillas por ID.
// - Obtener la plantilla utilizada por un menú.
// - Crear plantillas.
// - Actualizar plantillas.
// - Eliminar plantillas.
// - Contar menús asociados a una plantilla.
//
// No maneja:
// - Peticiones HTTP.
// - Respuestas al cliente.
// - Lógica de interfaz.
//
// La comunicación con la base de datos se realiza
// mediante SQLite.
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

async function outboxPlantillaDisponible() {
    if (!esModoLocal || typeof db.withTransaction !== "function") return false;
    try {
        const columnas = await consultarPromesa('PRAGMA table_info("plantilla")');
        const nombres = new Set(columnas.map((columna) => columna.name));
        if (!["sync_id", "sync_version", "sync_deleted_at"].every((nombre) => nombres.has(nombre))) return false;
        const tablas = await consultarPromesa("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sync_eventos'");
        return tablas.length === 1;
    } catch {
        return false;
    }
}







// =======================================================
// OBTENER TODAS LAS PLANTILLAS
// =======================================================
// Incluye plantillas activas e inactivas para que desde
// el administrador siempre se puedan editar y previsualizar.
// La visibilidad pública se controla por separado.

const obtenerPlantillas = async () => {
    const filtro = await outboxPlantillaDisponible() ? "WHERE sync_deleted_at IS NULL" : "";
    return new Promise((resolve, reject) => db.all(
        `SELECT * FROM plantilla ${filtro} ORDER BY nombre`,
        [], (error, filas) => error ? reject(error) : resolve(filas)
    ));
};

// =======================================================
// OBTENER PLANTILLA POR ID
// =======================================================
//
// Busca una plantilla específica utilizando
// su identificador.
//
// Recibe:
// - id de plantilla.
//
// Retorna:
// Información completa de la plantilla.
//

const obtenerPorId = async (id) => {
    const filtro = await outboxPlantillaDisponible() ? "AND sync_deleted_at IS NULL" : "";
    return new Promise((resolve, reject) => db.get(
        `SELECT * FROM plantilla WHERE id_plantilla = ? ${filtro}`,
        [id], (error, fila) => error ? reject(error) : resolve(fila)
    ));
};

// =======================================================
// OBTENER PLANTILLA POR MENÚ
// =======================================================
//
// Obtiene la plantilla asociada a un menú.
//
// Relación:
//
// menu
//  |
//  |
// plantilla
//
// Recibe:
// - id_menu.
//
// Retorna:
// La plantilla utilizada por ese menú.
//

const obtenerPorMenu = async (id_menu) => {
    const filtro = await outboxPlantillaDisponible() ? "AND plantilla.sync_deleted_at IS NULL" : "";
    return new Promise((resolve, reject) => db.get(`
        SELECT plantilla.* FROM menu
        INNER JOIN plantilla ON menu.id_plantilla = plantilla.id_plantilla
        WHERE menu.id_menu = ? ${filtro}
    `, [id_menu], (error, fila) => error ? reject(error) : resolve(fila));
};

// =======================================================
// CREAR PLANTILLA
// =======================================================
//
// Inserta una nueva plantilla.
//
// Guarda:
// - Nombre.
// - Descripción.
// - Estructura JSON.
// - Estado activo.
//
// Retorna:
// ID generado de la nueva plantilla.
//

const crear = async (datos) => {
    const valores = [datos.nombre, datos.descripcion, datos.plantilla_json, datos.activo];
    const sql = `
        INSERT INTO plantilla (nombre, descripcion, plantilla_json, activo)
        VALUES (?, ?, ?, ?)
    `;
    if (!await outboxPlantillaDisponible()) {
        return new Promise((resolve, reject) => db.run(sql, valores, function(error) {
            if (error) reject(error);
            else resolve(this.lastID);
        }));
    }

    const dispositivoId = await obtenerIdDispositivo();
    const syncId = randomUUID();
    return db.withTransaction(async (consultar) => {
        const insercion = await consultar(`
            INSERT INTO plantilla (
                nombre, descripcion, plantilla_json, activo, sync_id, sync_version, sync_deleted_at
            ) VALUES (?, ?, ?, ?, ?, 1, NULL)
        `, [...valores, syncId]);
        await registrarEvento(consultar, {
            dispositivoId, entidad: "plantilla", operacion: "INSERT",
            syncId, versionBase: 0, versionResultado: 1,
            payload: {
                nombre: datos.nombre, descripcion: datos.descripcion ?? null,
                plantilla_json: datos.plantilla_json, activo: datos.activo ?? 1
            }
        });
        return insercion.lastID;
    });
};

// =======================================================
// ACTUALIZAR PLANTILLA
// =======================================================
//
// Modifica los datos de una plantilla existente.
//
// Actualiza:
// - Nombre.
// - Descripción.
// - JSON de estructura.
// - Estado activo.
// - Fecha de actualización.
//

const actualizar = async (id, datos) => {
    const valores = [datos.nombre, datos.descripcion, datos.plantilla_json, datos.activo, id];
    const sql = `
        UPDATE plantilla SET nombre = ?, descripcion = ?, plantilla_json = ?,
            activo = ?, actualizado = CURRENT_TIMESTAMP
        WHERE id_plantilla = ?
    `;
    if (!await outboxPlantillaDisponible()) {
        return new Promise((resolve, reject) => db.run(sql, valores, (error) =>
            error ? reject(error) : resolve()
        ));
    }

    const dispositivoId = await obtenerIdDispositivo();
    return db.withTransaction(async (consultar) => {
        const consulta = await consultar("SELECT * FROM plantilla WHERE id_plantilla = ?", [id]);
        const anterior = consulta.rows[0];
        if (!anterior || anterior.sync_deleted_at) return;
        if (!anterior.sync_id) {
            await consultar(sql, valores);
            return;
        }

        const versionBase = Number(anterior.sync_version || 1);
        const versionResultado = versionBase + 1;
        await consultar(`
            UPDATE plantilla SET nombre = ?, descripcion = ?, plantilla_json = ?,
                activo = ?, actualizado = CURRENT_TIMESTAMP, sync_version = ?
            WHERE id_plantilla = ?
        `, [datos.nombre, datos.descripcion, datos.plantilla_json, datos.activo, versionResultado, id]);
        await registrarEvento(consultar, {
            dispositivoId, entidad: "plantilla", operacion: "UPDATE",
            syncId: anterior.sync_id, versionBase, versionResultado,
            payload: {
                nombre: datos.nombre, descripcion: datos.descripcion ?? null,
                plantilla_json: datos.plantilla_json, activo: datos.activo ?? anterior.activo
            }
        });
    });
};

// =======================================================
// ELIMINAR PLANTILLA
// =======================================================
//
// Elimina una plantilla utilizando su ID.
//
// Antes de eliminar debería verificarse si existen
// menús asociados utilizando contarMenus().
//
// Actualmente realiza eliminación física mediante DELETE.
//

const eliminar = async (id) => {
    if (await outboxPlantillaDisponible()) return eliminarSiNoUtilizada(id);
    return new Promise((resolve, reject) => db.run(
        "DELETE FROM plantilla WHERE id_plantilla = ?", [id],
        function(error) {
            if (error) reject(error);
            else resolve({ eliminado: this.changes > 0 });
        }
    ));
};

// =======================================================
// CONTAR MENÚS QUE UTILIZAN UNA PLANTILLA
// =======================================================
//
// Cuenta cuántos menús están utilizando
// una determinada plantilla.
//
// Se utiliza antes de eliminar una plantilla
// para evitar eliminar estructuras que todavía
// están siendo utilizadas.
//

const contarMenus = (id_plantilla)=>{

    return new Promise((resolve,reject)=>{


        db.get(

            `
            SELECT COUNT(*) AS cantidad
            FROM menu
            WHERE id_plantilla = ?
            `,


            [id_plantilla],


            (error,fila)=>{


                if(error){

                    reject(error);

                }else{

                    resolve(fila.cantidad);

                }

            }


        );


    });

};








// =======================================================
// EXPORTACIÓN DEL MODELO
// =======================================================
//
// Permite utilizar las funciones del modelo
// desde los controladores.
//

const eliminarSiNoUtilizada = async (id) => {
    if (!await outboxPlantillaDisponible()) {
        return db.withTransaction(async (consultar) => {
            const consulta = await consultar("SELECT * FROM plantilla WHERE id_plantilla = ?", [id]);
            if (!consulta.rows.length) return { encontrada: false, cantidad: 0 };
            const conteo = await consultar("SELECT COUNT(*) AS cantidad FROM menu WHERE id_plantilla = ?", [id]);
            const cantidad = Number(conteo.rows[0]?.cantidad || 0);
            if (cantidad > 0) return { encontrada: true, plantilla: consulta.rows[0], cantidad };
            await consultar("DELETE FROM plantilla WHERE id_plantilla = ?", [id]);
            return { encontrada: true, plantilla: consulta.rows[0], cantidad: 0, eliminada: true };
        });
    }

    const dispositivoId = await obtenerIdDispositivo();
    return db.withTransaction(async (consultar) => {
        const consulta = await consultar("SELECT * FROM plantilla WHERE id_plantilla = ?", [id]);
        const plantilla = consulta.rows[0];
        if (!plantilla || plantilla.sync_deleted_at) return { encontrada: false, cantidad: 0 };
        const conteo = await consultar("SELECT COUNT(*) AS cantidad FROM menu WHERE id_plantilla = ?", [id]);
        const cantidad = Number(conteo.rows[0]?.cantidad || 0);
        if (cantidad > 0) return { encontrada: true, plantilla, cantidad };
        if (!plantilla.sync_id) {
            await consultar("DELETE FROM plantilla WHERE id_plantilla = ?", [id]);
            return { encontrada: true, plantilla, cantidad: 0, eliminada: true };
        }

        const versionBase = Number(plantilla.sync_version || 1);
        const versionResultado = versionBase + 1;
        const eliminadoEn = new Date().toISOString();
        await consultar(`
            UPDATE plantilla SET activo = 0, sync_deleted_at = ?,
                sync_version = ?, actualizado = CURRENT_TIMESTAMP
            WHERE id_plantilla = ?
        `, [eliminadoEn, versionResultado, id]);
        await registrarEvento(consultar, {
            dispositivoId, entidad: "plantilla", operacion: "DELETE",
            syncId: plantilla.sync_id, versionBase, versionResultado,
            payload: {
                nombre: plantilla.nombre, deleted_at: eliminadoEn
            }
        });
        return { encontrada: true, plantilla, cantidad: 0, eliminada: true, pendienteSincronizacion: true };
    });
};

module.exports = {


    obtenerPlantillas,

    obtenerPorId,

    obtenerPorMenu,

    crear,

    actualizar,

    eliminar,

    contarMenus,
    eliminarSiNoUtilizada


};