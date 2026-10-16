const Menu = require("../modelos/menu");
const { subirArchivo, eliminarArchivo } = require("../config/almacenamientoSupabase");

const limpiarArchivoSubido = async (ruta) => {
    if (!ruta) return;
    try {
        await eliminarArchivo(ruta);
    } catch {
        console.error("No se pudo limpiar un archivo nuevo de menú.");
    }
};

// ==========================
// LISTAR MENÚS
// ==========================

const listarMenus = async(req,res)=>{

    try{

        const menus = await Menu.obtenerMenus();

        res.json(menus);

    }catch(error){

        res.status(500).json({
            error:error.message
        });

    }

};

// ==========================
// CREAR MENÚ
// ==========================

const crearMenu = async(req,res)=>{
    let imagenSubida = null;

    try{
        const nombre = req.body.nombre?.trim();
        const id_plantilla = req.body.id_plantilla;

        if(!nombre){
            return res.status(400).json({ error:"Debe ingresar un nombre para el menú." });
        }
        if(!id_plantilla){
            return res.status(400).json({ error:"Debe seleccionar una plantilla." });
        }

        imagenSubida = await subirArchivo(req.file, "menus");
        const datosMenu = {
            nombre,
            descripcion: req.body.descripcion?.trim() || null,
            id_plantilla,
            visible: req.body.visible,
            imagen: imagenSubida
        };

        const id = await Menu.crear(datosMenu);
        imagenSubida = null;

        return res.json({ mensaje:"Menú creado correctamente", id_menu:id });
    }catch(error){
        await limpiarArchivoSubido(imagenSubida);
        return res.status(500).json({ error:error.message });
    }
};

// ==========================
// OBTENER MENÚ POR ID
// ==========================

const obtenerMenu = async(req,res)=>{

    try{

        const menu = await Menu.obtenerPorId(req.params.id);

        res.json(menu);

    }catch(error){

        res.status(500).json({
            error:error.message
        });

    }

};

// ==========================
// ACTUALIZAR MENÚ
// ==========================

const actualizarMenu = async(req,res)=>{
    let imagenNueva = null;
    

    try{
        const nombre = req.body.nombre?.trim();
        const id_plantilla = req.body.id_plantilla;

        if(!nombre){
            return res.status(400).json({ error:"Debe ingresar un nombre para el menú." });
        }
        if(!id_plantilla){
            return res.status(400).json({ error:"Debe seleccionar una plantilla." });
        }

        const datos = {
            nombre,
            descripcion: req.body.descripcion?.trim() || null,
            id_plantilla,
            visible: req.body.visible
        };

        if(req.file){
            const menuActual = await Menu.obtenerPorId(req.params.id);
            if(!menuActual){
                return res.status(404).json({ error:"No se encontró el menú." });
            }
            imagenNueva = await subirArchivo(req.file, "menus");
            datos.imagen = imagenNueva;
        }

        await Menu.actualizar(req.params.id, datos);
        // Se conserva la imagen anterior: aún no se ha verificado que no esté compartida.
        imagenNueva = null;
        return res.json({ mensaje:"Menú actualizado" });
    }catch(error){
        if(imagenNueva){
            await limpiarArchivoSubido(imagenNueva);
        }
        return res.status(500).json({ error:error.message });
    }
};

const eliminarMenu = async(req,res)=>{

    try{

        const id_menu = req.params.id;

        const cantidad =
        await Menu.contarFichas(id_menu);

        if(cantidad > 0){

            return res.status(409).json({

                error:"No se puede eliminar el menú porque tiene fichas asociadas."

            });

        }

        await Menu.eliminar(id_menu);

        res.json({

            mensaje:"Menú eliminado correctamente"

        });

    }catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};

module.exports = {

    listarMenus,
    crearMenu,
    obtenerMenu,
    actualizarMenu,
    eliminarMenu

};
