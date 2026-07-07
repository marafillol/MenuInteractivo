const itemService = require("../services/item.service");

async function listarItems(req, res) {
    res.json(await itemService.listarItems());
}

async function listarItemsPorMenu(req, res) {
    res.json(await itemService.listarItemsPorMenu(req.params.id || req.params.menuId));
}

async function obtenerItem(req, res) {
    res.json(await itemService.obtenerItem(req.params.id));
}

async function crearItem(req, res) {
    const item = await itemService.crearItem(req.body);
    res.status(201).json({
        mensaje: "Ficha estructurada creada",
        id_ficha: item.id_ficha,
        item
    });
}

async function actualizarItem(req, res) {
    const item = await itemService.actualizarItem(req.params.id, req.body);
    res.json({
        mensaje: "Ficha actualizada",
        item
    });
}

async function actualizarVisibilidad(req, res) {
    const item = await itemService.actualizarVisibilidad(req.params.id, req.body.visible);
    res.json({
        mensaje: "Visibilidad actualizada",
        item
    });
}

async function eliminarItem(req, res) {
    await itemService.eliminarItem(req.params.id);
    res.json({ mensaje: "Ficha eliminada" });
}

async function obtenerEstructuraPantalla(req, res) {
    res.json(await itemService.obtenerEstructuraPantalla(req.params.id_menu || req.params.menuId));
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
