const multimediaService = require("../services/multimedia.service");

async function listarPorFicha(req, res) {
    res.json(await multimediaService.listarPorFicha(req.params.id));
}

async function crearMultimedia(req, res) {
    const multimedia = await multimediaService.crearMultimedia(req.body);
    res.status(201).json({
        mensaje: "Archivo multimedia asociado con exito",
        id_contenido: multimedia.id_multi,
        multimedia
    });
}

module.exports = {
    listarPorFicha,
    crearMultimedia
};
