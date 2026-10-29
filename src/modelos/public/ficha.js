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
                ficha.creado,

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



const obtenerTodasConDetalle = async () => {
    const consultar = (sql, parametros = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, parametros, (error, filas) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(filas || []);
                }
            });
        });
    };

    const fichas = await consultar(`
        SELECT
            ficha.id_ficha,
            ficha.id_menu,
            ficha.titulo,
            ficha.resumen,
            ficha.texto,
            ficha.imagen,
            ficha.datos_json,
            ficha.creado,
            menu.nombre AS menu,
            plantilla.plantilla_json
        FROM ficha
        INNER JOIN menu
            ON ficha.id_menu = menu.id_menu
        INNER JOIN plantilla
            ON menu.id_plantilla = plantilla.id_plantilla
        WHERE ficha.visible = 1
            AND menu.visible = 1
        ORDER BY ficha.titulo
    `);

    if (fichas.length === 0) {
        return [];
    }

    const etiquetas = await consultar(`
        SELECT
            ficha_etiqueta.id_ficha,
            etiqueta.id_etiqueta,
            etiqueta.nombre,
            etiqueta.descripcion
        FROM ficha_etiqueta
        INNER JOIN etiqueta
            ON etiqueta.id_etiqueta = ficha_etiqueta.id_etiqueta
        INNER JOIN ficha
            ON ficha.id_ficha = ficha_etiqueta.id_ficha
        INNER JOIN menu
            ON menu.id_menu = ficha.id_menu
        WHERE etiqueta.activo = 1
            AND ficha.visible = 1
            AND menu.visible = 1
        ORDER BY etiqueta.nombre
    `);


    const relacionadas = await consultar(`
        SELECT
            relacion_ficha.id_ficha_origen,
            relacion_ficha.id_ficha_destino,
            relacion_ficha.tipo_relacion
        FROM relacion_ficha
        INNER JOIN ficha AS origen
            ON origen.id_ficha = relacion_ficha.id_ficha_origen
        INNER JOIN menu AS menu_origen
            ON menu_origen.id_menu = origen.id_menu
        INNER JOIN ficha AS destino
            ON destino.id_ficha = relacion_ficha.id_ficha_destino
        INNER JOIN menu AS menu_destino
            ON menu_destino.id_menu = destino.id_menu
        WHERE origen.visible = 1
            AND menu_origen.visible = 1
            AND destino.visible = 1
            AND menu_destino.visible = 1
    `);


    const multimedia = await consultar(`
        SELECT
            multimedia.id_multi,
            multimedia.id_ficha,
            multimedia.descripcion,
            multimedia.ruta_archivo,
            multimedia.tipo_multi
        FROM multimedia
        INNER JOIN ficha
            ON ficha.id_ficha = multimedia.id_ficha
        INNER JOIN menu
            ON menu.id_menu = ficha.id_menu
        WHERE multimedia.activo = 1
            AND ficha.visible = 1
            AND menu.visible = 1
        ORDER BY multimedia.id_multi
    `);

    const porId = new Map(
        fichas.map(ficha => [
            Number(ficha.id_ficha),
            {
                ...ficha,
                etiquetas: [],
                relacionadas: [],
                multimedia: []
            }
        ])
    );

    for (const etiqueta of etiquetas) {
        porId.get(Number(etiqueta.id_ficha))
            ?.etiquetas.push({
                id_etiqueta: etiqueta.id_etiqueta,
                nombre: etiqueta.nombre,
                descripcion: etiqueta.descripcion
            });
    }

    for (const elemento of multimedia) {
        porId.get(Number(elemento.id_ficha))
            ?.multimedia.push(elemento);
    }


    for (const relacion of relacionadas) {
        const idOrigen = Number(relacion.id_ficha_origen);
        const idDestino = Number(relacion.id_ficha_destino);

        const origen = porId.get(idOrigen);
        const destino = porId.get(idDestino);

        if (!origen || !destino || idOrigen === idDestino) {
            continue;
        }

        origen.relacionadas.push({
            id_ficha: destino.id_ficha,
            titulo: destino.titulo,
            imagen: destino.imagen,
            menu: destino.menu,
            tipo_relacion: relacion.tipo_relacion
        });

        destino.relacionadas.push({
            id_ficha: origen.id_ficha,
            titulo: origen.titulo,
            imagen: origen.imagen,
            menu: origen.menu,
            tipo_relacion: relacion.tipo_relacion
        });
    }

    for (const ficha of porId.values()) {
        ficha.relacionadas.sort((a, b) =>
            a.titulo.localeCompare(b.titulo)
        );
    }

    return Array.from(porId.values());
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

