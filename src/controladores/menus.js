const Menu = require("../modelos/menu");

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

    try{

        const datosMenu = {

            nombre: req.body.nombre,
            descripcion: req.body.descripcion,
            id_plantilla: req.body.id_plantilla,
            visible: req.body.visible,

            imagen: req.file
                ? req.file.path.replace(/\\/g,"/")
                : null

        };

        const id = await Menu.crear(datosMenu);

        res.json({
            mensaje:"Menú creado correctamente",
            id_menu:id
        });

    }catch(error){

        res.status(500).json({
            error:error.message
        });

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

    try{

        const datos = {

            nombre: req.body.nombre,
            descripcion: req.body.descripcion,
            id_plantilla: req.body.id_plantilla,
            visible: req.body.visible

        };

        if(req.file){

            datos.imagen = req.file.path.replace(/\\/g,"/");

        }

        await Menu.actualizar(req.params.id, datos);

        res.json({
            mensaje:"Menú actualizado"
        });

    }catch(error){

        res.status(500).json({
            error:error.message
        });

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