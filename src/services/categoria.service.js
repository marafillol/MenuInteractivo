const Categoria = require("../models/categoria.model");
const httpError = require("../utils/httpError");

function normalizeCategoriaPayload(data) {
    return {
        nombre: data.nombre ? data.nombre.trim() : "",
        descripcion: data.descripcion || null,
        activo: data.activo !== undefined ? Number(data.activo) : 1
    };
}

async function listarCategorias() {
    return Categoria.findAll();
}

async function obtenerCategoria(id) {
    const categoria = await Categoria.findById(id);
    if (!categoria) throw httpError(404, "Categoria no encontrada");
    return categoria;
}

async function crearCategoria(data) {
    const categoria = normalizeCategoriaPayload(data);
    if (!categoria.nombre) throw httpError(400, "El nombre de la categoria es obligatorio");
    return Categoria.create(categoria);
}

async function actualizarCategoria(id, data) {
    await obtenerCategoria(id);
    const categoria = normalizeCategoriaPayload(data);
    if (!categoria.nombre) throw httpError(400, "El nombre de la categoria es obligatorio");
    return Categoria.update(id, categoria);
}

async function eliminarCategoria(id) {
    await obtenerCategoria(id);
    return Categoria.remove(id);
}

module.exports = {
    listarCategorias,
    obtenerCategoria,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria
};
