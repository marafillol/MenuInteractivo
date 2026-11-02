const Menu = require("../modelos/menu");
const Ficha = require("../modelos/ficha");
const { subirArchivo, eliminarArchivo } = require("../config/almacenamientoSupabase");
const cachePublico = require("../middleware/cachePublico");
const limpiarArchivoSubido = async (ruta) => {
    if (!ruta) return;
    try {
        await eliminarArchivo(ruta);
    } catch {
        console.error("No se pudo limpiar un archivo nuevo de menÃº.");
    }
};

// ==========================
// LISTAR MENÃšS
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
// CREAR MENÃš
// ==========================

const crearMenu = async(req,res)=>{
    let imagenSubida = null;

    try{
        const nombre = req.body.nombre?.trim();
        const id_plantilla = req.body.id_plantilla;

        if(!nombre){
            return res.status(400).json({ error:"Debe ingresar un nombre para el menÃº." });
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
        cachePublico.invalidar(["menus", "fichas"]);
        imagenSubida = null;

        return res.json({ mensaje:"MenÃº creado correctamente", id_menu:id });
    }catch(error){
        await limpiarArchivoSubido(imagenSubida);
        return res.status(500).json({ error:error.message });
    }
};

// ==========================
// OBTENER MENÃš POR ID
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
// ACTUALIZAR MENÃš
// ==========================

const actualizarMenu = async(req,res)=>{
    let imagenNueva = null;
    

    try{
        const nombre = req.body.nombre?.trim();
        const id_plantilla = req.body.id_plantilla;


        const menuActual = await Menu.obtenerPorId(req.params.id);

        if (!menuActual) {
            return res.status(404).json({
                error: "No se encontrÃ³ el menÃº."
            });
        }

        const cantidadFichas = await Menu.contarFichas(req.params.id);

        if (
            cantidadFichas > 0 &&
            Number(id_plantilla) !== Number(menuActual.id_plantilla)
        ) {
            return res.status(400).json({
                error: "No se puede cambiar la plantilla porque este menÃº ya tiene fichas asociadas."
            });
        }


        if(!nombre){
            return res.status(400).json({ error:"Debe ingresar un nombre para el menÃº." });
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
            imagenNueva = await subirArchivo(req.file, "menus");
            datos.imagen = imagenNueva;
        }

        await Menu.actualizar(req.params.id, datos);
        cachePublico.invalidar(["menus", "fichas"]);
        // Se conserva la imagen anterior: aÃºn no se ha verificado que no estÃ© compartida.
        imagenNueva = null;
        return res.json({ mensaje:"MenÃº actualizado" });
    }catch(error){
        if(imagenNueva){
            await limpiarArchivoSubido(imagenNueva);
        }
        return res.status(500).json({ error:error.message });
    }
};

const eliminarMenu = async (req, res) => {
    try {

        console.log("[ELIMINAR MENÃš] Controlador actualizado ejecutado");
        const id_menu = req.params.id;

        const menu = await Menu.obtenerPorId(id_menu);

        if (!menu) {
            return res.status(404).json({
                error: "No se encontrÃ³ el menÃº que intenta eliminar."
            });
        }

        const cantidad = await Menu.contarFichas(id_menu);

        if (cantidad > 0) {
            const fichas = await Ficha.obtenerFichasPorMenu(id_menu);

            return res.status(400).json({
                error: `No se puede eliminar el menÃº "${menu.nombre}" porque tiene ${cantidad} ficha(s) asociada(s).`,
                menu: {
                    id_menu: menu.id_menu,
                    nombre: menu.nombre
                },
                fichas: fichas.map(ficha => ({
                    id_ficha: ficha.id_ficha,
                    titulo: ficha.titulo
                }))
            });
        }

        await Menu.eliminar(id_menu);
        cachePublico.invalidar(["menus", "fichas"]);

        return res.json({
            mensaje: "MenÃº eliminado correctamente."
        });

    } catch (error) {
        console.error("Error eliminando menÃº:", error);

        return res.status(500).json({
            error: "OcurriÃ³ un error al intentar eliminar el menÃº."
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

