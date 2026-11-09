const Etiqueta =
require("../modelos/etiquetaModelo");
const FichaEtiqueta = require("../modelos/fichaEtiquetaModelo");
const cachePublico = require("../middleware/cachePublico");


exports.obtenerEtiquetas = async(req,res)=>{

    try{

        const etiquetas =
        await Etiqueta.obtenerTodas();


        res.json(etiquetas);


    }catch(error){

        res.status(500).json({
            error:error.message
        });

    }

};


exports.crearEtiqueta = async (req, res) => {
    try {
        const etiqueta = await Etiqueta.crear(req.body);

        cachePublico.invalidar(["etiquetas", "fichas"]);

        res.json(etiqueta);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
};

exports.eliminarEtiqueta = async (req, res) => {
    try {
        const id = req.params.id;

        const resultado = await Etiqueta.eliminarConRelaciones(id);
        if (!resultado.eliminado) {
            return res.status(404).json({ error: "No se encontró la etiqueta." });
        }

        cachePublico.invalidar(["etiquetas", "fichas"]);

        res.json(resultado);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
};

exports.obtenerEtiqueta = async(req,res)=>{

    try{

        const etiqueta =
        await Etiqueta.obtenerPorId(req.params.id);


        res.json(etiqueta);


    }catch(error){

        res.status(500).json({
            error:error.message
        });

    }

};



exports.editarEtiqueta = async(req,res)=>{

    try{

        const etiqueta =
        await Etiqueta.editar(
            req.params.id,
            req.body
        );

        cachePublico.invalidar(["etiquetas", "fichas"]);


        res.json(etiqueta);


    }catch(error){

        res.status(500).json({
            error:error.message
        });

    }

};

