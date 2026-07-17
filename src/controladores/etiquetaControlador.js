const Etiqueta =
require("../modelos/etiquetaModelo");
const FichaEtiqueta = require("../modelos/fichaEtiquetaModelo");


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

        res.json(etiqueta);

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


        res.json(etiqueta);


    }catch(error){

        res.status(500).json({
            error:error.message
        });

    }

};


exports.eliminarEtiqueta = async (req, res) => {

    try {

        const id = req.params.id;

        await FichaEtiqueta.eliminarEtiquetasRelacionadas(id);

        const resultado = await Etiqueta.eliminar(id);

        res.json(resultado);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message
        });

    }

};