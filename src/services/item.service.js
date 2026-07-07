const Item = require("../models/item.model");
const Menu = require("../models/menu.model");
const httpError = require("../utils/httpError");

function normalizeItemPayload(data) {
    return {
        id_menu: data.id_menu || data.menuId,
        titulo: data.titulo ? data.titulo.trim() : "",
        resumen: data.resumen || null,
        texto: data.texto || null,
        imagen: data.imagen || data.Imagen || null,
        id_plantilla: data.id_plantilla || null,
        datos_json: data.datos_json || null,
        visible: data.visible !== undefined ? Number(data.visible) : 1
    };
}

async function assertMenuExists(idMenu) {
    const menu = await Menu.findById(idMenu);
    if (!menu) throw httpError(404, "Menu no encontrado para la ficha");
}

async function listarItems() {
    return Item.findAll();
}

async function listarItemsPorMenu(menuId) {
    await assertMenuExists(menuId);
    return Item.findByMenu(menuId);
}

async function obtenerItem(id) {
    const item = await Item.findById(id);
    if (!item) throw httpError(404, "Ficha no encontrada");
    return item;
}

async function crearItem(data) {
    const item = normalizeItemPayload(data);
    if (!item.id_menu) throw httpError(400, "El menu de la ficha es obligatorio");
    if (!item.titulo) throw httpError(400, "El titulo de la ficha es obligatorio");
    await assertMenuExists(item.id_menu);
    return Item.create(item);
}

async function actualizarItem(id, data) {
    await obtenerItem(id);
    const item = normalizeItemPayload(data);
    if (!item.titulo) throw httpError(400, "El titulo de la ficha es obligatorio");
    return Item.update(id, item);
}

async function actualizarVisibilidad(id, visible) {
    await obtenerItem(id);
    if (![0, 1, true, false].includes(visible)) {
        throw httpError(400, "El campo visible debe ser 0, 1, true o false");
    }
    return Item.updateVisibility(id, Number(visible));
}

async function eliminarItem(id) {
    await obtenerItem(id);
    return Item.remove(id);
}

function parseJsonSeguro(valor) {
    if (!valor) return {};

    try {
        return JSON.parse(valor);
    } catch (error) {
        console.error("JSON invalido guardado en la base de datos:", error.message);
        return {};
    }
}

async function obtenerEstructuraPantalla(menuId) {
    const menu = await Menu.findById(menuId);
    if (!menu) throw httpError(404, "Menu no encontrado");

    const fichas = await Item.findByMenu(menuId);

    return {
        configuracionMenu: {
            id: menu.id_menu,
            descripcion: menu.descripcion,
            imagenFondo: menu.imagen,
            interfazConfig: parseJsonSeguro(menu.interfaz_json)
        },
        elementosFichas: fichas.map((ficha) => ({
            id: ficha.id_ficha,
            titulo: ficha.titulo,
            resumen: ficha.resumen,
            texto: ficha.texto,
            imagen: ficha.imagen,
            plantillaId: ficha.id_plantilla,
            datosEstructurales: parseJsonSeguro(ficha.datos_json),
            visible: ficha.visible
        }))
    };
}

module.exports = {
    listarItems,
    listarItemsPorMenu,
    obtenerItem,
    crearItem,
    actualizarItem,
    actualizarVisibilidad,
    eliminarItem,
    obtenerEstructuraPantalla
};
