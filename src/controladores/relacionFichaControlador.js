const RelacionFicha =
require("../modelos/relacionFichaModelo");



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

        await RelacionFicha.guardarRelaciones(

            req.params.id,

            req.body.relaciones || []

        );

        res.json({

            mensaje:"Relaciones actualizadas correctamente."

        });

    }catch(error){

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