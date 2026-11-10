// =======================================================
// MODELO FICHA
// =======================================================
//
// Este modelo contiene todas las operaciones relacionadas
// con la entidad Ficha.
//
// Responsabilidades:
// - Consultar fichas almacenadas.
// - Crear nuevas fichas.
// - Actualizar fichas existentes.
// - Eliminar fichas.
// - Consultar información relacionada.
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

async function outboxFichaDisponible() {
    if (!esModoLocal || typeof db.withTransaction !== "function") return false;
    try {
        const columnas = await consultarPromesa('PRAGMA table_info("ficha")');
        const nombres = new Set(columnas.map((columna) => columna.name));
        if (!["sync_id", "sync_version", "sync_deleted_at"].every((nombre) => nombres.has(nombre))) return false;
        const tablas = await consultarPromesa("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sync_eventos'");
        return tablas.length === 1;
    } catch {
        return false;
    }
}





// =======================================================
// OBTENER TODAS LAS FICHAS
// =======================================================
//
// Obtiene todas las fichas registradas.
//
// Incluye el nombre del menú asociado mediante un LEFT JOIN.
//
// Retorna:
// Lista de fichas con información del menú.
//

const obtenerFichas = () => {

    return new Promise((resolve, reject) => {

        db.all(
            `
            SELECT
                ficha.*,
                menu.nombre AS menu
            FROM ficha
            LEFT JOIN menu
            ON ficha.id_menu = menu.id_menu
            `,
            [],
            (error, filas) => {

                if (error) {

                    reject(error);

                } else {

                    resolve(filas);

                }

            }
        );

    });

};






// =======================================================
// OBTENER FICHAS POR MENÚ
// =======================================================
//
// Obtiene únicamente las fichas pertenecientes
// a un menú específico.
//
// Recibe:
// - id_menu: identificador del menú.
//
// Retorna:
// Lista de fichas asociadas al menú.
//

const obtenerFichasPorMenu = (id_menu) => {

    return new Promise((resolve, reject) => {

        db.all(
            `
            SELECT
                ficha.*,
                menu.nombre AS menu
            FROM ficha
            LEFT JOIN menu
            ON ficha.id_menu = menu.id_menu
            WHERE ficha.id_menu = ?
            `,
            [id_menu],
            (error, filas) => {

                if (error) {

                    reject(error);

                } else {

                    resolve(filas);

                }

            }
        );

    });

};






// =======================================================
// CREAR FICHA
// =======================================================
//
// Inserta una nueva ficha en la base de datos.
//
// Recibe:
// - Menú asociado.
// - Título.
// - Resumen.
// - Texto completo.
// - Imagen.
// - Datos específicos en formato JSON.
// - Estado de visibilidad.
//
// Retorna:
// ID generado de la nueva ficha.
//

