const db = require("../../database");


// =======================================================
// OBTENER MENÚS VISIBLES
// =======================================================

const obtenerMenus = () => {

    return new Promise((resolve,reject)=>{

        db.all(

            `
            SELECT

                id_menu,

                nombre,

                descripcion,

                imagen

            FROM menu

            WHERE visible = 1

            ORDER BY nombre
            `,

            [],

            (error,filas)=>{

                if(error){

                    reject(error);

                }

                else{

                    resolve(filas);

                }

            }

        );

    });

};


module.exports = {

    obtenerMenus

};