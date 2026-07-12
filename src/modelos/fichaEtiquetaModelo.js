
// =======================================================
// MODELO FICHA - ETIQUETA
// =======================================================
//
// Este modelo administra la relación entre fichas y etiquetas.
//
// La tabla ficha_etiqueta representa una relación muchos a muchos:
//
//      ficha
//        |
//        |
// ficha_etiqueta
//        |
//        |
//     etiqueta
//
// Una ficha puede tener varias etiquetas.
// Una etiqueta puede pertenecer a varias fichas.
//
// Responsabilidades:
// - Obtener etiquetas asociadas a una ficha.
// - Reemplazar las etiquetas asignadas a una ficha.
//
// No maneja:
// - Peticiones HTTP.
// - Respuestas al cliente.
// - Lógica de interfaz.
//

const db = require("../database");






// =======================================================
// CLASE FICHA ETIQUETA
// =======================================================
//
// Contiene las operaciones relacionadas con la tabla
// intermedia ficha_etiqueta.
//

class FichaEtiqueta {






    // ===================================================
    // OBTENER ETIQUETAS DE UNA FICHA
    // ===================================================
    //
    // Obtiene todas las etiquetas relacionadas
    // con una ficha específica.
    //
    // Recibe:
    // - idFicha: identificador de la ficha.
    //
    // Retorna:
    // Lista de etiquetas asociadas.
    //
    // Ejemplo:
    //
    // Ficha:
    //   Soldado Juan
    //
    // Etiquetas:
    //   - Malvinas
    //   - Historia
    //   - Militar
    //

    static obtenerPorFicha(idFicha){

        return new Promise((resolve,reject)=>{

            db.all(
                `
                SELECT
                    e.id_etiqueta,
                    e.nombre,
                    e.descripcion,
                    e.activo
                FROM ficha_etiqueta fe
                INNER JOIN etiqueta e
                    ON fe.id_etiqueta = e.id_etiqueta
                WHERE fe.id_ficha = ?
                ORDER BY e.nombre
                `,
                [idFicha],
                (error, filas)=>{

                    if(error)

                        reject(error);

                    else

                        resolve(filas);

                }
            );

        });

    }








    // ===================================================
    // REEMPLAZAR ETIQUETAS DE UNA FICHA
    // ===================================================
    //
    // Actualiza las etiquetas asociadas a una ficha.
    //
    // Funcionamiento:
    //
    // 1) Elimina todas las relaciones actuales.
    //
    // 2) Inserta nuevamente las etiquetas recibidas.
    //
    //
    // Ejemplo:
    //
    // Antes:
    //
    // Ficha 1
    //  - Historia
    //  - Militar
    //
    //
    // Nuevas etiquetas:
    //
    //  - Historia
    //  - Museo
    //
    //
    // Resultado:
    //
    // Ficha 1
    //  - Historia
    //  - Museo
    //
    //
    // Recibe:
    // - idFicha: identificador de ficha.
    // - etiquetas: arreglo con IDs de etiquetas.
    //

    static reemplazar(idFicha, etiquetas){

        return new Promise((resolve,reject)=>{

            db.serialize(()=>{



                // ---------------------------------------
                // ELIMINAR RELACIONES EXISTENTES
                // ---------------------------------------

                db.run(
                    `
                    DELETE
                    FROM ficha_etiqueta
                    WHERE id_ficha=?
                    `,
                    [idFicha],
                    (error)=>{

                        if(error){

                            reject(error);

                            return;

                        }





                        // ---------------------------------------
                        // SI NO HAY ETIQUETAS NUEVAS
                        // FINALIZA LA OPERACIÓN
                        // ---------------------------------------

                        if(etiquetas.length===0){

                            resolve(true);

                            return;

                        }






                        // ---------------------------------------
                        // INSERTAR NUEVAS RELACIONES
                        // ---------------------------------------

                        const consulta =
                        `
                        INSERT INTO ficha_etiqueta
                        (
                            id_ficha,
                            id_etiqueta
                        )
                        VALUES (?,?)
                        `;




                        // Sentencia preparada para
                        // insertar múltiples relaciones.

                        const sentencia =
                        db.prepare(consulta);






                        etiquetas.forEach(idEtiqueta=>{


                            sentencia.run(

                                idFicha,

                                idEtiqueta

                            );


                        });






                        // Finaliza la sentencia preparada

                        sentencia.finalize((error)=>{


                            if(error)

                                reject(error);

                            else

                                resolve(true);


                        });



                    }

                );

            });

        });

    }



}








// =======================================================
// EXPORTACIÓN DEL MODELO
// =======================================================
//
// Permite utilizar este modelo desde controladores
// u otros módulos del backend.
//

module.exports = FichaEtiqueta;