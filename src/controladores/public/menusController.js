
const cachePublica = require("../../servicios/cachePublica");

async function obtenerMenus(req, res) {
    const menus = cachePublica.obtenerDatosPublicos("menus");

    if (menus === null) {
        return res.status(503).json({
            error: "Los menús públicos todavía se están preparando."
        });
    }

    res.json(menus);
}

module.exports = {
    obtenerMenus
};
