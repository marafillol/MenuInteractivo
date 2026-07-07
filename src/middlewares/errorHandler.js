function errorHandler(error, req, res, next) {
    const isUploadError = error.code && error.code.startsWith("LIMIT_");
    const isInvalidUpload = error.message === "Solo se permiten archivos de imagen";
    const status = error.status || (isUploadError || isInvalidUpload ? 400 : 500);

    if (status >= 500) {
        console.error("Error no controlado en la solicitud:", error);
    }

    res.status(status).json({
        mensaje: error.message || "Ocurrio un error interno en el servidor",
        detalles: error.details || undefined
    });
}

module.exports = errorHandler;

