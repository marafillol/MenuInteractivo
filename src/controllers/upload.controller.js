const uploadService = require("../services/upload.service");

function subirImagen(req, res) {
    if (!req.file) {
        return res.status(400).json({
            mensaje: "No se recibio ninguna imagen"
        });
    }

    res.status(201).json(uploadService.buildImageUploadResponse(req.file));
}

module.exports = {
    subirImagen
};
