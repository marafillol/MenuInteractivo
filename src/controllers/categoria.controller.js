const categoriaService = require("../services/categoria.service");

async function listarCategorias(req, res) {
    res.json(await categoriaService.listarCategorias());
}

async function obtenerCategoria(req, res) {
    res.json(await categoriaService.obtenerCategoria(req.params.id));
}

async function crearCategoria(req, res) {
    const categoria = await categoriaService.crearCategoria(req.body);
    res.status(201).json({
        mensaje: "Categoria creada con exito",
        categoria
    });
}

async function actualizarCategoria(req, res) {
    const categoria = await categoriaService.actualizarCategoria(req.params.id, req.body);
    res.json({
        mensaje: "Categoria actualizada",
        categoria
    });
}

async function eliminarCategoria(req, res) {
    await categoriaService.eliminarCategoria(req.params.id);
    res.json({ mensaje: "Categoria eliminada" });
}

module.exports = {
    listarCategorias,
    obtenerCategoria,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria
};
