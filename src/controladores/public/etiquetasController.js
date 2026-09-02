const Etiqueta =
require("../../modelos/public/etiquetas");


// =======================================================
// OBTENER TODAS LAS ETIQUETAS
// =======================================================

async function obtenerEtiquetas(req,res){

    try{

        const etiquetas =
        await Etiqueta.obtenerTodas();

        res.json(etiquetas);

    }
    catch(error){

        console.error(
            "[PUBLIC] Error al obtener etiquetas:",
            error
        );

        res.status(500).json({

            error:"Error al obtener las etiquetas."

        });

    }

}


module.exports = {

    obtenerEtiquetas

};