
const Ficha = require("../modelos/public/ficha");
const Menu = require("../modelos/public/menu");
const Etiqueta = require("../modelos/public/etiquetas");
const { interpretarJson } = require("../utilidades/interpretarJson");

const INTERVALO_ACTUALIZACION = 30 * 60 * 1000;

const datos = {
    fichas: null,
    fichasDetalle: null,
    menus: null,
    etiquetas: null,
    relacionesEtiquetas: null
};

let actualizacionEnCurso = null;
const coleccionesPendientes = new Set();

function prepararFichas(filas) {
    return filas.map(ficha => {
        const resultado = { ...ficha };

        resultado.datos_json = resultado.datos_json
            ? interpretarJson(resultado.datos_json)
            : {};

        resultado.plantilla = resultado.plantilla_json
            ? interpretarJson(resultado.plantilla_json)
            : null;

        delete resultado.plantilla_json;

        return resultado;
    });
}

async function cargarDatosPublicos(colecciones) {
    const consultas = {};

    if (colecciones.has("fichas")) {
        consultas.fichas = Ficha.obtenerTodas();
        consultas.fichasDetalle = Ficha.obtenerTodasConDetalle();
    }

    if (colecciones.has("menus")) {
        consultas.menus = Menu.obtenerMenus();
    }

    if (colecciones.has("etiquetas")) {
        consultas.etiquetas = Etiqueta.obtenerTodas();
    }

    // Las relaciones se actualizan cuando cambian las fichas
    // o las etiquetas.
    if (
        colecciones.has("fichas") ||
        colecciones.has("etiquetas")
    ) {
        consultas.relacionesEtiquetas =
            Ficha.obtenerRelacionesEtiquetas();
    }

    // Esperar a que todas las consultas terminen correctamente.
    const resultados = await Promise.all(
        Object.entries(consultas).map(async ([tipo, consulta]) => [
            tipo,
            await consulta
        ])
    );

    // Preparar los resultados antes de publicar los datos.
    const preparados = {};

    for (const [tipo, filas] of resultados) {
        preparados[tipo] =
            tipo === "fichas" || tipo === "fichasDetalle"
                ? prepararFichas(filas)
                : filas;
    }

    // Publicar los resultados de las consultas exitosas.
    for (const [tipo, filas] of Object.entries(preparados)) {
        datos[tipo] = filas;
    }

    console.log("[CACHE PUBLICA] Datos actualizados:", {
        fichas: preparados.fichas?.length,
        fichasDetalle: preparados.fichasDetalle?.length,
        menus: preparados.menus?.length,
        etiquetas: preparados.etiquetas?.length,
        relacionesEtiquetas: preparados.relacionesEtiquetas?.length
    });
}

function actualizarCachePublica(tipos = ["fichas", "menus", "etiquetas"]) {
    const colecciones = Array.isArray(tipos) ? tipos : [tipos];
    const permitidas = new Set(["fichas", "menus", "etiquetas"]);

    for (const tipo of colecciones) {
        if (!permitidas.has(tipo)) {
            return Promise.reject(
                new Error(`Colección pública no válida: ${tipo}`)
            );
        }

        coleccionesPendientes.add(tipo);
    }

    if (actualizacionEnCurso) {
        return actualizacionEnCurso;
    }

    actualizacionEnCurso = (async () => {
        try {
            while (coleccionesPendientes.size > 0) {
                const lote = new Set(coleccionesPendientes);
                coleccionesPendientes.clear();

                try {
                    await cargarDatosPublicos(lote);
                } catch (error) {
                    for (const tipo of lote) {
                        coleccionesPendientes.add(tipo);
                    }

                    throw error;
                }
            }
        } finally {
            actualizacionEnCurso = null;
        }
    })();

    return actualizacionEnCurso;
}

function obtenerDatosPublicos(tipo) {
    return datos[tipo];
}

function iniciarActualizacionPeriodica() {
    const temporizador = setInterval(() => {
        actualizarCachePublica().catch(error => {
            console.error(
                "[CACHE PUBLICA] Falló la actualización:",
                error.message
            );
        });
    }, INTERVALO_ACTUALIZACION);

    // El temporizador no debe impedir que Node cierre el proceso.
    if (typeof temporizador.unref === "function") {
        temporizador.unref();
    }
}

module.exports = {
    actualizarCachePublica,
    obtenerDatosPublicos,
    iniciarActualizacionPeriodica
};
