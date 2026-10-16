const Ficha = require("../modelos/ficha");
const RelacionFicha = require("../modelos/relacionFichaModelo");
const FichaEtiqueta = require("../modelos/fichaEtiquetaModelo");
const { subirArchivo, eliminarArchivo } = require("../config/almacenamientoSupabase");

const limpiarArchivoSubido = async (ruta) => {
    if (!ruta) return;
    try {
        await eliminarArchivo(ruta);
    } catch {
        console.error("No se pudo limpiar un archivo nuevo de ficha.");
    }
};

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
    const titulo = req.body.titulo?.trim();
    if(!titulo){
        return res.status(400).json({ error:"Debe ingresar un título para la ficha." });
    }

    let imagenSubida = null;
    try{
        imagenSubida = await subirArchivo(req.file, "fichas");
        const datos = {
            id_menu: req.body.id_menu,
            titulo,
            resumen: req.body.resumen,
            texto: req.body.texto,
            imagen: imagenSubida,
            datos_json: req.body.datos_json,
            visible: req.body.visible
        };

        const id = await Ficha.crear(datos);
        imagenSubida = null;
        return res.json({ mensaje:"Ficha creada correctamente", id_ficha:id });
    }catch(error){
        await limpiarArchivoSubido(imagenSubida);
        return res.status(500).json({ error:error.message });
    }
};

// ==========================
// ACTUALIZAR FICHA
// ==========================

const actualizarFicha = async(req,res)=>{
    const titulo = req.body.titulo?.trim();
    if(!titulo){
        return res.status(400).json({ error:"Debe ingresar un título para la ficha." });
    }

    let imagenNueva = null;
    let imagenAnterior = null;
    let guardado = false;

    try{
        const datos = {
            id_menu: req.body.id_menu,
            titulo,
            resumen: req.body.resumen,
            texto: req.body.texto,
            imagen: null,
            datos_json: req.body.datos_json,
            visible: req.body.visible
        };

        if(req.file){
            const fichaActual = await Ficha.obtenerPorId(req.params.id_ficha);
            if(!fichaActual){
                return res.status(404).json({ error:"No se encontró la ficha." });
            }
            imagenAnterior = fichaActual.imagen;
            imagenNueva = await subirArchivo(req.file, "fichas");
            datos.imagen = imagenNueva;
        }

        await Ficha.actualizar(req.params.id_ficha, datos);
        guardado = true;

        let advertencia = null;
        if(imagenNueva && imagenAnterior && imagenAnterior !== imagenNueva){
            try{
                await eliminarArchivo(imagenAnterior);
            }catch{
                advertencia = "Se guardaron los cambios, pero no se pudo eliminar la imagen anterior del almacenamiento.";
                console.error("No se pudo limpiar la imagen anterior de la ficha.");
            }
        }

        imagenNueva = null;
        return res.json({
            mensaje:"Ficha actualizada correctamente",
            ...(advertencia ? { advertencia } : {})
        });
    }catch(error){
        if(imagenNueva && !guardado){
            await limpiarArchivoSubido(imagenNueva);
        }
        console.error("Error actualizando ficha; código=", error.code || "sin_codigo");
        return res.status(500).json({ error:error.message });
    }
};

// ==========================
// ELIMINAR FICHA
// ==========================
// ==========================
// ELIMINAR FICHA
// ==========================

const eliminarFicha = async(req,res)=>{


    console.log("ENTRO A ELIMINAR FICHA");
    console.log("PARAMETROS:", req.params);


    try{

        const id = req.params.id_ficha;

        const cantidad =
        await Ficha.contarMultimedia(id);

        if(cantidad > 0){

            return res.status(409).json({

                error:"No se puede eliminar la ficha porque tiene archivos multimedia asociados."

            });

        }

        // Eliminar relaciones ficha-ficha
        await RelacionFicha.eliminarRelacionesFicha(id);


        // Eliminar relaciones ficha-etiqueta
        await FichaEtiqueta.eliminarRelacionesFicha(id);


        // Eliminar la ficha
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
