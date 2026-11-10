
// =======================================================
// MODELO MENU
// =======================================================
//
// Este modelo contiene todas las operaciones relacionadas
// con la entidad Menu.
//
// Responsabilidades:
// - Obtener menús almacenados.
// - Crear nuevos menús.
// - Actualizar menús existentes.
// - Eliminar menús.
// - Consultar menús específicos.
// - Verificar cantidad de fichas asociadas.
//
// No maneja:
// - Peticiones HTTP.
// - Respuestas al cliente.
// - Lógica de interfaz.
//
// La comunicación se realiza directamente con SQLite.
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

async function outboxMenuDisponible() {
    if (!esModoLocal || typeof db.withTransaction !== "function") return false;
    try {
        const [menu, plantilla, eventos] = await Promise.all([
            consultarPromesa('PRAGMA table_info("menu")'),
            consultarPromesa('PRAGMA table_info("plantilla")'),
            consultarPromesa("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sync_eventos'")
        ]);
        const tiene = (filas) => {
            const nombres = new Set(filas.map((fila) => fila.name));
            return ["sync_id", "sync_version", "sync_deleted_at"].every((nombre) => nombres.has(nombre));
        };
        return tiene(menu) && tiene(plantilla) && eventos.length === 1;
    } catch {
        return false;
    }
}






// =======================================================
// OBTENER TODOS LOS MENÚS
// =======================================================
//
// Obtiene todos los menús registrados en la base de datos.
//
// Retorna:
// Lista completa de menús.
//

