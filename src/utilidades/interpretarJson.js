
function interpretarJson(valor) {
    if (valor === null || valor === undefined) {
        return valor;
    }

    // PostgreSQL puede devolver JSONB como objeto.
    if (typeof valor === "object") {
        return valor;
    }

    // SQLite puede devolver JSON como cadena.
    if (typeof valor === "string") {
        return JSON.parse(valor);
    }

    return valor;
}

module.exports = { interpretarJson };
