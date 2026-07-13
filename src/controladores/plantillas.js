const Plantilla = require("../modelos/plantilla");

// ======================================
// LISTAR PLANTILLAS
// ======================================

const listarPlantillas = async(req,res)=>{

    try{

        const plantillas =
        await Plantilla.obtenerPlantillas();

        res.json(plantillas);

    }
    catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};


// ======================================
// OBTENER PLANTILLA POR ID
// ======================================

const obtenerPlantilla = async(req,res)=>{

    try{

        const plantilla =
        await Plantilla.obtenerPorId(
            req.params.id_plantilla
        );

        if(!plantilla){

            return res.status(404).json({

                error:"Plantilla no encontrada"

            });

        }

        plantilla.plantilla_json =
        JSON.parse(plantilla.plantilla_json);

        res.json(plantilla);

    }
    catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};


// ======================================
// OBTENER PLANTILLA POR MENÚ
// ======================================


const obtenerPlantillaPorMenu = async(req,res)=>{

    try{

        const plantilla =
        await Plantilla.obtenerPorMenu(
            req.params.id_menu
        );

        if(!plantilla){

            return res.status(404).json({

                error:"Plantilla no encontrada"

            });

        }

        plantilla.plantilla_json =
        JSON.parse(plantilla.plantilla_json);

        res.json(plantilla);

    }
    catch(error){

        console.error(error);

        res.status(500).json({

            error:error.message

        });

    }

};


// ======================================
// CREAR PLANTILLA
// ======================================

const crearPlantilla = async(req,res)=>{

    try{

        const id =
        await Plantilla.crear(req.body);

        res.json({

            id_plantilla:id

        });

    }
    catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};


// ======================================
// ACTUALIZAR PLANTILLA
// ======================================

const actualizarPlantilla = async(req,res)=>{

    try{

        await Plantilla.actualizar(

            req.params.id,

            req.body

        );

        res.json({

            mensaje:"Plantilla actualizada"

        });

    }
    catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};


// ======================================
// ELIMINAR PLANTILLA
// ======================================

const eliminarPlantilla = async(req,res)=>{

    try{

        const id = req.params.id;


        const menus =
        await Plantilla.contarMenus(id);


        if(menus > 0){

            return res.status(400).json({

                error:
                "No se puede eliminar la plantilla porque está siendo utilizada por un menú."

            });

        }


        await Plantilla.eliminar(id);


        res.json({

            mensaje:
            "Plantilla eliminada correctamente"

        });


    }
    catch(error){

        console.error("ERROR ELIMINAR PLANTILLA:", error);

        res.status(500).json({

            error:error.message

        });

    }

};


module.exports = {

    listarPlantillas,
    obtenerPlantilla,
    obtenerPlantillaPorMenu,
    crearPlantilla,
    actualizarPlantilla,
    eliminarPlantilla

};