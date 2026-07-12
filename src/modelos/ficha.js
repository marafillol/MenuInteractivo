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

const crear = (datos) => {

    return new Promise((resolve, reject) => {


        const {

            id_menu,

            titulo,

            resumen,

            texto,

            imagen,

            datos_json,

            visible

        } = datos;



        db.run(
            `
            INSERT INTO ficha
            (
                id_menu,
                titulo,
                resumen,
                texto,
                imagen,
                datos_json,
                visible,
                creado
            )
            VALUES (?, ?, ?, ?, ?, ?, ?,datetime('now','-3 hours'))
            `,
            [

                id_menu,

                titulo,

                resumen || null,

                texto || null,

                imagen || null,

                datos_json || null,

                visible ?? 1

            ],

            function(error) {


                if(error){

                    reject(error);

                }

                else{

                    resolve(this.lastID);

                }

            }

        );

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

const actualizar = (id, datos) => {

    return new Promise((resolve,reject)=>{


        let sql = `

            UPDATE ficha

            SET

                id_menu = ?,

                titulo = ?,

                resumen = ?,

                texto = ?,

                visible = ?,

                datos_json = ?,

                actualizado = datetime('now','-3 hours')

        `;



        let valores = [

            datos.id_menu,

            datos.titulo,

            datos.resumen,

            datos.texto,

            datos.visible,

            datos.datos_json

        ];





        // Si llega una imagen nueva,
        // se agrega al UPDATE.
        //
        // Si no llega imagen,
        // conserva la existente.

        if(datos.imagen){


            sql += `,

                imagen = ?

            `;


            valores.push(datos.imagen);


        }





        sql += `

            WHERE id_ficha = ?

        `;


        valores.push(id);





        db.run(

            sql,

            valores,


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






// =======================================================
// EXPORTACIÓN DEL MODELO
// =======================================================
//
// Exporta las funciones para que puedan ser utilizadas
// por los controladores.
//

module.exports = {

    obtenerFichas,

    obtenerFichasPorMenu,

    crear,

    actualizar,

    eliminar,

    obtenerPorId,

    contarMultimedia

};