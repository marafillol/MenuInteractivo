// =======================================================
// MODELO ETIQUETA
// =======================================================
//
// Este modelo representa la entidad Etiqueta del sistema.
//
// Su responsabilidad es:
// - Realizar consultas sobre la tabla etiqueta.
// - Crear, consultar, modificar y eliminar etiquetas.
// - Devolver información obtenida desde la base de datos.
//
// No maneja:
// - Peticiones HTTP.
// - Respuestas al cliente.
// - Lógica de interfaz.
//

const db = require("../database");




// =======================================================
// CLASE ETIQUETA
// =======================================================
//
// Contiene todas las operaciones relacionadas
// con la tabla "etiqueta".
//

class Etiqueta {





    // ===================================================
    // OBTENER TODAS LAS ETIQUETAS
    // ===================================================
    //
    // Consulta todas las etiquetas almacenadas.
    //
    // Ordena los resultados alfabéticamente
    // utilizando el nombre de la etiqueta.
    //
    // Retorna:
    // Array de etiquetas.
    //

    static obtenerTodas(){

        return new Promise((resolve,reject)=>{

            db.all(
                `
                SELECT *
                FROM etiqueta
                ORDER BY nombre
                `,
                [],
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
    // CREAR ETIQUETA
    // ===================================================
    //
    // Inserta una nueva etiqueta en la base de datos.
    //
    // Recibe:
    // - nombre
    // - descripcion
    // - activo
    //
    // Retorna:
    // La etiqueta creada junto con su ID generado.
    //

    static crear(datos){

        return new Promise((resolve,reject)=>{

            db.run(
            `
            INSERT INTO etiqueta
            (
                nombre,
                descripcion,
                activo
            )
            VALUES (?,?,?)
            `,
            [
                datos.nombre,
                datos.descripcion,
                datos.activo
            ],
                function(error){

                    if(error)

                        reject(error);

                    else

                        resolve({

                            id_etiqueta:this.lastID,

                            ...datos

                        });

                }
            );

        });

    }






    // ===================================================
    // OBTENER ETIQUETA POR ID
    // ===================================================
    //
    // Busca una etiqueta específica utilizando
    // su identificador único.
    //
    // Recibe:
    // ID de la etiqueta.
    //
    // Retorna:
    // Una etiqueta encontrada.
    //

    static obtenerPorId(id){

        return new Promise((resolve,reject)=>{

            db.get(
                `
                SELECT *
                FROM etiqueta
                WHERE id_etiqueta=?
                `,
                [id],
                (error,fila)=>{

                    if(error)

                        reject(error);

                    else

                        resolve(fila);

                }
            );

        });

    }






    // ===================================================
    // EDITAR ETIQUETA
    // ===================================================
    //
    // Actualiza los datos de una etiqueta existente.
    //
    // Modifica:
    // - Nombre.
    // - Descripción.
    // - Estado activo.
    //
    // Recibe:
    // - ID de etiqueta.
    // - Nuevos datos.
    //
    // Retorna:
    // La etiqueta actualizada.
    //

    static editar(id,datos){

        return new Promise((resolve,reject)=>{

            db.run(
            `
            UPDATE etiqueta
            SET nombre=?,
                descripcion=?,
                activo=?
            WHERE id_etiqueta=?
            `,
            [
                datos.nombre,
                datos.descripcion,
                datos.activo,
                id
            ],
                function(error){

                    if(error)

                        reject(error);

                    else

                        resolve({

                            id_etiqueta:id,

                            ...datos

                        });

                }
            );


        });

    }






    // ===================================================
    // ELIMINAR ETIQUETA
    // ===================================================
    //
    // Elimina una etiqueta utilizando su ID.
    //
    // Recibe:
    // ID de la etiqueta a eliminar.
    //
    // Retorna:
    // Confirmación de eliminación.
    //

    static eliminar(id){

        return new Promise((resolve,reject)=>{

            db.run(
                `
                DELETE FROM etiqueta
                WHERE id_etiqueta=?
                `,
                [id],
                function(error){

                    if(error)

                        reject(error);

                    else

                        resolve({

                            eliminado:true

                        });

                }
            );


        });

    }


}



// =======================================================
// EXPORTACIÓN DEL MODELO
// =======================================================
//
// Permite utilizar la clase Etiqueta desde
// controladores u otros módulos del backend.
//

module.exports = Etiqueta;