const db = require("../../database");


// =======================================================
// OBTENER TODAS LAS ETIQUETAS ACTIVAS
// =======================================================

const obtenerTodas = () => {

    return new Promise((resolve,reject)=>{

        db.all(

            `
            SELECT

                id_etiqueta,
                nombre,
                descripcion

            FROM etiqueta

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


module.exports = {

    obtenerTodas

};