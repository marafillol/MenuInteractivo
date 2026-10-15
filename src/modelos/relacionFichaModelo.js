
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
    // GUARDAR RELACIONES DE UNA FICHA
    // ===================================================
    //
    // Actualiza las relaciones de una ficha.
    //
    // Funcionamiento:
    //
    // 1) Elimina todas las relaciones actuales
    //    de la ficha origen.
    //
    // 2) Inserta nuevamente las relaciones recibidas.
    //
    //
    // Ejemplo:
    //
    // Antes:
    //
    // Ficha A
    //  |
    //  ├── Ficha B
    //  └── Ficha C
    //
    //
    // Nuevas relaciones:
    //
    //  ├── Ficha C
    //  └── Ficha D
    //
    //
    // Resultado:
    //
    // Ficha A
    //  |
    //  ├── Ficha C
    //  └── Ficha D
    //
    //
    // Recibe:
    // - idFicha: ficha origen.
    // - relaciones: arreglo de relaciones nuevas.
    //

        static guardarRelaciones(idFicha, relaciones) {
        const idFichaNumerico = Number(idFicha);
        if (!Number.isSafeInteger(idFichaNumerico) || idFichaNumerico <= 0) {
            throw new TypeError("La ficha de origen debe tener un ID entero positivo.");
        }
        if (!Array.isArray(relaciones)) {
            throw new TypeError("Las relaciones deben enviarse como un arreglo.");
        }

        const listaRelaciones = relaciones.map((relacion) => {
            if (!relacion || typeof relacion !== "object" || Array.isArray(relacion)) {
                throw new TypeError("Cada relación debe ser un objeto válido.");
            }

            const idDestino = Number(relacion.id_ficha_destino);
            if (!Number.isSafeInteger(idDestino) || idDestino <= 0) {
                throw new TypeError("Cada relación debe tener un ID de ficha destino entero positivo.");
            }

            if (relacion.tipo_relacion !== undefined &&
                relacion.tipo_relacion !== null &&
                typeof relacion.tipo_relacion !== "string") {
                throw new TypeError("El tipo de relación debe ser texto o null.");
            }

            return {
                id_ficha_destino: idDestino,
                tipo_relacion: relacion.tipo_relacion ?? null
            };
        });

        if (typeof db.transaction === "function") {
            return db.transaction(async (tx) => {
                await tx.query(
                    `DELETE FROM relacion_ficha WHERE id_ficha_origen = ?`,
                    [idFichaNumerico]
                );

                for (const relacion of listaRelaciones) {
                    await tx.query(
                        `INSERT INTO relacion_ficha (id_ficha_origen, id_ficha_destino, tipo_relacion) VALUES (?, ?, ?)`,
                        [idFichaNumerico, relacion.id_ficha_destino, relacion.tipo_relacion]
                    );
                }
            });
        }

        // SQLite conserva su implementación compatible con sqlite3.
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run(
                    `DELETE FROM relacion_ficha WHERE id_ficha_origen = ?`,
                    [idFichaNumerico],
                    (error) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        if (listaRelaciones.length === 0) {
                            resolve();
                            return;
                        }

                        const sentencia = db.prepare(
                            `INSERT INTO relacion_ficha (id_ficha_origen, id_ficha_destino, tipo_relacion) VALUES (?, ?, ?)`
                        );

                        listaRelaciones.forEach((relacion) => {
                            sentencia.run(
                                idFichaNumerico,
                                relacion.id_ficha_destino,
                                relacion.tipo_relacion
                            );
                        });

                        sentencia.finalize((errorFinal) => {
                            if (errorFinal) {
                                reject(errorFinal);
                            } else {
                                resolve();
                            }
                        });
                    }
                );
            });
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