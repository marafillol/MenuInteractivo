const Configuracion = require("../modelos/configuracion");

const estiloPredeterminado = {
    fondo:"pergamino",
    imagenFondo:"",
    colorPrimario:"#163A61",
    colorAcento:"#DBB060",
    colorFondo:"#F4EDDB",
    mostrarBuscador:true,
    densidadTarjetas:"normal"
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

        res.json(await obtenerConfiguracion(
            "estilo_visitante",
            estiloPredeterminado
        ));

    }catch(error){
        res.status(500).json({ error:"No se pudo obtener la configuracion." });
    }

};

const guardarEstiloVisitante = async(req,res)=>{

    const fondosPermitidos = new Set(["pergamino", "mapa", "papel"]);

    const estilo = {
        fondo:fondosPermitidos.has(req.body.fondo)
            ? req.body.fondo
            : estiloPredeterminado.fondo,
        imagenFondo:typeof req.body.imagenFondo === "string"
            ? req.body.imagenFondo.trim()
            : "",
        colorPrimario:colorValido(req.body.colorPrimario)
            ? req.body.colorPrimario
            : estiloPredeterminado.colorPrimario,
        colorAcento:colorValido(req.body.colorAcento)
            ? req.body.colorAcento
            : estiloPredeterminado.colorAcento,
        colorFondo:colorValido(req.body.colorFondo)
            ? req.body.colorFondo
            : estiloPredeterminado.colorFondo,
        mostrarBuscador:req.body.mostrarBuscador !== false,
        densidadTarjetas:["normal", "compacta"].includes(req.body.densidadTarjetas)
            ? req.body.densidadTarjetas
            : estiloPredeterminado.densidadTarjetas
    };

    try{

        await Configuracion.guardar(
            "estilo_visitante",
            JSON.stringify(estilo)
        );

        res.json(estilo);

    }catch(error){
        res.status(500).json({ error:"No se pudo guardar la configuracion." });
    }

};

const obtenerEstiloAdmin = async(req,res)=>{

    try{
        res.json(await obtenerConfiguracion(
            "estilo_admin",
            estiloAdminPredeterminado
        ));
    }catch(error){
        res.status(500).json({ error:"No se pudo obtener la configuracion." });
    }

};

const guardarEstiloAdmin = async(req,res)=>{

    const estilo = {
        colorPrincipal:colorValido(req.body.colorPrincipal)
            ? req.body.colorPrincipal
            : estiloAdminPredeterminado.colorPrincipal,
        colorAcento:colorValido(req.body.colorAcento)
            ? req.body.colorAcento
            : estiloAdminPredeterminado.colorAcento,
        colorFondo:colorValido(req.body.colorFondo)
            ? req.body.colorFondo
            : estiloAdminPredeterminado.colorFondo,
        densidad:["normal", "compacta"].includes(req.body.densidad)
            ? req.body.densidad
            : estiloAdminPredeterminado.densidad
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
