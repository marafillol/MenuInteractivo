const Plantilla = require("../modelos/plantilla");
const cachePublico = require("../middleware/cachePublico");
const { interpretarJson } =
    require("../utilidades/interpretarJson");
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
            interpretarJson(plantilla.plantilla_json);

        res.json(plantilla);

    }
    catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};


// ======================================
// OBTENER PLANTILLA POR MENÃš
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
            interpretarJson(plantilla.plantilla_json);

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
        cachePublico.invalidar(["fichas", "menus"]);

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
        cachePublico.invalidar(["fichas", "menus"]);

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
                "No se puede eliminar la plantilla porque estÃ¡ siendo utilizada por un menÃº."

            });

        }


        await Plantilla.eliminar(id);
        cachePublico.invalidar(["fichas", "menus"]);


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
