const Ficha =
require("../../modelos/public/ficha");
const cachePublica = require("../../servicios/cachePublica");
const { interpretarJson } = require("../../utilidades/interpretarJson");

async function obtenerFichas(req, res) {
    const inicio = performance.now();

    try {
        let fichas = cachePublica.obtenerDatosPublicos("fichas");

        if (fichas === null) {
            return res.status(503).json({
                error: "Los datos públicos todavía se están preparando."
            });
        }

        console.log(
            `[CACHE PUBLICA] Fichas servidas en ${(
                performance.now() - inicio
            ).toFixed(1)} ms`
        );

        res.json(fichas);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Error al obtener las fichas."
        });
    }
}


async function obtenerFichasPorMenu(req, res) {
    const inicio = performance.now();

    try {
        const fichasCacheadas =
            cachePublica.obtenerDatosPublicos("fichas");

        if (fichasCacheadas === null) {
            return res.status(503).json({
                error: "Los datos públicos todavía se están preparando."
            });
        }

        const idMenu = Number(req.params.id_menu);

        const fichas = fichasCacheadas.filter(
            ficha => Number(ficha.id_menu) === idMenu
        );

        console.log(
            `[CACHE PUBLICA] Fichas del menú ${idMenu} servidas en ${
                (performance.now() - inicio).toFixed(1)
            } ms`
        );

        return res.json(fichas);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Error al obtener las fichas."
        });
    }
}
async function obtenerFichasPorEtiqueta(req, res) {
    try {
        const idEtiqueta = Number(req.params.id_etiqueta);

        const fichas = cachePublica.obtenerDatosPublicos("fichas");
        const relaciones = cachePublica.obtenerDatosPublicos(
            "relacionesEtiquetas"
        );

        if (fichas === null || relaciones === null) {
            return res.status(503).json({
                error: "Los datos públicos todavía se están cargando."
            });
        }

        const idsFichas = new Set(
            relaciones
                .filter(
                    relacion =>
                        Number(relacion.id_etiqueta) === idEtiqueta
                )
                .map(relacion => Number(relacion.id_ficha))
        );

        const fichasFiltradas = fichas.filter(
            ficha => idsFichas.has(Number(ficha.id_ficha))
        );

        return res.json(fichasFiltradas);
    } catch (error) {
        console.error(
            "[FICHAS PUBLICAS] Error al filtrar por etiqueta:",
            error
        );

        return res.status(500).json({
            error: "Error al obtener las fichas de la etiqueta."
        });
    }
}

async function obtenerFichaPorId(req, res) {
    const inicioTotal = performance.now();
    const idFicha = Number(req.params.id_ficha);

    try {
        const fichasDetalle =
            cachePublica.obtenerDatosPublicos("fichasDetalle");

        if (!fichasDetalle) {
            return res.status(503).json({
                error: "Los datos públicos todavía no están disponibles."
            });
        }

        const ficha = fichasDetalle.find(
            elemento => Number(elemento.id_ficha) === idFicha
        );

        if (!ficha) {
            return res.status(404).json({
                error: "Ficha no encontrada"
            });
        }

        ficha.etiquetas = ficha.etiquetas || [];
        ficha.relacionadas = ficha.relacionadas || [];
        ficha.multimedia = ficha.multimedia || [];

        console.log(
            `[TIEMPO FICHA ${idFicha}] Total antes de responder: ${
                (performance.now() - inicioTotal).toFixed(1)
            } ms`
        );

        return res.json(ficha);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Error al obtener la ficha."
        });
    }
}

module.exports={
    obtenerFichas,
    obtenerFichasPorMenu,
    obtenerFichasPorEtiqueta,
    obtenerFichaPorId
};