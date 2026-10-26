
const cachePublica = require("../../servicios/cachePublica");

async function obtenerEtiquetas(req, res) {
    const etiquetas = cachePublica.obtenerDatosPublicos("etiquetas");

    if (etiquetas === null) {
        return res.status(503).json({
            error: "Las etiquetas públicas todavía se están preparando."
        });
    }

    res.json(etiquetas);
}

module.exports = {
    obtenerEtiquetas
};
