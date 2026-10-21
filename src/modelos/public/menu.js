const db = require("../../database");


// =======================================================
// OBTENER MENÚS VISIBLES
// =======================================================

const obtenerMenus = () => {

    return new Promise((resolve,reject)=>{

        db.all(

            `

            SELECT
                menu.id_menu,
                menu.nombre,
                menu.descripcion,
                menu.imagen,
                menu.id_plantilla,
                plantilla.plantilla_json
            FROM menu
            LEFT JOIN plantilla
                ON menu.id_plantilla = plantilla.id_plantilla
            WHERE menu.visible = 1
            ORDER BY menu.nombre

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