const obtenerMenus = async () => {
    const filtro = await outboxMenuDisponible() ? "WHERE menu.sync_deleted_at IS NULL" : "";
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT menu.*, plantilla.nombre AS nombre_plantilla
            FROM menu
            LEFT JOIN plantilla ON menu.id_plantilla = plantilla.id_plantilla
            ${filtro}
        `, [], (error, filas) => error ? reject(error) : resolve(filas));
    });
};




// =======================================================
// ACTUALIZAR MENÚ
// =======================================================
//
// Modifica los datos de un menú existente.
//
// Actualiza:
// - Nombre.
// - Descripción.
// - Imagen.
// - Plantilla asociada.
// - Estado de visibilidad.
// - Fecha de actualización.
//
// La imagen utiliza COALESCE para conservar
// la imagen anterior cuando no se envía una nueva.
//

const actualizar = async (id, datos) => {
    const valores = [
        datos.nombre, datos.descripcion, datos.imagen || null,
        datos.id_plantilla, datos.visible, id
    ];
    const sql = `
        UPDATE menu SET
            nombre = ?, descripcion = ?, imagen = COALESCE(?, imagen),
            id_plantilla = ?, visible = ?, actualizado = datetime('now','-3 hours')
        WHERE id_menu = ?
    `;

    if (!await outboxMenuDisponible()) {
        return new Promise((resolve, reject) => db.run(sql, valores, (error) =>
            error ? reject(error) : resolve()
        ));
    }

    const dispositivoId = await obtenerIdDispositivo();
    return db.withTransaction(async (consultar) => {
        const consulta = await consultar("SELECT * FROM menu WHERE id_menu = ?", [id]);
        const anterior = consulta.rows[0];
        if (!anterior || anterior.sync_deleted_at) return;
        if (!anterior.sync_id) {
            await consultar(sql, valores);
            return;
        }

        const plantilla = await consultar(
            "SELECT sync_id FROM plantilla WHERE id_plantilla = ?", [datos.id_plantilla]
        );
        const plantillaSyncId = plantilla.rows[0]?.sync_id;
        if (!plantillaSyncId) {
            throw new Error("No se puede modificar un menú sincronizado hacia una plantilla sin identidad reconciliada.");
        }

        const versionBase = Number(anterior.sync_version || 1);
        const versionResultado = versionBase + 1;
        await consultar(`
            UPDATE menu SET
                nombre = ?, descripcion = ?, imagen = COALESCE(?, imagen),
                id_plantilla = ?, visible = ?, actualizado = datetime('now','-3 hours'),
                sync_version = ?
            WHERE id_menu = ?
        `, [
            datos.nombre, datos.descripcion, datos.imagen || null,
            datos.id_plantilla, datos.visible, versionResultado, id
        ]);
        await registrarEvento(consultar, {
            dispositivoId, entidad: "menu", operacion: "UPDATE",
            syncId: anterior.sync_id, versionBase, versionResultado,
            payload: {
                plantilla_sync_id: plantillaSyncId,
                nombre: datos.nombre, descripcion: datos.descripcion || null,
                imagen: datos.imagen || anterior.imagen || null,
                visible: datos.visible ?? anterior.visible
            }
        });
    });
};

// =======================================================
// ELIMINAR MENÚ
// =======================================================
//
// Elimina un menú utilizando su identificador.
//
// La validación de si puede eliminarse
// debe realizarse antes desde el controlador.
//
// Ejemplo:
// - No eliminar si posee fichas asociadas.
//

const eliminar = (id) => {


    return new Promise((resolve,reject)=>{


        db.run(
            `
            DELETE FROM menu
            WHERE id_menu = ?
            `,
            [id],

            function(error){


                if(error){

                    reject(error);

                }

                else{

                    resolve();

                }

            }

        );


    });


};






// =======================================================
// CREAR MENÚ
// =======================================================
//
// Inserta un nuevo menú en la base de datos.
//
// Recibe:
// - Nombre.
// - Descripción.
// - Imagen.
// - Plantilla asociada.
// - Estado de visibilidad.
//
// Retorna:
// ID generado del nuevo menú.
//

const crear = async (datos) => {
    const { nombre, descripcion, id_plantilla, visible, imagen } = datos;
    const valores = [nombre, descripcion || null, imagen || null, id_plantilla || null, visible ?? 1];
    const sql = `
        INSERT INTO menu (nombre, descripcion, imagen, id_plantilla, visible, creado)
        VALUES (?, ?, ?, ?, ?, datetime('now','-3 hours'))
    `;

    if (!await outboxMenuDisponible()) {
        return new Promise((resolve, reject) => db.run(sql, valores, function(error) {
            if (error) reject(error);
            else resolve(this.lastID);
        }));
    }

    const dispositivoId = await obtenerIdDispositivo();
    const syncId = randomUUID();
    return db.withTransaction(async (consultar) => {
        const plantilla = await consultar(
            "SELECT sync_id FROM plantilla WHERE id_plantilla = ?", [id_plantilla]
        );
        const plantillaSyncId = plantilla.rows[0]?.sync_id;
        if (!plantillaSyncId) {
            const insercionLocal = await consultar(sql, valores);
            return insercionLocal.lastID;
        }

        const insercion = await consultar(`
            INSERT INTO menu (
                nombre, descripcion, imagen, id_plantilla, visible, creado,
                sync_id, sync_version, sync_deleted_at
            ) VALUES (?, ?, ?, ?, ?, datetime('now','-3 hours'), ?, 1, NULL)
        `, [...valores, syncId]);
        await registrarEvento(consultar, {
            dispositivoId, entidad: "menu", operacion: "INSERT",
            syncId, versionBase: 0, versionResultado: 1,
            payload: {
                plantilla_sync_id: plantillaSyncId, nombre,
                descripcion: descripcion || null, imagen: imagen || null,
                visible: visible ?? 1
            }
        });
        return insercion.lastID;
    });
};

// =======================================================
// OBTENER MENÚ POR ID
// =======================================================
//
// Busca un menú específico utilizando su identificador.
//
// Recibe:
// - id del menú.
//
// Retorna:
// Información completa del menú.
//

const obtenerPorId = (id) => {

    return new Promise((resolve, reject) => {

        db.get(

            `

            SELECT
                menu.*,
                plantilla.nombre AS nombre_plantilla,
                (
                    SELECT COUNT(*)
                    FROM ficha
                    WHERE ficha.id_menu = menu.id_menu
                ) AS cantidad_fichas
            FROM menu
            LEFT JOIN plantilla
                ON menu.id_plantilla = plantilla.id_plantilla
            WHERE menu.id_menu = ?

            `,

            [id],

            (error, fila) => {


                if(error){

                    reject(error);

                }

                else{

                    resolve(fila);

                }

            }

        );

    });

};






// =======================================================
// CONTAR FICHAS ASOCIADAS A UN MENÚ
// =======================================================
//
// Cuenta cuántas fichas pertenecen a un menú.
//
// Se utiliza principalmente antes de eliminar
// un menú para evitar eliminar contenido relacionado.
//
// Retorna:
// Cantidad de fichas asociadas.
//

const contarFichas = (id_menu)=>{

    return new Promise((resolve,reject)=>{

        db.get(

            `
            SELECT COUNT(*) AS cantidad
            FROM ficha
            WHERE id_menu = ?
            `,

            [id_menu],

            (error,fila)=>{


                if(error){

                    reject(error);

                }

                else{

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

const eliminarSiVacio = async (id) => {
    if (!await outboxMenuDisponible()) {
        return db.withTransaction(async (consultar) => {
            const menu = await consultar("SELECT * FROM menu WHERE id_menu = ?", [id]);
            if (!menu.rows.length) return { encontrado: false, cantidad: 0 };
            const conteo = await consultar("SELECT COUNT(*) AS cantidad FROM ficha WHERE id_menu = ?", [id]);
            const cantidad = Number(conteo.rows[0]?.cantidad || 0);
            if (cantidad > 0) return { encontrado: true, menu: menu.rows[0], cantidad };
            await consultar("DELETE FROM menu WHERE id_menu = ?", [id]);
            return { encontrado: true, menu: menu.rows[0], cantidad: 0, eliminado: true };
        });
    }

    const dispositivoId = await obtenerIdDispositivo();
    return db.withTransaction(async (consultar) => {
        const consulta = await consultar("SELECT * FROM menu WHERE id_menu = ?", [id]);
        const menu = consulta.rows[0];
        if (!menu || menu.sync_deleted_at) return { encontrado: false, cantidad: 0 };
        const conteo = await consultar("SELECT COUNT(*) AS cantidad FROM ficha WHERE id_menu = ?", [id]);
        const cantidad = Number(conteo.rows[0]?.cantidad || 0);
        if (cantidad > 0) return { encontrado: true, menu, cantidad };

        if (!menu.sync_id) {
            await consultar("DELETE FROM menu WHERE id_menu = ?", [id]);
            return { encontrado: true, menu, cantidad: 0, eliminado: true };
        }

        const plantilla = await consultar(
            "SELECT sync_id FROM plantilla WHERE id_plantilla = ?", [menu.id_plantilla]
        );
        const plantillaSyncId = plantilla.rows[0]?.sync_id;
        if (!plantillaSyncId) {
            throw new Error("No se puede eliminar un menú sincronizado sin la identidad reconciliada de su plantilla.");
        }

        const versionBase = Number(menu.sync_version || 1);
        const versionResultado = versionBase + 1;
        const eliminadoEn = new Date().toISOString();
        await consultar(`
            UPDATE menu SET visible = 0, sync_deleted_at = ?, sync_version = ?,
                actualizado = datetime('now','-3 hours')
            WHERE id_menu = ?
        `, [eliminadoEn, versionResultado, id]);
        await registrarEvento(consultar, {
            dispositivoId, entidad: "menu", operacion: "DELETE",
            syncId: menu.sync_id, versionBase, versionResultado,
            payload: {
                plantilla_sync_id: plantillaSyncId,
                nombre: menu.nombre, deleted_at: eliminadoEn
            }
        });
        return { encontrado: true, menu, cantidad: 0, eliminado: true, pendienteSincronizacion: true };
    });
};

module.exports = {

    obtenerMenus,

    obtenerPorId,

    crear,

    actualizar,

    eliminar,

    contarFichas,
    eliminarSiVacio
};
