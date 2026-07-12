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







// =======================================================
// OBTENER TODAS LAS PLANTILLAS ACTIVAS
// =======================================================
//
// Obtiene todas las plantillas disponibles.
//
// Filtra solamente aquellas que tienen:
//
// activo = 1
//
// Ordena los resultados por nombre.
//
// Se utiliza principalmente para mostrar las plantillas
// disponibles en el panel administrativo.
//

const obtenerPlantillas = ()=>{

    return new Promise((resolve,reject)=>{


        db.all(

            `
            SELECT *
            FROM plantilla
            WHERE activo = 1
            ORDER BY nombre
            `,

            [],


            (error,filas)=>{


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

const obtenerPorId = (id)=>{

    return new Promise((resolve,reject)=>{


        db.get(

            `
            SELECT *
            FROM plantilla
            WHERE id_plantilla = ?
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

const obtenerPorMenu = (id_menu)=>{

    return new Promise((resolve,reject)=>{


        db.get(

            `
            SELECT
                plantilla.*
            FROM menu

            INNER JOIN plantilla
                ON menu.id_plantilla = plantilla.id_plantilla

            WHERE menu.id_menu = ?
            `,


            [id_menu],


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

const crear = (datos)=>{

    return new Promise((resolve,reject)=>{


        db.run(

            `
            INSERT INTO plantilla
            (

                nombre,
                descripcion,
                plantilla_json,
                activo

            )

            VALUES

            (

                ?, ?, ?, ?

            )
            `,


            [

                datos.nombre,

                datos.descripcion,

                datos.plantilla_json,

                datos.activo

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

const actualizar = (id,datos)=>{

    return new Promise((resolve,reject)=>{


        db.run(

            `
            UPDATE plantilla

            SET

                nombre = ?,
                descripcion = ?,
                plantilla_json = ?,
                activo = ?,
                actualizado = CURRENT_TIMESTAMP

            WHERE id_plantilla = ?
            `,


            [

                datos.nombre,

                datos.descripcion,

                datos.plantilla_json,

                datos.activo,

                id

            ],


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

const eliminar = (id) => {


    return new Promise((resolve, reject)=>{


        db.run(

            `
            DELETE FROM plantilla
            WHERE id_plantilla = ?
            `,

            [id],


            function(err){


                if(err){

                    reject(err);

                    return;

                }


                resolve({

                    eliminado: this.changes > 0

                });


            }


        );


    });

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

module.exports = {


    obtenerPlantillas,

    obtenerPorId,

    obtenerPorMenu,

    crear,

    actualizar,

    eliminar,

    contarMenus


};