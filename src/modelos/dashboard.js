const db = require("../database");


// =======================================================
// RESUMEN GENERAL DEL SISTEMA
// =======================================================

const obtenerResumen = ()=>{

    return new Promise((resolve,reject)=>{

        const sql = `

        SELECT

        (SELECT COUNT(*) FROM menu) AS menus,

        (SELECT COUNT(*) FROM ficha) AS fichas,

        (SELECT COUNT(*) FROM plantilla) AS plantillas,

        (SELECT COUNT(*) FROM etiqueta) AS etiquetas,

        (SELECT COUNT(*) FROM multimedia) AS multimedia

        `;

        db.get(sql,[],(error,fila)=>{

            if(error){

                reject(error);
                return;

            }

            resolve(fila);

        });

    });

};



// =======================================================
// ÚLTIMAS FICHAS CREADAS
// =======================================================

const ultimasFichas = ()=>{

    return new Promise((resolve,reject)=>{

        db.all(

            `
            SELECT

                id_ficha,
                titulo,
                creado

            FROM ficha

            ORDER BY creado DESC

            LIMIT 5

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
// ÚLTIMOS MENÚS MODIFICADOS
// =======================================================

const ultimosMenus = ()=>{

    return new Promise((resolve,reject)=>{

        db.all(

            `
            SELECT

                id_menu,
                nombre,
                actualizado

            FROM menu

            ORDER BY actualizado DESC

            LIMIT 5

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
// CANTIDAD DE MULTIMEDIA POR TIPO
// =======================================================

const multimediaPorTipo = ()=>{

    return new Promise((resolve,reject)=>{

        db.all(

            `
            SELECT

                tipo_multi,
                COUNT(*) cantidad

            FROM multimedia

            GROUP BY tipo_multi

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
// CANTIDAD DE FICHAS POR MENÚ
// =======================================================

const fichasPorMenu = ()=>{

    return new Promise((resolve,reject)=>{

        db.all(

            `
            SELECT

                menu.nombre,
                COUNT(ficha.id_ficha) AS cantidad

            FROM menu

            LEFT JOIN ficha
            ON ficha.id_menu = menu.id_menu

            GROUP BY menu.id_menu

            ORDER BY cantidad DESC

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
// ESTADO DE VISIBILIDAD
// =======================================================
//
// Devuelve:
//
// menus
// fichas
// etiquetas
// multimedia
//
// con cantidad visible/activa y oculta/inactiva.
// =======================================================

const estadoContenido = ()=>{

    return new Promise((resolve,reject)=>{

        const sql = `

        SELECT

            'menus' AS tipo,

            COALESCE(
                SUM(
                    CASE
                        WHEN visible = 1 THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS visibles,

            COALESCE(
                SUM(
                    CASE
                        WHEN visible = 0 THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS no_visibles

        FROM menu


        UNION ALL


        SELECT

            'fichas' AS tipo,

            COALESCE(
                SUM(
                    CASE
                        WHEN visible = 1 THEN 1
                        ELSE 0
                    END
                ),
                0
            ),

            COALESCE(
                SUM(
                    CASE
                        WHEN visible = 0 THEN 1
                        ELSE 0
                    END
                ),
                0
            )

        FROM ficha


        UNION ALL


        SELECT

            'etiquetas' AS tipo,

            COALESCE(
                SUM(
                    CASE
                        WHEN activo = 1 THEN 1
                        ELSE 0
                    END
                ),
                0
            ),

            COALESCE(
                SUM(
                    CASE
                        WHEN activo = 0 THEN 1
                        ELSE 0
                    END
                ),
                0
            )

        FROM etiqueta


        UNION ALL


        SELECT

            'multimedia' AS tipo,

            COALESCE(
                SUM(
                    CASE
                        WHEN activo = 1 THEN 1
                        ELSE 0
                    END
                ),
                0
            ),

            COALESCE(
                SUM(
                    CASE
                        WHEN activo = 0 THEN 1
                        ELSE 0
                    END
                ),
                0
            )

        FROM multimedia

        `;

        db.all(

            sql,
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
// ELEMENTOS OCULTOS / INACTIVOS
// =======================================================
//
// Obtiene los registros concretos que están ocultos.
//
// Menús       -> visible = 0
// Fichas      -> visible = 0
// Etiquetas   -> activo = 0
// Multimedia  -> activo = 0
// =======================================================

const contenidoOculto = ()=>{

    return new Promise((resolve,reject)=>{

        const consultas = [

            // -------------------------------------------
            // MENÚS
            // -------------------------------------------

            new Promise((resolve,reject)=>{

                db.all(

                    `
                    SELECT

                        id_menu AS id,
                        nombre AS nombre,
                        'menus' AS tipo

                    FROM menu

                    WHERE visible = 0

                    ORDER BY nombre ASC

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

            }),


            // -------------------------------------------
            // FICHAS
            // -------------------------------------------

            new Promise((resolve,reject)=>{

                db.all(

                    `
                    SELECT

                        id_ficha AS id,
                        titulo AS nombre,
                        'fichas' AS tipo

                    FROM ficha

                    WHERE visible = 0

                    ORDER BY titulo ASC

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

            }),


            // -------------------------------------------
            // ETIQUETAS
            // -------------------------------------------

            new Promise((resolve,reject)=>{

                db.all(

                    `
                    SELECT

                        id_etiqueta AS id,
                        nombre AS nombre,
                        'etiquetas' AS tipo

                    FROM etiqueta

                    WHERE activo = 0

                    ORDER BY nombre ASC

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

            }),


            // -------------------------------------------
            // MULTIMEDIA
            // -------------------------------------------

            new Promise((resolve,reject)=>{

                db.all(

                    `
                    SELECT

                        id_multi AS id,

                        COALESCE(
                            descripcion,
                            tipo_multi
                        ) AS nombre,

                        tipo_multi AS subtitulo,

                        'multimedia' AS tipo

                    FROM multimedia

                    WHERE activo = 0

                    ORDER BY id_multi DESC

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

            })

        ];


        Promise.all(consultas)

            .then(resultados=>{

                resolve({

                    menus: resultados[0],

                    fichas: resultados[1],

                    etiquetas: resultados[2],

                    multimedia: resultados[3]

                });

            })

            .catch(error=>{

                reject(error);

            });

    });

};



// =======================================================
// EXPORTACIÓN
// =======================================================

module.exports = {

    obtenerResumen,

    ultimasFichas,

    ultimosMenus,

    multimediaPorTipo,

    fichasPorMenu,

    estadoContenido,

    contenidoOculto

};