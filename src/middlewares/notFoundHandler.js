function notFoundHandler(req, res) {
    res.status(404).json({
        mensaje: "Recurso no encontrado"
    });
}

module.exports = notFoundHandler;
