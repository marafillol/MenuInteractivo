const db = require("../../database");

// =======================================================
// OBTENER TODAS LAS FICHAS VISIBLES
// =======================================================

const obtenerTodas = () => {

    return new Promise((resolve,reject)=>{

        db.all(

            `
            SELECT

                ficha.id_ficha,
                ficha.id_menu,
                ficha.titulo,
                ficha.resumen,
                ficha.imagen,
                ficha.datos_json,

                menu.nombre AS menu,

                plantilla.plantilla_json

            FROM ficha

            INNER JOIN menu
                ON ficha.id_menu = menu.id_menu

            INNER JOIN plantilla
                ON menu.id_plantilla = plantilla.id_plantilla

            WHERE

                ficha.visible = 1
                AND menu.visible = 1

            ORDER BY ficha.titulo
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




// =======================================================
// OBTENER FICHAS POR MENÚ
// =======================================================

const obtenerPorMenu = (id_menu)=>{

    return new Promise((resolve,reject)=>{

        db.all(

            `
            SELECT

                ficha.id_ficha,
                ficha.id_menu,
                ficha.titulo,
                ficha.resumen,
                ficha.imagen,
                ficha.datos_json,

                menu.nombre AS menu,

                plantilla.plantilla_json

            FROM ficha

            INNER JOIN menu
                ON ficha.id_menu = menu.id_menu

            INNER JOIN plantilla
                ON menu.id_plantilla = plantilla.id_plantilla

            WHERE

                ficha.id_menu = ?

                AND ficha.visible = 1

                AND menu.visible = 1

            ORDER BY ficha.titulo
            `,

            [id_menu],

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


// =======================================================
// OBTENER UNA FICHA POR ID
// =======================================================

const obtenerPorId = (id_ficha)=>{

    return new Promise((resolve,reject)=>{

        db.get(

            `
            SELECT

                ficha.id_ficha,
                ficha.id_menu,
                ficha.titulo,
                ficha.resumen,
                ficha.texto,
                ficha.imagen,
                ficha.datos_json,

                menu.nombre AS menu,

                plantilla.plantilla_json

            FROM ficha

            INNER JOIN menu
                ON ficha.id_menu = menu.id_menu

            INNER JOIN plantilla
                ON menu.id_plantilla = plantilla.id_plantilla

            WHERE

                ficha.id_ficha = ?
                AND ficha.visible = 1
                AND menu.visible = 1

            `,

            [id_ficha],

            (error,fila)=>{

                if(error){

                    reject(error);

                }

                else{

                    resolve(fila);

                }

            }

        );

    });

};

const obtenerRelacionadas = (id_ficha)=>{

    return new Promise((resolve,reject)=>{

        db.all(

            `
            SELECT

                ficha.id_ficha,
                ficha.titulo,
                ficha.imagen,
                menu.nombre AS menu,

                relacion_ficha.tipo_relacion

            FROM relacion_ficha

            INNER JOIN ficha

            ON ficha.id_ficha =

            CASE

                WHEN relacion_ficha.id_ficha_origen = ?
                THEN relacion_ficha.id_ficha_destino

                ELSE relacion_ficha.id_ficha_origen

            END

            INNER JOIN menu
            ON ficha.id_menu = menu.id_menu

            WHERE

            (
                relacion_ficha.id_ficha_origen = ?
                OR
                relacion_ficha.id_ficha_destino = ?
            )

            AND ficha.visible = 1
            AND menu.visible = 1

            ORDER BY ficha.titulo
            `,

            [id_ficha, id_ficha, id_ficha],

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


const obtenerEtiquetas = (id_ficha)=>{

    return new Promise((resolve,reject)=>{

        db.all(

            `
            SELECT

                etiqueta.id_etiqueta,
                etiqueta.nombre

            FROM ficha_etiqueta

            INNER JOIN etiqueta

                ON etiqueta.id_etiqueta =
                ficha_etiqueta.id_etiqueta

            WHERE

                ficha_etiqueta.id_ficha = ?

                AND etiqueta.activo = 1

            ORDER BY etiqueta.nombre
            `,

            [id_ficha],

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





const obtenerMultimedia = (id_ficha)=>{

    console.log("BUSCANDO MULTIMEDIA PARA FICHA:", id_ficha);

    return new Promise((resolve,reject)=>{

        db.all(

            `
            SELECT

                id_multi,
                id_ficha,
                descripcion,
                ruta_archivo,
                tipo_multi

            FROM multimedia

            WHERE

                id_ficha = ?

                AND activo = 1

            ORDER BY id_multi
            `,

            [id_ficha],

            (error,filas)=>{

                console.log("RESULTADO MULTIMEDIA:", filas);

                if(error){

                    reject(error);

                }else{

                    resolve(filas);

                }

            }

        );

    });

};

module.exports={

    obtenerTodas,
    obtenerPorMenu,
    obtenerPorId,
    obtenerEtiquetas,
    obtenerRelacionadas,
    obtenerMultimedia

};