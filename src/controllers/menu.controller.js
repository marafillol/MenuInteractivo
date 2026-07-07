const menuService = require("../services/menu.service");

async function listarMenus(req, res) {
    res.json(await menuService.listarMenus());
}

async function obtenerMenu(req, res) {
    res.json(await menuService.obtenerMenu(req.params.id));
}

async function crearMenu(req, res) {
    const menu = await menuService.crearMenu(req.body);
    res.status(201).json({
        mensaje: "Menu creado con exito",
        id_menu: menu.id_menu,
        menu
    });
}

async function actualizarMenu(req, res) {
    const menu = await menuService.actualizarMenu(req.params.id, req.body);
    res.json({
        mensaje: "Menu actualizado",
        menu
    });
}

async function eliminarMenu(req, res) {
    await menuService.eliminarMenu(req.params.id);
    res.json({ mensaje: "Menu eliminado" });
}

module.exports = {
    listarMenus,
    obtenerMenu,
    crearMenu,
    actualizarMenu,
    eliminarMenu
};
