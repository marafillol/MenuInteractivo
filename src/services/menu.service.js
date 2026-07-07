const Menu = require("../models/menu.model");
const Item = require("../models/item.model");
const httpError = require("../utils/httpError");

function normalizeMenuPayload(data) {
    return {
        descripcion: data.descripcion ? data.descripcion.trim() : "",
        imagen: data.imagen || data.Imagen || null,
        interfaz_json: data.interfaz_json || null,
        visible: data.visible !== undefined ? Number(data.visible) : 1
    };
}

async function listarMenus() {
    return Menu.findAll();
}

async function obtenerMenu(id) {
    const menu = await Menu.findById(id);
    if (!menu) throw httpError(404, "Menu no encontrado");
    return menu;
}

async function crearMenu(data) {
    const menu = normalizeMenuPayload(data);
    if (!menu.descripcion) throw httpError(400, "La descripcion del menu es obligatoria");
    return Menu.create(menu);
}

async function actualizarMenu(id, data) {
    await obtenerMenu(id);
    const menu = normalizeMenuPayload(data);
    if (!menu.descripcion) throw httpError(400, "La descripcion del menu es obligatoria");
    return Menu.update(id, menu);
}

async function eliminarMenu(id) {
    await obtenerMenu(id);
    await Item.removeByMenu(id);
    return Menu.remove(id);
}

module.exports = {
    listarMenus,
    obtenerMenu,
    crearMenu,
    actualizarMenu,
    eliminarMenu
};