const crear = async (datos) => {
    const { id_menu, titulo, resumen, texto, imagen, datos_json, visible } = datos;
    const valores = [
        id_menu, titulo, resumen || null, texto || null,
        imagen || null, datos_json || null, visible ?? 1
    ];

    if (await outboxFichaDisponible()) {
        const dispositivoId = await obtenerIdDispositivo();
        const syncId = randomUUID();
        return db.withTransaction(async (consultar) => {
            const insercion = await consultar(`
                INSERT INTO ficha (
                    id_menu, titulo, resumen, texto, imagen, datos_json,
                    visible, creado, sync_id, sync_version, sync_deleted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','-3 hours'), ?, 1, NULL)
            `, [...valores, syncId]);
            const id = insercion.lastID;
            await registrarEvento(consultar, {
                dispositivoId, entidad: "ficha", operacion: "INSERT",
                syncId, versionBase: 0, versionResultado: 1,
                payload: {
                    id_menu, titulo, resumen: resumen || null, texto: texto || null,
                    imagen: imagen || null, datos_json: datos_json || null,
                    visible: visible ?? 1
                }
            });
            return id;
        });
    }

    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO ficha (
                id_menu, titulo, resumen, texto, imagen, datos_json, visible, creado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','-3 hours'))
        `, valores, function(error) {
            if (error) reject(error);
            else resolve(this.lastID);
        });
    });
};

// =======================================================
// ACTUALIZAR FICHA
// =======================================================
//
// Actualiza la información de una ficha existente.
//
// Actualiza:
// - Menú.
// - Título.
// - Resumen.
// - Texto.
// - Visibilidad.
// - Datos JSON.
//
// La imagen solamente se actualiza si se recibe
// una nueva imagen.
//

const actualizar = async (id, datos) => {
    let sql = `
        UPDATE ficha SET
            id_menu = ?, titulo = ?, resumen = ?, texto = ?,
            visible = ?, datos_json = ?,
            actualizado = datetime('now','-3 hours')
    `;
    const valores = [
        datos.id_menu, datos.titulo, datos.resumen, datos.texto,
        datos.visible, datos.datos_json
    ];
    if (datos.imagen) {
        sql += ", imagen = ?";
        valores.push(datos.imagen);
    }
    sql += " WHERE id_ficha = ?";
    valores.push(id);

    if (await outboxFichaDisponible()) {
        const dispositivoId = await obtenerIdDispositivo();
        return db.withTransaction(async (consultar) => {
            const actual = await consultar(
                "SELECT * FROM ficha WHERE id_ficha = ?", [id]
            );
            const anterior = actual.rows[0];
            if (!anterior) return;
            const syncId = anterior.sync_id || randomUUID();
            const versionBase = Number(anterior.sync_version || 1);
            const versionResultado = versionBase + 1;
            const asignaciones = [
                "sync_id = ?", "sync_version = ?", "sync_deleted_at = NULL"
            ];
            const parametros = [syncId, versionResultado];
            const sqlConSync = sql.replace(
                " WHERE id_ficha = ?",
                ", " + asignaciones.join(", ") + " WHERE id_ficha = ?"
            );
            parametros.push(...valores);
            // Los metadatos se agregan al final del UPDATE, antes del WHERE.
            const consultaFinal = sql.replace(
                " WHERE id_ficha = ?",
                ", sync_id = ?, sync_version = ?, sync_deleted_at = NULL WHERE id_ficha = ?"
            );
            await consultar(consultaFinal, [
                ...valores.slice(0, datos.imagen ? 7 : 6),
                syncId, versionResultado, id
            ]);
            await registrarEvento(consultar, {
                dispositivoId, entidad: "ficha", operacion: "UPDATE",
                syncId, versionBase, versionResultado,
                payload: {
                    id_menu: datos.id_menu, titulo: datos.titulo,
                    resumen: datos.resumen ?? null, texto: datos.texto ?? null,
                    imagen: datos.imagen || anterior.imagen || null,
                    datos_json: datos.datos_json ?? null,
                    visible: datos.visible ?? anterior.visible
                }
            });
        });
    }

    return new Promise((resolve, reject) => {
        db.run(sql, valores, function(error) {
            if (error) reject(error);
            else resolve();
        });
    });
};

// =======================================================
// ELIMINAR FICHA
// =======================================================
//
// Elimina una ficha utilizando su identificador.
//
// La validación de si puede eliminarse
// corresponde al controlador.
//

const eliminar = (id) => {

    return new Promise((resolve,reject)=>{

        db.run(
            `
            DELETE FROM ficha
            WHERE id_ficha = ?
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
// OBTENER FICHA POR ID
// =======================================================
//
// Busca una ficha específica.
//
// Recibe:
// - id de ficha.
//
// Retorna:
// Una ficha encontrada.
//

const obtenerPorId = (id)=>{


    return new Promise((resolve,reject)=>{


        db.get(

            `
            SELECT *
            FROM ficha
            WHERE id_ficha = ?
            `,

            [id],


            (error,fila)=>{


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
// CONTAR MULTIMEDIA DE UNA FICHA
// =======================================================
//
// Cuenta la cantidad de archivos multimedia
// asociados a una ficha.
//
// Se utiliza antes de eliminar una ficha
// para evitar eliminar contenido relacionado.
//

const contarMultimedia = (id)=>{

    return new Promise((resolve,reject)=>{

        db.get(

            `
            SELECT COUNT(*) AS cantidad
            FROM multimedia
            WHERE id_ficha = ?
            `,

            [id],

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


const eliminarRelaciones = (id_ficha)=>{

    return new Promise((resolve,reject)=>{

        db.run(

            `
            DELETE FROM relacion_ficha
            WHERE id_ficha_origen = ?
               OR id_ficha_destino = ?
            `,

            [id_ficha, id_ficha],

            function(error){

                if(error){

                    reject(error);

                }else{

                    resolve();

                }

            }

        );

    });

};




// =======================================================
// EXPORTACIÓN DEL MODELO
// =======================================================
//
// Exporta las funciones para que puedan ser utilizadas
// por los controladores.
//

const eliminarCompleta = async (id) => db.withTransaction(async (consultar) => {
    const resultado = await consultar("SELECT COUNT(*) AS cantidad FROM multimedia WHERE id_ficha = ?", [id]);
    const cantidad = Number(resultado.rows[0]?.cantidad || 0);
    if (cantidad > 0) return { eliminada: false, multimedia: cantidad };

    await consultar("DELETE FROM relacion_ficha WHERE id_ficha_origen = ? OR id_ficha_destino = ?", [id, id]);
    await consultar("DELETE FROM ficha_etiqueta WHERE id_ficha = ?", [id]);
    const eliminacion = await consultar("DELETE FROM ficha WHERE id_ficha = ?", [id]);
    return { eliminada: eliminacion.rowCount > 0, multimedia: 0 };
});

module.exports = {

    obtenerFichas,

    obtenerFichasPorMenu,

    crear,

    actualizar,

    eliminar,

    obtenerPorId,

    contarMultimedia,

    eliminarRelaciones,
    eliminarCompleta

};