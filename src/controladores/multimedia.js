const Multimedia = require("../modelos/multimedia");
const { subirArchivo, eliminarArchivo } = require("../config/almacenamientoSupabase");

const tiposMultimedia = new Set(["imagen", "video", "audio", "pdf"]);

const miniaturaPorTipo = (tipo) => ({
    imagen: "🖼️",
    video: "🎥",
    audio: "🎵",
    pdf: "📄"
}[tipo] || "📁");

const idPositivo = (valor) =>
    /^\\d+$/.test(String(valor ?? "")) &&
    Number.isSafeInteger(Number(valor)) &&
    Number(valor) > 0;

const validarDatosMultimedia = (cuerpo, archivoRequerido = false) => {
    if (!idPositivo(cuerpo?.id_ficha)) {
        return "Debe seleccionar una ficha válida.";
    }

    if (!tiposMultimedia.has(cuerpo?.tipo_multi)) {
        return "Debe seleccionar un tipo de multimedia válido.";
    }

    if (archivoRequerido && !cuerpo?.archivoPresente) {
        return "Debe seleccionar un archivo multimedia.";
    }

    if (
        cuerpo?.activo !== undefined &&
        cuerpo.activo !== null &&
        ![0, 1, "0", "1"].includes(cuerpo.activo)
    ) {
        return "El estado debe ser activo o inactivo.";
    }

    return null;
};

const limpiarArchivoSubido = async (ruta) => {
    if (!ruta) return;
    try {
        await eliminarArchivo(ruta);
    } catch {
        console.error("No se pudo limpiar un archivo nuevo del almacenamiento.");
    }
};

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

    const cuerpo = req.body || {};
    const errorValidacion = validarDatosMultimedia({
        ...cuerpo,
        archivoPresente: Boolean(req.file)
    }, true);

    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    let rutaSubida = null;

    try {
        rutaSubida = await subirArchivo(
            req.file,
            `multimedia/${cuerpo.tipo_multi}`
        );

        const datos = {
            id_ficha: cuerpo.id_ficha,
            descripcion: cuerpo.descripcion,
            ruta_archivo: rutaSubida,
            tipo_multi: cuerpo.tipo_multi,
            miniatura: miniaturaPorTipo(cuerpo.tipo_multi),
            activo: cuerpo.activo ?? 1,
            // creado es timestamptz en PostgreSQL: guardar el instante con zona UTC explícita.
            creado: new Date().toISOString(),
            // actualizado es TEXT y la interfaz espera la hora local argentina.
            actualizado: fechaArgentina()
        };

        const id = await Multimedia.crear(datos);
        // El registro quedó guardado; el archivo ya no debe limpiarse desde el catch.
        rutaSubida = null;

        res.json({
            mensaje: "Multimedia creada correctamente",
            id_multimedia: id
        });

    } catch(error) {
        await limpiarArchivoSubido(rutaSubida);
        res.status(500).json({ error: error.message });
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

    const cuerpo = req.body || {};
    const errorValidacion = validarDatosMultimedia(cuerpo);

    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    if (!idPositivo(req.params.id)) {
        return res.status(400).json({ error: "Debe indicar un identificador de multimedia válido." });
    }

    let rutaNuevaSubida = null;
    let guardado = false;

    try {
        const multimediaActual = await Multimedia.obtenerPorId(req.params.id);

        if (!multimediaActual) {
            return res.status(404).json({
                error: "No se encontró la multimedia."
            });
        }

        if (cuerpo.tipo_multi !== multimediaActual.tipo_multi && !req.file) {
            return res.status(400).json({
                error: "Para cambiar el tipo de multimedia debe seleccionar el archivo nuevo."
            });
        }

        const rutaAnterior = multimediaActual.ruta_archivo;

        if (req.file) {
            rutaNuevaSubida = await subirArchivo(
                req.file,
                `multimedia/${cuerpo.tipo_multi}`
            );
        }

        const datos = {
            id_ficha: cuerpo.id_ficha,
            descripcion: cuerpo.descripcion,
            ruta_archivo: rutaNuevaSubida || rutaAnterior,
            tipo_multi: cuerpo.tipo_multi,
            miniatura: req.file
                ? miniaturaPorTipo(cuerpo.tipo_multi)
                : multimediaActual.miniatura,
            activo: cuerpo.activo ?? multimediaActual.activo,
            actualizado: fechaArgentina()
        };

        await Multimedia.actualizar(req.params.id, datos);
        guardado = true;

        let advertencia = null;
        if (rutaNuevaSubida && rutaAnterior && rutaAnterior !== rutaNuevaSubida) {
            try {
                await eliminarArchivo(rutaAnterior);
            } catch {
                advertencia = "Se guardaron los cambios, pero no se pudo eliminar el archivo anterior del almacenamiento.";
                console.error("No se pudo limpiar el archivo multimedia anterior.");
            }
        }

        rutaNuevaSubida = null;

        res.json({
            mensaje: "Multimedia actualizada correctamente",
            ...(advertencia ? { advertencia } : {})
        });

    } catch(error) {
        if (rutaNuevaSubida && !guardado) {
            await limpiarArchivoSubido(rutaNuevaSubida);
        }

        const noEncontrada = error.message === "No se encontró la multimedia.";
        res.status(noEncontrada ? 404 : 500).json({
            error: error.message
        });
    }

};


const eliminarMultimedia = async(req,res)=>{

    if (!idPositivo(req.params.id)) {
        return res.status(400).json({
            error: "Debe indicar un identificador de multimedia válido."
        });
    }

    try {
        const multimediaActual = await Multimedia.obtenerPorId(req.params.id);

        if (!multimediaActual) {
            return res.status(404).json({
                error: "No se encontró la multimedia."
            });
        }

        await Multimedia.eliminar(req.params.id);

        let advertencia = null;
        try {
            await eliminarArchivo(multimediaActual.ruta_archivo);
        } catch {
            advertencia = "El registro se eliminó, pero no se pudo eliminar el archivo del almacenamiento.";
            console.error("No se pudo limpiar el archivo multimedia eliminado.");
        }

        res.json({
            mensaje: "Multimedia eliminada correctamente",
            ...(advertencia ? { advertencia } : {})
        });

    } catch(error) {
        const noEncontrada = error.message === "No se encontró la multimedia.";
        res.status(noEncontrada ? 404 : 500).json({
            error: error.message
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
