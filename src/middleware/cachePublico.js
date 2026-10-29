
const cache = new Map();
const solicitudesEnCurso = new Map();

const DURACION_CACHE = 30000;
let versionCache = 0;

function cachePublico(req, res, next) {
    const clave = req.originalUrl;
    const ahora = Date.now();

    const guardado = cache.get(clave);

    if (guardado && guardado.expira > ahora) {
        return res.status(guardado.estado).json(guardado.datos);
    }

    if (guardado) {
        cache.delete(clave);
    }

    // Eliminar entradas vencidas.
    for (const [key, valor] of cache.entries()) {
        if (valor.expira <= ahora) {
            cache.delete(key);
        }
    }

    // Si ya hay una consulta idéntica en curso, reutilizar su resultado.
    const solicitudExistente = solicitudesEnCurso.get(clave);

    if (solicitudExistente) {
        return solicitudExistente
            .then(({ estado, datos }) => {
                if (!res.headersSent && !res.destroyed) {
                    return res.status(estado).json(datos);
                }
            })
            .catch(() => {
                if (!res.headersSent && !res.destroyed) {
                    return res.status(500).json({
                        error: "Error al obtener los datos públicos."
                    });
                }
            });
    }

    // Registrar la versión vigente al comenzar la consulta.
    const versionInicial = versionCache;

    let resolverSolicitud;

    const solicitud = new Promise((resolve) => {
        resolverSolicitud = resolve;
    });

    solicitudesEnCurso.set(clave, solicitud);

    const enviarJsonOriginal = res.json.bind(res);

    res.json = function (datos) {
        const estado = res.statusCode;

        // No guardar resultados de consultas anteriores a una invalidación.
        if (
            estado >= 200 &&
            estado < 300 &&
            versionInicial === versionCache
        ) {
            cache.set(clave, {
                estado,
                datos,
                expira: Date.now() + DURACION_CACHE
            });
        }

        // No borrar una solicitud nueva que haya reemplazado a esta.
        if (solicitudesEnCurso.get(clave) === solicitud) {
            solicitudesEnCurso.delete(clave);
        }

        resolverSolicitud({ estado, datos });

        return enviarJsonOriginal(datos);
    };

    res.on("close", () => {
        if (!res.writableEnded) {
            if (solicitudesEnCurso.get(clave) === solicitud) {
                solicitudesEnCurso.delete(clave);
            }

            resolverSolicitud({
                estado: 500,
                datos: {
                    error: "La solicitud se cerró antes de completarse."
                }
            });
        }
    });

    next();
}

cachePublico.invalidarHTTP = function () {
    versionCache++;
    cache.clear();
    solicitudesEnCurso.clear();
};

cachePublico.invalidar = function (
    colecciones = ["fichas", "menus", "etiquetas"]
) {
    cachePublico.invalidarHTTP();

    const cachePublica = require("../servicios/cachePublica");

    // Mantener el comportamiento de las pruebas y de la caché no inicializada.
    if (cachePublica.obtenerDatosPublicos("fichas") === null) {
        return;
    }

    cachePublica.actualizarCachePublica(colecciones).catch(error => {
        console.error(
            "[CACHE PUBLICA] Falló la actualización tras invalidar:",
            error.message
        );
    });
};
module.exports = cachePublico;
