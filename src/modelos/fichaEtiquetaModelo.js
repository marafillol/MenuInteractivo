
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

        static reemplazar(idFicha, etiquetas) {
        const idFichaNumerico = Number(idFicha);
        if (!Number.isSafeInteger(idFichaNumerico) || idFichaNumerico <= 0) {
            throw new TypeError("La ficha debe tener un ID entero positivo.");
        }
        if (!Array.isArray(etiquetas)) {
            throw new TypeError("Las etiquetas deben enviarse como un arreglo.");
        }

        const listaEtiquetas = etiquetas.map((idEtiqueta) => {
            const id = Number(idEtiqueta);
            if (!Number.isSafeInteger(id) || id <= 0) {
                throw new TypeError("Cada etiqueta debe tener un ID entero positivo.");
            }
            return id;
        });

        if (typeof db.transaction === "function") {
            return db.transaction(async (tx) => {
                await tx.query(
                    `DELETE FROM ficha_etiqueta WHERE id_ficha = ?`,
                    [idFichaNumerico]
                );

                for (const idEtiqueta of listaEtiquetas) {
                    await tx.query(
                        `INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES (?, ?)`,
                        [idFichaNumerico, idEtiqueta]
                    );
                }

                return true;
            });
        }

        // SQLite conserva su implementación compatible con sqlite3.
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run(
                    `DELETE FROM ficha_etiqueta WHERE id_ficha = ?`,
                    [idFichaNumerico],
                    (error) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        if (listaEtiquetas.length === 0) {
                            resolve(true);
                            return;
                        }

                        const sentencia = db.prepare(
                            `INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES (?, ?)`
                        );

                        listaEtiquetas.forEach((idEtiqueta) => {
                            sentencia.run(idFichaNumerico, idEtiqueta);
                        });

                        sentencia.finalize((errorFinal) => {
                            if (errorFinal) {
                                reject(errorFinal);
                            } else {
                                resolve(true);
                            }
                        });
                    }
                );
            });
        });
    }



    // =======================================================
    // OBTENER FICHAS DE UNA ETIQUETA
    // =======================================================
    //
    // Obtiene todas las fichas asociadas a una etiqueta.
    //
    // Recibe:
    // - idEtiqueta: identificador de la etiqueta.
    //
    // Retorna:
    // - Lista de fichas relacionadas con esa etiqueta.
    //

    static obtenerPorEtiqueta(idEtiqueta){

        return new Promise((resolve,reject)=>{

            db.all(
                `
                SELECT
                    f.*
                FROM ficha_etiqueta fe

                INNER JOIN ficha f
                    ON fe.id_ficha = f.id_ficha

                WHERE fe.id_etiqueta = ?

                ORDER BY f.id_ficha
                `,
                [idEtiqueta],
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
    // ELIMINAR TODAS LAS ETIQUETAS DE UNA FICHA
    // ===================================================

    static eliminarRelacionesFicha(idFicha){

        return new Promise((resolve,reject)=>{


            db.run(

                `
                DELETE FROM ficha_etiqueta
                WHERE id_ficha = ?
                `,

                [idFicha],

                function(error){

                    if(error){

                        reject(error);

                    }else{

                        resolve(true);

                    }

                }

            );


        });

    }


    // ===================================================
    // ELIMINAR TODAS LAS RELACIONES DE UNA ETIQUETA
    // ===================================================

    static eliminarEtiquetasRelacionadas(idEtiqueta){

        return new Promise((resolve,reject)=>{

            db.run(
                `
                DELETE
                FROM ficha_etiqueta
                WHERE id_etiqueta = ?
                `,
                [idEtiqueta],
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

}











// =======================================================
// EXPORTACIÓN DEL MODELO
// =======================================================
//
// Permite utilizar este modelo desde controladores
// u otros módulos del backend.
//

module.exports = FichaEtiqueta;