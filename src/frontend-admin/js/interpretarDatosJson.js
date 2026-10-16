(function (root) {
    function interpretarDatosJson(valor) {
        if (valor === null || valor === undefined || valor === "") {
            return {};
        }

        // PostgreSQL devuelve JSONB como objeto; SQLite suele devolver texto.
        if (typeof valor !== "string") {
            return valor;
        }

        try {
            return JSON.parse(valor);
        } catch (error) {
            return {};
        }
    }

    root.interpretarDatosJson = interpretarDatosJson;

    if (typeof module === "object" && module.exports) {
        module.exports = { interpretarDatosJson };
    }
})(typeof window !== "undefined" ? window : globalThis);
