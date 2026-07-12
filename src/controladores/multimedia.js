const Multimedia = require("../modelos/multimedia");

// ==========================
// LISTAR MULTIMEDIA POR FICHA
// ==========================

const listarPorFicha = async(req,res)=>{

    try{


        const multimedia =
        await Multimedia.obtenerPorFicha(
            req.params.id_ficha
        );


        res.json(multimedia);


    }catch(error){


        res.status(500).json({

            error:error.message

        });


    }

};

const listarMultimedia = async(req,res)=>{

    try{

        const multimedia =
        await Multimedia.obtenerMultimedia();

        res.json(multimedia);

    }catch(error){

        res.status(500).json({
            error:error.message
        });

    }

};

const crearMultimedia = async(req,res)=>{

    try{

        let miniatura = "📁";

        switch(req.body.tipo_multi){

            case "imagen":
                miniatura = "🖼️";
                break;

            case "video":
                miniatura = "🎥";
                break;

            case "audio":
                miniatura = "🎵";
                break;

            case "pdf":
                miniatura = "📄";
                break;

        }

        const datos = {

            id_ficha: req.body.id_ficha,

            descripcion: req.body.descripcion,

            ruta_archivo: req.file
                ? req.file.path.replace(/\\/g,"/")
                : null,

            tipo_multi: req.body.tipo_multi,

            miniatura: miniatura,

            activo: req.body.activo ?? 1,

            creado:fechaArgentina(),

            actualizado: fechaArgentina()

        };

        const id = await Multimedia.crear(datos);

        res.json({
            mensaje: "Multimedia creada correctamente",
            id_multimedia: id
        });

    }catch(error){

        res.status(500).json({
            error: error.message
        });

    }

};

const obtenerMultimedia = async(req,res)=>{

    try{

        const multimedia =
        await Multimedia.obtenerPorId(req.params.id);

        res.json(multimedia);

    }catch(error){

        res.status(500).json({
            error:error.message
        });

    }

};


// ==========================
// ACTUALIZAR MULTIMEDIA
// ==========================

const actualizarMultimedia = async(req,res)=>{

    try{

        const multimediaActual =
        await Multimedia.obtenerPorId(req.params.id);

        const datos = {

            id_ficha: req.body.id_ficha,

            descripcion: req.body.descripcion,

            ruta_archivo: req.file
                ? req.file.path.replace(/\\/g,"/")
                : multimediaActual.ruta_archivo,

            tipo_multi: req.body.tipo_multi,

            miniatura: multimediaActual.miniatura,

            activo: req.body.activo ?? multimediaActual.activo,

            actualizado: fechaArgentina()

        };

        await Multimedia.actualizar(
            req.params.id,
            datos
        );

        res.json({
            mensaje:"Multimedia actualizada correctamente"
        });

    }catch(error){

        res.status(500).json({
            error:error.message
        });

    }

};


// ==========================
// ELIMINAR MULTIMEDIA
// ==========================

const eliminarMultimedia = async(req,res)=>{

    try{

        await Multimedia.eliminar(
            req.params.id
        );

        res.json({

            mensaje:"Multimedia eliminada correctamente"

        });

    }catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};



function fechaArgentina(){

    return new Date().toLocaleString(
        "sv-SE",
        {
            timeZone:"America/Argentina/Buenos_Aires"
        }
    ).replace(" "," ");

}


module.exports = {

    listarMultimedia,
    listarPorFicha,
    crearMultimedia,
    actualizarMultimedia,
    eliminarMultimedia,
    obtenerMultimedia,
    fechaArgentina

};