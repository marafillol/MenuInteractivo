
const Ficha = require("../modelos/ficha");
const Menu = require("../modelos/menu");
const Etiqueta = require("../modelos/etiquetaModelo");
const Multimedia = require("../modelos/multimedia");
const Plantilla = require("../modelos/plantilla");

const LIMITE_POR_TIPO = 8;

function normalizar(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function coincide(consulta, ...campos) {
    return campos.some(campo =>
        normalizar(campo).includes(consulta)
    );
}

function recortar(texto, largo = 90) {
    const limpio = String(texto ?? "")
        .replace(/\s+/g, " ")
        .trim();

    return limpio.length > largo
        ? limpio.slice(0, largo) + "…"
        : limpio;
}

const buscar = async (req, res) => {
    try {
        const consulta = normalizar(req.query.q).trim();

        if (consulta.length < 1) {
            return res.json([]);
        }

        const [fichas, menus, etiquetas, multimedia, plantillas] =
            await Promise.all([
                Ficha.obtenerFichas(),
                Menu.obtenerMenus(),
                Etiqueta.obtenerTodas(),
                Multimedia.obtenerMultimedia(),
                Plantilla.obtenerPlantillas()
            ]);

        const resultadosFichas = fichas
            .filter(f =>
                coincide(consulta, f.titulo, f.resumen, f.texto)
            )
            .slice(0, LIMITE_POR_TIPO)
            .map(f => ({
                tipo: "ficha",
                id: f.id_ficha,
                titulo: f.titulo,
                extra: recortar(f.resumen)
            }));

        const resultadosMenus = menus
            .filter(m =>
                coincide(consulta, m.nombre, m.descripcion)
            )
            .slice(0, LIMITE_POR_TIPO)
            .map(m => ({
                tipo: "menu",
                id: m.id_menu,
                titulo: m.nombre || m.descripcion,
                extra: m.nombre ? recortar(m.descripcion) : ""
            }));

        const resultadosEtiquetas = etiquetas
            .filter(e =>
                coincide(consulta, e.nombre, e.titulo, e.descripcion)
            )
            .slice(0, LIMITE_POR_TIPO)
            .map(e => ({
                tipo: "etiqueta",
                id: e.id_etiqueta ?? e.id,
                titulo: e.nombre || e.titulo || e.descripcion,
                extra: recortar(e.descripcion)
            }));

        const resultadosMultimedia = multimedia
            .filter(m =>
                coincide(
                    consulta,
                    m.descripcion,
                    m.tipo_multi,
                    m.ficha,
                    m.menu
                )
            )
            .slice(0, LIMITE_POR_TIPO)
            .map(m => ({
                tipo: "multimedia",
                id: m.id_multi,
                titulo: m.descripcion ||
                    m.tipo_multi ||
                    `Multimedia #${m.id_multi}`,
                extra: [
                    m.tipo_multi,
                    m.ficha ? `Ficha: ${m.ficha}` : ""
                ].filter(Boolean).join(" · ")
            }));

        const resultadosPlantillas = plantillas
            .filter(p =>
                coincide(consulta, p.nombre, p.descripcion)
            )
            .slice(0, LIMITE_POR_TIPO)
            .map(p => ({
                tipo: "plantilla",
                id: p.id_plantilla,
                titulo: p.nombre || `Plantilla #${p.id_plantilla}`,
                extra: recortar(p.descripcion)
            }));

        res.json([
            ...resultadosFichas,
            ...resultadosMenus,
            ...resultadosEtiquetas,
            ...resultadosMultimedia,
            ...resultadosPlantillas
        ]);

    } catch (error) {
        console.error("Error en búsqueda global:", error);

        res.status(500).json({
            error: "No se pudo realizar la búsqueda."
        });
    }
};

module.exports = { buscar };
