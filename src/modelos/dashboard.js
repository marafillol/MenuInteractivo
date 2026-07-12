// =======================================================
// MODELO DASHBOARD
// =======================================================
//
// Este modelo contiene todas las consultas SQL necesarias
// para obtener información estadística utilizada por el
// panel administrativo.
//
// Su responsabilidad es:
// - Consultar información de la base de datos.
// - Procesar datos generales del sistema.
// - Devolver resultados al controlador.
//
// No maneja:
// - Peticiones HTTP.
// - Respuestas al cliente.
// - Lógica de interfaz.
//

const db = require("../database");




// =======================================================
// RESUMEN GENERAL DEL SISTEMA
// =======================================================
//
// Obtiene la cantidad total de elementos principales
// almacenados en la base de datos:
//
// - Menús.
// - Fichas.
// - Plantillas.
// - Etiquetas.
// - Multimedia.
//
// Utilizado para mostrar tarjetas de resumen
// en el dashboard.
//

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
//
// Obtiene las últimas 5 fichas agregadas al sistema.
//
// Devuelve:
// - ID de la ficha.
// - Título.
// - Fecha de creación.
//
// Utilizado para mostrar actividad reciente
// en el panel administrativo.
//

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
//
// Obtiene los últimos 5 menús modificados.
//
// Devuelve:
// - ID del menú.
// - Nombre.
// - Fecha de actualización.
//
// Utilizado para mostrar los cambios recientes
// realizados en el sistema.
//

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
//
// Agrupa los archivos multimedia según su tipo.
//
// Ejemplo:
//
// imagen -> 50
// video  -> 10
// audio  -> 5
//
// Utilizado para generar estadísticas
// o gráficos del dashboard.
//

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
//
// Cuenta cuántas fichas pertenecen a cada menú.
//
// Utiliza LEFT JOIN para incluir también menús
// que todavía no tienen fichas asociadas.
//
// Ejemplo:
//
// Soldados        -> 50 fichas
// Fauna           -> 20 fichas
// Nuevo menú      -> 0 fichas
//

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
// ESTADO DE VISIBILIDAD DEL CONTENIDO
// =======================================================
//
// Obtiene la cantidad de elementos visibles
// y no visibles del sistema.
//
// Analiza:
//
// - Menús.
// - Fichas.
// - Etiquetas.
// - Multimedia.
//
// El resultado permite mostrar estadísticas
// sobre el contenido activo del museo.
//

const estadoContenido = ()=>{

    return new Promise((resolve,reject)=>{


        const sql = `

        SELECT

        'menus' AS tipo,

        SUM(CASE WHEN visible = 1 THEN 1 ELSE 0 END) AS visibles,

        SUM(CASE WHEN visible = 0 THEN 1 ELSE 0 END) AS no_visibles


        FROM menu



        UNION ALL



        SELECT

        'fichas' AS tipo,

        SUM(CASE WHEN visible = 1 THEN 1 ELSE 0 END),

        SUM(CASE WHEN visible = 0 THEN 1 ELSE 0 END)


        FROM ficha



        UNION ALL



        SELECT

        'etiquetas' AS tipo,

        SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END),

        SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END)


        FROM etiqueta



        UNION ALL



        SELECT

        'multimedia' AS tipo,

        SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END),

        SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END)


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
// EXPORTACIÓN DEL MODELO
// =======================================================
//
// Exporta las funciones para que puedan ser utilizadas
// por los controladores del dashboard.
//

module.exports={

    obtenerResumen,

    ultimasFichas,

    ultimosMenus,

    multimediaPorTipo,

    fichasPorMenu,

    estadoContenido

};