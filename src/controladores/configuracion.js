
const Configuracion = require("../modelos/configuracion");

// Configuración funcional del tótem.
// La apariencia visual de fichas y menús se define en las plantillas.
const configuracionVisitantePredeterminada = {
    orientacionTotem: "horizontal",
    tiempoInactividad: 0
};

const estiloAdminPredeterminado = {
    colorPrincipal: "#163A61",
    colorAcento: "#DBB060",
    colorFondo: "#F4EDDB",
    densidad: "normal"
};

const colorValido = (color) =>
    /^#[0-9a-fA-F]{6}$/.test(color || "");

let estiloVisitanteEnCache = null;
let promesaCargaEstiloVisitante = null;

const obtenerConfiguracion = async (clave, valoresPredeterminados) => {
    const valor = await Configuracion.obtener(clave);

    if (!valor) {
        return valoresPredeterminados;
    }

    try {
        return {
            ...valoresPredeterminados,
            ...JSON.parse(valor)
        };
    } catch (error) {
        return valoresPredeterminados;
    }
};

// Lee solamente las dos propiedades funcionales del tótem.
// Ignora las propiedades visuales que pudieran quedar guardadas
// en la base de datos de versiones anteriores.
const obtenerConfiguracionVisitante = async () => {
    const configuracion = await obtenerConfiguracion(
        "estilo_visitante",
        configuracionVisitantePredeterminada
    );

    const orientacionTotem = [
        "horizontal",
        "right",
        "left"
    ].includes(configuracion.orientacionTotem)
        ? configuracion.orientacionTotem
        : "horizontal";

    const tiempoRecibido = Number(configuracion.tiempoInactividad);

    const tiempoInactividad = Number.isFinite(tiempoRecibido)
        ? tiempoRecibido <= 0
            ? 0
            : Math.min(
                Math.max(Math.floor(tiempoRecibido), 10),
                86400
            )
        : 0;

    return {
        orientacionTotem,
        tiempoInactividad
    };
};

const obtenerEstiloVisitante = async (req, res) => {
    try {
        if (estiloVisitanteEnCache !== null) {
            return res.json(estiloVisitanteEnCache);
        }

        if (!promesaCargaEstiloVisitante) {
            promesaCargaEstiloVisitante =
                obtenerConfiguracionVisitante();
        }

        const configuracion = await promesaCargaEstiloVisitante;

        estiloVisitanteEnCache = configuracion;

        return res.json(configuracion);
    } catch (error) {
        console.error(
            "Error al obtener la configuración del tótem:",
            error.message
        );

        return res.status(500).json({
            error: "No se pudo obtener la configuración."
        });
    } finally {
        promesaCargaEstiloVisitante = null;
    }
};

const guardarEstiloVisitante = async (req, res) => {
    try {
        const actual = await obtenerConfiguracionVisitante();

        const rawOrientacion =
            typeof req.body.orientacionTotem === "string"
                ? req.body.orientacionTotem.toLowerCase().trim()
                : "";

        let orientacionTotem = actual.orientacionTotem;

        if (
            rawOrientacion.includes("left") ||
            rawOrientacion.includes("izquierda") ||
            rawOrientacion === "-90"
        ) {
            orientacionTotem = "left";
        } else if (
            rawOrientacion.includes("right") ||
            rawOrientacion.includes("derecha") ||
            rawOrientacion === "90"
        ) {
            orientacionTotem = "right";
        } else if (
            rawOrientacion === "" ||
            rawOrientacion.includes("horizontal") ||
            rawOrientacion.includes("normal")
        ) {
            orientacionTotem = "horizontal";
        }

        let tiempoInactividad = actual.tiempoInactividad;

        if (req.body.tiempoInactividad !== undefined) {
            const recibido = Math.floor(
                Number(req.body.tiempoInactividad)
            );

            if (Number.isFinite(recibido)) {
                tiempoInactividad =
                    recibido <= 0
                        ? 0
                        : Math.min(
                            Math.max(recibido, 10),
                            86400
                        );
            }
        }

        const configuracion = {
            orientacionTotem,
            tiempoInactividad
        };

        await Configuracion.guardar(
            "estilo_visitante",
            JSON.stringify(configuracion)
        );

        estiloVisitanteEnCache = configuracion;

        return res.json(configuracion);
    } catch (error) {
        console.error(
            "Error al guardar la configuración del tótem:",
            error.message
        );

        return res.status(500).json({
            error: "No se pudo guardar la configuración."
        });
    }
};

// La configuración del administrador se conserva sin cambios.
const obtenerEstiloAdmin = async (req, res) => {
    try {
        res.json(
            await obtenerConfiguracion(
                "estilo_admin",
                estiloAdminPredeterminado
            )
        );
    } catch (error) {
        res.status(500).json({
            error: "No se pudo obtener la configuración."
        });
    }
};

const guardarEstiloAdmin = async (req, res) => {
    const estilo = {
        colorPrincipal: colorValido(req.body.colorPrincipal)
            ? req.body.colorPrincipal
            : estiloAdminPredeterminado.colorPrincipal,

        colorAcento: colorValido(req.body.colorAcento)
            ? req.body.colorAcento
            : estiloAdminPredeterminado.colorAcento,

        colorFondo: colorValido(req.body.colorFondo)
            ? req.body.colorFondo
            : estiloAdminPredeterminado.colorFondo,

        densidad: ["normal", "compacta"].includes(req.body.densidad)
            ? req.body.densidad
            : estiloAdminPredeterminado.densidad
    };

    try {
        await Configuracion.guardar(
            "estilo_admin",
            JSON.stringify(estilo)
        );

        res.json(estilo);
    } catch (error) {
        res.status(500).json({
            error: "No se pudo guardar la configuración."
        });
    }
};

module.exports = {
    obtenerEstiloVisitante,
    guardarEstiloVisitante,
    obtenerEstiloAdmin,
    guardarEstiloAdmin
};
