const Ficha =
require("../../modelos/public/ficha");
const { interpretarJson } = require("../../utilidades/interpretarJson");

async function obtenerFichas(req,res){

    try{

        let fichas =
        await Ficha.obtenerTodas();


        fichas = fichas.map(ficha=>{


            ficha.datos_json =
            ficha.datos_json
            ?
            interpretarJson(ficha.datos_json)
            :
            {};


            ficha.plantilla =
            ficha.plantilla_json
            ?
            interpretarJson(ficha.plantilla_json)
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
            interpretarJson(ficha.datos_json)
            :
            {};


            ficha.plantilla =
            ficha.plantilla_json
            ?
            interpretarJson(ficha.plantilla_json)
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

async function obtenerFichasPorEtiqueta(req,res){
    try{
        let fichas =
        await Ficha.obtenerPorEtiqueta(
            req.params.id_etiqueta
        );

        fichas = fichas.map(ficha=>{
            ficha.datos_json =
            ficha.datos_json
            ?
            interpretarJson(ficha.datos_json)
            :
            {};

            ficha.plantilla =
            ficha.plantilla_json
            ?
            interpretarJson(ficha.plantilla_json)
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
            error:"Error al obtener las fichas por etiqueta."
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


        // Estas consultas son independientes entre sí, así que se ejecutan en paralelo.
        const [etiquetas, relacionadas, multimedia] = await Promise.all([
            Ficha.obtenerEtiquetas(ficha.id_ficha),
            Ficha.obtenerRelacionadas(ficha.id_ficha),
            Ficha.obtenerMultimedia(ficha.id_ficha)
        ]);

        ficha.etiquetas = etiquetas;
        ficha.relacionadas = relacionadas;
        ficha.multimedia = multimedia;


        if(ficha.datos_json){

            ficha.datos_json =
            interpretarJson(ficha.datos_json);

        }else{

            ficha.datos_json = {};

        }


        if(ficha.plantilla_json){

            ficha.plantilla =
            interpretarJson(ficha.plantilla_json);

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
    obtenerFichasPorEtiqueta,
    obtenerFichaPorId
};