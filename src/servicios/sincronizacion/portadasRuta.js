function normalizarRutaPortada(ruta) {
    return String(ruta || "").split("\\").join("/");
}

module.exports = { normalizarRutaPortada };
