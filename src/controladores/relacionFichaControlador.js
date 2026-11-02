const RelacionFicha =
require("../modelos/relacionFichaModelo");
const cachePublico = require("../middleware/cachePublico");


// ===================================
// OBTENER RELACIONES DE UNA FICHA
// ===================================

const obtenerRelacionesFicha = async(req,res)=>{

    try{

        const relaciones =
        await RelacionFicha.obtenerRelaciones(
            req.params.id
        );

        res.json(relaciones);

    }catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};



// ===================================
// GUARDAR RELACIONES DE UNA FICHA
// ===================================

const guardarRelacionesFicha = async(req,res)=>{

    try{

        const relaciones = req.body?.relaciones;

        if (!Array.isArray(relaciones)) {
            return res.status(400).json({
                error: "El campo relaciones debe ser una lista."
            });
        }

        await RelacionFicha.guardarRelaciones(
            req.params.id,
            relaciones
        );
        cachePublico.invalidar(["fichas"]);

        res.json({

            mensaje:"Relaciones actualizadas correctamente."

        });

    }catch(error){
        if (error instanceof TypeError) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({
            error:error.message
        });
    }

};


const eliminarRelacionFicha = async(req,res)=>{

    try{

        await RelacionFicha.eliminarRelacion(
            req.params.id
        );
        cachePublico.invalidar(["fichas"]);

        res.json({

            mensaje:"Relación eliminada correctamente."

        });

    }catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};


module.exports={

    obtenerRelacionesFicha,
    guardarRelacionesFicha,
    eliminarRelacionFicha

};

