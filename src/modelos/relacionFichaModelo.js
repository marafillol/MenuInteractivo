
// =======================================================
// MODELO RELACION FICHA
// =======================================================
//
// Este modelo administra las relaciones entre fichas.
//
// La tabla relacion_ficha funciona como tabla intermedia
// para relacionar una ficha con otra.
//
// Estructura:
//
//              ficha
//                |
//                |
//        relacion_ficha
//                |
//                |
//              ficha
//
//
// Una ficha puede tener múltiples relaciones con otras
// fichas.
//
// Ejemplo:
//
// Ficha:
// "Soldado Juan"
//
// Relaciones:
//
// - Participó en → "Batalla de Malvinas"
// - Pertenece a → "Unidad Militar"
//
//
// Responsabilidades:
// - Obtener relaciones de una ficha.
// - Guardar relaciones asociadas.
// - Eliminar relaciones.
//
// No maneja:
// - Peticiones HTTP.
// - Respuestas al cliente.
// - Lógica de interfaz.
//
// La comunicación se realiza mediante SQLite.
//

const db = require("../database");








// =======================================================
// CLASE RELACION FICHA
// =======================================================
//
// Contiene las operaciones relacionadas con la tabla
// relacion_ficha.
//

class RelacionFicha {








    // ===================================================
    // OBTENER RELACIONES DE UNA FICHA
    // ===================================================
    //
    // Obtiene todas las fichas relacionadas con una ficha
    // origen determinada.
    //
    // Recibe:
    // - idFicha: identificador de la ficha origen.
    //
    // Retorna:
    // Lista de relaciones incluyendo:
    // - ID de relación.
    // - Ficha destino.
    // - Tipo de relación.
    // - Título de ficha destino.
    //

    static obtenerRelaciones(idFicha){

        return new Promise((resolve,reject)=>{


            db.all(

                `
                SELECT

                    rf.id_relacion,

                    CASE

                        WHEN rf.id_ficha_origen = ?

                        THEN rf.id_ficha_destino

                        ELSE rf.id_ficha_origen

                    END AS id_ficha_destino,


                    rf.tipo_relacion,


                    CASE

                        WHEN rf.id_ficha_origen = ?

                        THEN ficha_destino.titulo

                        ELSE ficha_origen.titulo

                    END AS titulo


                FROM relacion_ficha rf



                LEFT JOIN ficha AS ficha_origen

                ON ficha_origen.id_ficha = rf.id_ficha_origen



                LEFT JOIN ficha AS ficha_destino

                ON ficha_destino.id_ficha = rf.id_ficha_destino



                WHERE

                    rf.id_ficha_origen = ?

                    OR rf.id_ficha_destino = ?



                ORDER BY titulo

                `,


                [
                    idFicha,
                    idFicha,
                    idFicha,
                    idFicha
                ],



                (error,filas)=>{


                    if(error){

                        reject(error);

                    }else{

                        resolve(filas);

                    }


                }


            );


        });

    }



    static eliminarRelacionesFicha(idFicha){

        console.log("BORRANDO RELACIONES DE:", idFicha);

        return new Promise((resolve,reject)=>{

            db.run(

                `
                DELETE FROM relacion_ficha
                WHERE id_ficha_origen = ?
                OR id_ficha_destino = ?
                `,

                [
                    idFicha,
                    idFicha
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

    }





    // ===================================================
    // AGREGAR RELACIONES A UNA FICHA
    // ===================================================
    //
    // Inserta las relaciones nuevas recibidas desde el panel.
    // Las relaciones que se quitaron se eliminan por separado
    // mediante eliminarRelacion(), por lo que esta función
    // no debe borrar relaciones existentes.
    //
    // Recibe:
    // - idFicha: ficha origen.
    // - relaciones: lista de relaciones nuevas.
    //

    static guardarRelaciones(idFicha, relaciones) {
        return new Promise((resolve, reject) => {
            if (!Array.isArray(relaciones)) {
                reject(new TypeError("Las relaciones deben enviarse como una lista."));
                return;
            }

            if (relaciones.length === 0) {
                resolve();
                return;
            }

            try {
                db.serialize(() => {
                    const sentencia = db.prepare(
                        `
                        INSERT INTO relacion_ficha
                        (
                            id_ficha_origen,
                            id_ficha_destino,
                            tipo_relacion
                        )
                        VALUES (?, ?, ?)
                        `
                    );

                    relaciones.forEach((relacion) => {
                        sentencia.run(
                            idFicha,
                            relacion.id_ficha_destino,
                            relacion.tipo_relacion
                        );
                    });

                    sentencia.finalize((error) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });
            } catch (error) {
                reject(error);
            }
        });
    }


    // ===================================================
    // ELIMINAR RELACIÓN
    // ===================================================
    //
    // Elimina una relación específica utilizando
    // su identificador.
    //
    // Recibe:
    // - idRelacion.
    //

    static eliminarRelacion(idRelacion){

        return new Promise((resolve,reject)=>{


            db.get(

                `
                SELECT
                    id_ficha_origen,
                    id_ficha_destino
                FROM relacion_ficha
                WHERE id_relacion = ?
                `,

                [idRelacion],


                (error, relacion)=>{


                    if(error){

                        reject(error);

                        return;

                    }


                    if(!relacion){

                        resolve();

                        return;

                    }



                    db.run(

                        `
                        DELETE FROM relacion_ficha
                        WHERE
                        (
                            id_ficha_origen = ?
                            AND
                            id_ficha_destino = ?
                        )
                        OR
                        (
                            id_ficha_origen = ?
                            AND
                            id_ficha_destino = ?
                        )
                        `,


                        [

                            relacion.id_ficha_origen,
                            relacion.id_ficha_destino,

                            relacion.id_ficha_destino,
                            relacion.id_ficha_origen

                        ],


                        function(error){


                            if(error){

                                reject(error);

                            }else{

                                resolve();

                            }


                        }

                    );


                }

            );


        });

    }
}


// =======================================================
// EXPORTACIÓN DEL MODELO
// =======================================================
//
// Permite utilizar este modelo desde los controladores.
//

module.exports = RelacionFicha;