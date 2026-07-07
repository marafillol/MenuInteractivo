function buildImageUploadResponse(file) {
    const url = `/uploads/images/${file.filename}`;

    return {
        mensaje: "Imagen subida correctamente",
        archivo: file.filename,
        ruta: url,
        url
    };
}

module.exports = {
    buildImageUploadResponse
};
