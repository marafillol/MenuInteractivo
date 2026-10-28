const Ficha =
require("../../modelos/public/ficha");
const cachePublica = require("../../servicios/cachePublica");
const { interpretarJson } = require("../../utilidades/interpretarJson");

async function obtenerFichas(req, res) {
    const inicio = performance.now();

    try {
        let fichas = cachePublica.obtenerDatosPublicos("fichas");

        if (fichas === null) {
            return res.status(503).json({
                error: "Los datos públicos todavía se están preparando."
            });
        }

        console.log(
            `[CACHE PUBLICA] Fichas servidas en ${(
                performance.now() - inicio
            ).toFixed(1)} ms`
        );

        res.json(fichas);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Error al obtener las fichas."
        });
    }
}


async function obtenerFichasPorMenu(req,res){

    const inicio = performance.now();

    try{

        let fichas =
        await Ficha.obtenerPorMenu(
            req.params.id_menu
        );

        console.log(
            `[TIEMPO API] obtenerFichas: consulta ${(
                performance.now() - inicio
            ).toFixed(1)} ms`
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


async function obtenerFichaPorId(req, res) {
    const inicioTotal = performance.now();
    const idFicha = req.params.id_ficha;

    try {
        const inicioConsulta = performance.now();

        const ficha = await Ficha.obtenerPorId(idFicha);

        console.log(
            `[TIEMPO FICHA ${idFicha}] Consulta unificada: ${
                (performance.now() - inicioConsulta).toFixed(1)
            } ms`
        );

        if (!ficha) {
            return res.status(404).json({
                error: "Ficha no encontrada"
            });
        }

        // Los arreglos vienen incluidos en la consulta SQL.
        ficha.etiquetas = ficha.etiquetas || [];
        ficha.relacionadas = ficha.relacionadas || [];
        ficha.multimedia = ficha.multimedia || [];

        ficha.datos_json = ficha.datos_json
            ? interpretarJson(ficha.datos_json)
            : {};

        if (ficha.plantilla_json) {
            ficha.plantilla = interpretarJson(ficha.plantilla_json);
            delete ficha.plantilla_json;
        }

        console.log(
            `[TIEMPO FICHA ${idFicha}] Total antes de responder: ${
                (performance.now() - inicioTotal).toFixed(1)
            } ms`
        );

        res.json(ficha);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Error al obtener la ficha."
        });
    }
}



module.exports={
    obtenerFichas,
    obtenerFichasPorMenu,
    obtenerFichasPorEtiqueta,
    obtenerFichaPorId
};