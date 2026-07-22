const Ficha =
require("../../modelos/public/ficha");

async function obtenerFichas(req,res){

    try{

        let fichas =
        await Ficha.obtenerTodas();


        fichas = fichas.map(ficha=>{


            ficha.datos_json =
            ficha.datos_json
            ?
            JSON.parse(ficha.datos_json)
            :
            {};


            ficha.plantilla =
            ficha.plantilla_json
            ?
            JSON.parse(ficha.plantilla_json)
            :
            null;


            delete ficha.plantilla_json;


            return ficha;


        });


        res.json(fichas);

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            error:"Error al obtener las fichas."

        });

    }

}


async function obtenerFichasPorMenu(req,res){

    try{

        let fichas =
        await Ficha.obtenerPorMenu(
            req.params.id_menu
        );


        fichas = fichas.map(ficha=>{


            ficha.datos_json =
            ficha.datos_json
            ?
            JSON.parse(ficha.datos_json)
            :
            {};


            ficha.plantilla =
            ficha.plantilla_json
            ?
            JSON.parse(ficha.plantilla_json)
            :
            null;


            delete ficha.plantilla_json;


            return ficha;


        });


        res.json(fichas);

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            error:"Error al obtener las fichas."

        });

    }

}


async function obtenerFichaPorId(req,res){

    try{

        const ficha =
        await Ficha.obtenerPorId(
            req.params.id_ficha
        );


        if(!ficha){

            return res.status(404).json({

                error:"Ficha no encontrada"

            });

        }


        ficha.etiquetas =
        await Ficha.obtenerEtiquetas(
            ficha.id_ficha
        );


        ficha.relacionadas =
        await Ficha.obtenerRelacionadas(
            ficha.id_ficha
        );


        ficha.multimedia =
        await Ficha.obtenerMultimedia(
            ficha.id_ficha
        );


        if(ficha.datos_json){

            ficha.datos_json =
            JSON.parse(ficha.datos_json);

        }else{

            ficha.datos_json = {};

        }


        if(ficha.plantilla_json){

            ficha.plantilla =
            JSON.parse(ficha.plantilla_json);

            delete ficha.plantilla_json;

        }


        res.json(ficha);


    }
    catch(error){

        console.error(error);


        res.status(500).json({

            error:"Error al obtener la ficha."

        });

    }

}



module.exports={

    obtenerFichas,

    obtenerFichasPorMenu,

    obtenerFichaPorId

};