const obtenerPorId = (id_ficha) => {
    return new Promise((resolve, reject) => {
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
                plantilla.plantilla_json,

                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id_etiqueta', etiqueta.id_etiqueta,
                                'nombre', etiqueta.nombre,
                                'descripcion', etiqueta.descripcion
                            )
                            ORDER BY etiqueta.nombre
                        )
                        FROM ficha_etiqueta
                        INNER JOIN etiqueta
                            ON etiqueta.id_etiqueta =
                               ficha_etiqueta.id_etiqueta
                        WHERE
                            ficha_etiqueta.id_ficha = ficha.id_ficha
                            AND etiqueta.activo = 1
                    ),
                    '[]'::json
                ) AS etiquetas,

                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id_ficha', ficha_rel.id_ficha,
                                'titulo', ficha_rel.titulo,
                                'imagen', ficha_rel.imagen,
                                'menu', menu_rel.nombre,
                                'tipo_relacion',
                                    relacion_ficha.tipo_relacion
                            )
                            ORDER BY ficha_rel.titulo
                        )
                        FROM relacion_ficha
                        INNER JOIN ficha AS ficha_rel
                            ON ficha_rel.id_ficha =
                                CASE
                                    WHEN relacion_ficha.id_ficha_origen =
                                         ficha.id_ficha
                                    THEN relacion_ficha.id_ficha_destino
                                    ELSE relacion_ficha.id_ficha_origen
                                END
                        INNER JOIN menu AS menu_rel
                            ON ficha_rel.id_menu = menu_rel.id_menu
                        WHERE
                            (
                                relacion_ficha.id_ficha_origen =
                                    ficha.id_ficha
                                OR
                                relacion_ficha.id_ficha_destino =
                                    ficha.id_ficha
                            )
                            AND ficha_rel.visible = 1
                            AND menu_rel.visible = 1
                    ),
                    '[]'::json
                ) AS relacionadas,

                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id_multi', multimedia.id_multi,
                                'id_ficha', multimedia.id_ficha,
                                'descripcion', multimedia.descripcion,
                                'ruta_archivo', multimedia.ruta_archivo,
                                'tipo_multi', multimedia.tipo_multi
                            )
                            ORDER BY multimedia.id_multi
                        )
                        FROM multimedia
                        WHERE
                            multimedia.id_ficha = ficha.id_ficha
                            AND multimedia.activo = 1
                    ),
                    '[]'::json
                ) AS multimedia

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
            (error, fila) => {
                if (error) {
                    reject(error);
                } else {
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
                etiqueta.nombre,
                etiqueta.descripcion
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

const obtenerPorEtiqueta = (id_etiqueta)=>{
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
            INNER JOIN ficha_etiqueta
                ON ficha.id_ficha = ficha_etiqueta.id_ficha
            INNER JOIN menu
                ON ficha.id_menu = menu.id_menu
            INNER JOIN plantilla
                ON menu.id_plantilla = plantilla.id_plantilla
            WHERE
                ficha_etiqueta.id_etiqueta = ?
                AND ficha.visible = 1
                AND menu.visible = 1
            ORDER BY ficha.titulo
            `,
            [id_etiqueta],
            (error,filas)=>{
                if(error) reject(error);
                else resolve(filas);
            }
        );
    });
};

const obtenerRelacionesEtiquetas = () => {
    return new Promise((resolve, reject) => {
        db.all(
            `
            SELECT
                ficha_etiqueta.id_ficha,
                ficha_etiqueta.id_etiqueta
            FROM ficha_etiqueta
            INNER JOIN etiqueta
                ON etiqueta.id_etiqueta = ficha_etiqueta.id_etiqueta
            INNER JOIN ficha
                ON ficha.id_ficha = ficha_etiqueta.id_ficha
            INNER JOIN menu
                ON menu.id_menu = ficha.id_menu
            WHERE
                etiqueta.activo = 1
                AND ficha.visible = 1
                AND menu.visible = 1
            `,
            [],
            (error, filas) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(filas);
                }
            }
        );
    });
};

module.exports = {
    obtenerTodas,
    obtenerTodasConDetalle,
    obtenerPorMenu,
    obtenerPorId,
    obtenerEtiquetas,
    obtenerRelacionadas,
    obtenerMultimedia,
    obtenerPorEtiqueta,
    obtenerRelacionesEtiquetas
};