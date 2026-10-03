const Ficha = require("../modelos/ficha");
const Menu = require("../modelos/menu");
const Etiqueta = require("../modelos/etiquetaModelo");

// Máximo de resultados que se devuelven por cada tipo
const LIMITE_POR_TIPO = 8;

// Minúsculas y sin tildes, para que "ñ", "á", etc. no impidan encontrar cosas
function normalizar(texto) {

    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

}

function coincide(consulta, ...campos) {

    return campos.some(
        campo => normalizar(campo).includes(consulta)
    );

}

function recortar(texto, largo = 90) {

    const limpio = String(texto ?? "").replace(/\s+/g, " ").trim();

    return limpio.length > largo
        ? limpio.slice(0, largo) + "…"
        : limpio;

}

// ==========================
// BÚSQUEDA GLOBAL
// GET /api/buscar?q=texto
// ==========================

const buscar = async (req, res) => {

    try {

        const consulta = normalizar(req.query.q).trim();

        // Con menos de 2 letras no se busca
        if (consulta.length < 2) {
            return res.json([]);
        }

        const [fichas, menus, etiquetas] = await Promise.all([
            Ficha.obtenerFichas(),
            Menu.obtenerMenus(),
            Etiqueta.obtenerTodas()
        ]);

        const resultadosFichas = fichas
            .filter(f => coincide(consulta, f.titulo, f.resumen, f.texto))
            .slice(0, LIMITE_POR_TIPO)
            .map(f => ({
                tipo: "ficha",
                id: f.id_ficha,
                titulo: f.titulo,
                extra: recortar(f.resumen)
            }));

        const resultadosMenus = menus
            .filter(m => coincide(consulta, m.nombre, m.descripcion))
            .slice(0, LIMITE_POR_TIPO)
            .map(m => ({
                tipo: "menu",
                id: m.id_menu,
                titulo: m.nombre || m.descripcion,
                extra: m.nombre ? recortar(m.descripcion) : ""
            }));

        const resultadosEtiquetas = etiquetas
            .filter(e => coincide(consulta, e.nombre, e.titulo, e.descripcion))
            .slice(0, LIMITE_POR_TIPO)
            .map(e => ({
                tipo: "etiqueta",
                id: e.id_etiqueta ?? e.id,
                titulo: e.nombre || e.titulo || e.descripcion,
                extra: ""
            }));

        res.json([
            ...resultadosFichas,
            ...resultadosMenus,
            ...resultadosEtiquetas
        ]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message
        });

    }

};

module.exports = {
    buscar
};