
const Ficha = require("../modelos/public/ficha");
const Menu = require("../modelos/public/menu");
const Etiqueta = require("../modelos/public/etiquetas");
const { interpretarJson } = require("../utilidades/interpretarJson");

const INTERVALO_ACTUALIZACION = 30_000;

const datos = {
    fichas: null,
    menus: null,
    etiquetas: null
};

let actualizacionEnCurso = null;

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

async function actualizarCachePublica() {
    if (actualizacionEnCurso) {
        return actualizacionEnCurso;
    }

    actualizacionEnCurso = (async () => {
        const [filasFichas, menus, etiquetas] = await Promise.all([
            Ficha.obtenerTodas(),
            Menu.obtenerMenus(),
            Etiqueta.obtenerTodas()
        ]);

        // Reemplazar los datos solo cuando las tres consultas terminan bien.
        datos.fichas = prepararFichas(filasFichas);
        datos.menus = menus;
        datos.etiquetas = etiquetas;

        console.log("[CACHE PUBLICA] Datos actualizados:", {
            fichas: datos.fichas.length,
            menus: datos.menus.length,
            etiquetas: datos.etiquetas.length
        });
    })();

    try {
        await actualizacionEnCurso;
    } finally {
        actualizacionEnCurso = null;
    }
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
