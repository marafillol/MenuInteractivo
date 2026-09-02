const Configuracion = require("../modelos/configuracion");

const estiloPredeterminado = {
    fondo:"pergamino",
    imagenFondo:"",
    colorPrimario:"#163A61",
    colorAcento:"#DBB060",
    colorFondo:"#F4EDDB",
    mostrarBuscador:true,
    densidadTarjetas:"normal",
    orientacionTotem: "horizontal"
};

const estiloAdminPredeterminado = {
    colorPrincipal:"#163A61",
    colorAcento:"#DBB060",
    colorFondo:"#F4EDDB",
    densidad:"normal"
};

const colorValido = (color)=>/^#[0-9a-fA-F]{6}$/.test(color || "");

const obtenerConfiguracion = async(clave, valoresPredeterminados)=>{
    const valor = await Configuracion.obtener(clave);
    if(!valor){
        return valoresPredeterminados;
    }
    try{
        return { ...valoresPredeterminados, ...JSON.parse(valor) };
    }catch(error){
        return valoresPredeterminados;
    }
};

const obtenerEstiloVisitante = async(req,res)=>{
    try{
        res.json(await obtenerConfiguracion("estilo_visitante", estiloPredeterminado));
    }catch(error){
        res.status(500).json({ error:"No se pudo obtener la configuracion." });
    }
};

const guardarEstiloVisitante = async(req,res)=>{
    const fondosPermitidos = new Set(["pergamino", "mapa", "papel"]);
    
    // Obtener la configuración actual para preservar valores si alguno no se envía
    const actual = await obtenerConfiguracion("estilo_visitante", estiloPredeterminado);

    // Normalizar de forma flexible cualquier valor que envíe el select del panel
    let rawOrientacion = (req.body.orientacionTotem || "").toLowerCase();
    let orientacionFinal = actual.orientacionTotem || "horizontal";

    if (rawOrientacion.includes("right") || rawOrientacion.includes("derecha") || rawOrientacion.includes("90")) {
        orientacionFinal = "right";
    } else if (rawOrientacion.includes("left") || rawOrientacion.includes("izquierda") || rawOrientacion.includes("-90")) {
        orientacionFinal = "left";
    } else if (rawOrientacion.includes("horizontal") || rawOrientacion.includes("normal") || rawOrientacion === "") {
        orientacionFinal = "horizontal";
    }

    const estilo = {
        fondo: fondosPermitidos.has(req.body.fondo) ? req.body.fondo : actual.fondo,
        imagenFondo: typeof req.body.imagenFondo === "string" ? req.body.imagenFondo.trim() : actual.imagenFondo,
        colorPrimario: colorValido(req.body.colorPrimario) ? req.body.colorPrimario : actual.colorPrimario,
        colorAcento: colorValido(req.body.colorAcento) ? req.body.colorAcento : actual.colorAcento,
        colorFondo: colorValido(req.body.colorFondo) ? req.body.colorFondo : actual.colorFondo,
        mostrarBuscador: req.body.mostrarBuscador !== undefined ? req.body.mostrarBuscador !== false : actual.mostrarBuscador,
        densidadTarjetas: ["normal", "compacta"].includes(req.body.densidadTarjetas) ? req.body.densidadTarjetas : actual.densidadTarjetas,
        orientacionTotem: orientacionFinal
    };

    try{
        await Configuracion.guardar("estilo_visitante", JSON.stringify(estilo));
        res.json(estilo);
    }catch(error){
        res.status(500).json({ error:"No se pudo guardar la configuracion." });
    }
};

const obtenerEstiloAdmin = async(req,res)=>{
    try{
        res.json(await obtenerConfiguracion("estilo_admin", estiloAdminPredeterminado));
    }catch(error){
        res.status(500).json({ error:"No se pudo obtener la configuracion." });
    }
};

const guardarEstiloAdmin = async(req,res)=>{
    const estilo = {
        colorPrincipal: colorValido(req.body.colorPrincipal) ? req.body.colorPrincipal : estiloAdminPredeterminado.colorPrincipal,
        colorAcento: colorValido(req.body.colorAcento) ? req.body.colorAcento : estiloAdminPredeterminado.colorAcento,
        colorFondo: colorValido(req.body.colorFondo) ? req.body.colorFondo : estiloAdminPredeterminado.colorFondo,
        densidad: ["normal", "compacta"].includes(req.body.densidad) ? req.body.densidad : estiloAdminPredeterminado.densidad
    };

    try{
        await Configuracion.guardar("estilo_admin", JSON.stringify(estilo));
        res.json(estilo);
    }catch(error){
        res.status(500).json({ error:"No se pudo guardar la configuracion." });
    }
};

module.exports = {
    obtenerEstiloVisitante,
    guardarEstiloVisitante,
    obtenerEstiloAdmin,
    guardarEstiloAdmin
};