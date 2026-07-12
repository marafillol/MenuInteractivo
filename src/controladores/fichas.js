const Ficha = require("../modelos/ficha");


const listarFichas = async(req,res)=>{

    try{

        const fichas = await Ficha.obtenerFichas();

        res.json(fichas);

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

            return res.status(400).json({

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

const listarFichasPorMenu = async(req,res)=>{

    try{

        const id_menu = req.params.id_menu;

        const fichas = await Ficha.obtenerFichasPorMenu(id_menu);

        res.json(fichas);

    }catch(error){

        res.status(500).json({
            error:error.message
        });

    }

};



// ==========================
// OBTENER FICHA POR ID
// ==========================

const obtenerFicha = async(req,res)=>{

    try{


        const ficha =
        await Ficha.obtenerPorId(req.params.id_ficha);



        res.json(ficha);


    }
    catch(error){


        res.status(500).json({

            error:error.message

        });


    }

};


// ==========================
// CREAR FICHA
// ==========================

const crearFicha = async(req,res)=>{

    try{


        const datos = {

            id_menu: req.body.id_menu,

            titulo: req.body.titulo,

            resumen: req.body.resumen,

            texto: req.body.texto,

            imagen: req.file
                ? req.file.path.replace(/\\/g,"/")
                : null,


            datos_json: req.body.datos_json,

            visible: req.body.visible

        };


        const id =
        await Ficha.crear(datos);



        res.json({

            mensaje:"Ficha creada correctamente",

            id_ficha:id

        });



    }catch(error){


        res.status(500).json({

            error:error.message

        });


    }

};


// ==========================
// ACTUALIZAR FICHA
// ==========================

const actualizarFicha = async(req,res)=>{

    try{


        const datos = {

            id_menu: req.body.id_menu,

            titulo: req.body.titulo,

            resumen: req.body.resumen,

            texto: req.body.texto,


            // si llega una imagen nueva la guardamos
            // si no llega queda undefined para conservar la anterior

            imagen: req.file
                ? req.file.path.replace(/\\/g,"/")
                : null,


            datos_json: req.body.datos_json,

            visible: req.body.visible

        };



        await Ficha.actualizar(

            req.params.id_ficha,

            datos

        );



        res.json({

            mensaje:"Ficha actualizada correctamente"

        });



    }catch(error){


        console.error(error);


        res.status(500).json({

            error:error.message

        });


    }

};

// ==========================
// ELIMINAR FICHA
// ==========================
// ==========================
// ELIMINAR FICHA
// ==========================

const eliminarFicha = async(req,res)=>{

    try{

        const id = req.params.id_ficha;

        const cantidad =
        await Ficha.contarMultimedia(id);

        if(cantidad > 0){

            return res.status(409).json({

                error:"No se puede eliminar la ficha porque tiene archivos multimedia asociados."

            });

        }

        await Ficha.eliminar(id);

        res.json({

            mensaje:"Ficha eliminada correctamente"

        });

    }catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};

module.exports = {

    listarFichas,
    listarFichasPorMenu,
    obtenerFicha,
    crearFicha,
    actualizarFicha,
    eliminarFicha

};
