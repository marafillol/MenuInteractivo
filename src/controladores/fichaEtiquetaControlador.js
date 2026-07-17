const FichaEtiqueta = require("../modelos/fichaEtiquetaModelo");




class FichaEtiquetaControlador{


    static async obtenerEtiquetasFicha(req,res){

        try{

            const etiquetas =
            await FichaEtiqueta.obtenerPorFicha(req.params.id);

            res.json(etiquetas);

        }
        catch(error){

            console.error(error);

            res.status(500).json({
                error:"Error al obtener las etiquetas de la ficha."
            });

        }

    }



    static async guardarEtiquetasFicha(req,res){

        try{

            const idFicha =
            req.params.id;

            const etiquetas =
            req.body.etiquetas || [];

            await FichaEtiqueta.reemplazar(
                idFicha,
                etiquetas
            );

            res.json({
                mensaje:"Etiquetas actualizadas correctamente."
            });

        }
        catch(error){

            console.error(error);

            res.status(500).json({
                error:"Error al actualizar las etiquetas."
            });

        }

    }


}


module.exports = FichaEtiquetaControlador;