// =======================================================
// OBTENER FICHAS DE UNA ETIQUETA
// =======================================================
//
// Obtiene las fichas visibles asociadas a una etiqueta.
//

static obtenerPorEtiqueta(idEtiqueta){

    return new Promise((resolve,reject)=>{

        db.all(
            `
            SELECT

                f.id_ficha,
                f.id_menu,
                f.titulo,
                f.resumen,
                f.imagen,
                f.datos_json,

                m.nombre AS menu,

                p.plantilla_json

            FROM ficha_etiqueta fe

            INNER JOIN ficha f
                ON fe.id_ficha = f.id_ficha

            INNER JOIN etiqueta e
                ON fe.id_etiqueta = e.id_etiqueta

            INNER JOIN menu m
                ON f.id_menu = m.id_menu

            INNER JOIN plantilla p
                ON m.id_plantilla = p.id_plantilla

            WHERE

                fe.id_etiqueta = ?

                AND e.activo = 1

                AND f.visible = 1

                AND m.visible = 1

            ORDER BY f.titulo
            `,
            [idEtiqueta],
            (error,filas)=>{

                if(error){

                    reject(error);

                }else{

                    resolve(filas);

                }

            }
        );

    });

}