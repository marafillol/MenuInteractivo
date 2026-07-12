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

const obtenerMultimedia = () => {

    return new Promise((resolve, reject) => {

        db.all(

            `
            SELECT
                multimedia.*,
                ficha.titulo AS ficha
            FROM multimedia
            LEFT JOIN ficha
            ON multimedia.id_ficha = ficha.id_ficha
            `,

            [],

            (error, filas) => {

                if(error){

                    reject(error);

                }else{

                    resolve(filas);

                }

            }

        );

    });

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

const crear = (datos) => {

    return new Promise((resolve,reject)=>{


        db.run(

            `
            INSERT INTO multimedia
            (
                id_ficha,
                descripcion,
                ruta_archivo,
                tipo_multi,
                miniatura,
                activo,
                creado
            )

            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,

            [

                datos.id_ficha,

                datos.descripcion,

                datos.ruta_archivo,

                datos.tipo_multi,

                datos.miniatura,

                datos.activo,

                datos.creado

            ],


            function(error){


                if(error){

                    reject(error);

                }else{

                    resolve(this.lastID);

                }

            }

        );


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

const actualizar = (id, datos) => {

    return new Promise((resolve,reject)=>{


        db.run(

            `
            UPDATE multimedia
                SET
                    id_ficha = ?,
                    descripcion = ?,
                    ruta_archivo = ?,
                    tipo_multi = ?,
                    miniatura = ?,
                    activo = ?,
                    actualizado = ?
                WHERE id_multi = ?
            `,

            [

                datos.id_ficha,

                datos.descripcion,

                datos.ruta_archivo,

                datos.tipo_multi,

                datos.miniatura,

                datos.activo,

                datos.actualizado,

                id

            ],



            function(error){


                if(error){

                    reject(error);

                }
                else if(this.changes === 0){


                    reject(
                        new Error(
                            "No se encontró la multimedia."
                        )
                    );


                }
                else{


                    resolve();


                }

            }

        );


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

const eliminar = (id) => {

    return new Promise((resolve,reject)=>{


        db.run(

            `
            DELETE FROM multimedia
            WHERE id_multi = ?
            `,

            [id],


            function(error){


                if(error){

                    reject(error);

                }
                else if(this.changes === 0){


                    reject(
                        new Error(
                            "No se encontró la multimedia."
                        )
                    );


                }
                else{


                    resolve();


                }

            }

        );


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

const obtenerPorFicha = (id_ficha) => {

    return new Promise((resolve,reject)=>{


        db.all(

            `
            SELECT *
            FROM multimedia
            WHERE id_ficha = ?
            `,

            [id_ficha],


            (error,datos)=>{


                if(error){

                    reject(error);

                }else{

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

const obtenerPorId = (id)=>{

    return new Promise((resolve,reject)=>{


        db.get(

            `
            SELECT
                multimedia.*,
                ficha.titulo AS ficha
            FROM multimedia
            LEFT JOIN ficha
            ON multimedia.id_ficha = ficha.id_ficha
            WHERE multimedia.id_multi = ?
            `,

            [id],


            (error,fila)=>{


                if(error){

                    reject(error);

                }else{

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