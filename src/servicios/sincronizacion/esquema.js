const db = require("../../database");
const { esModoLocal } = require("../../config/modoServidor");

function all(sql, valores = []) {
    return new Promise((resolve, reject) => db.all(sql, valores, (error, filas) =>
        error ? reject(error) : resolve(filas || [])
    ));
}

async function columnasDe(tabla) {
    if (!/^[a-z_][a-z0-9_]*$/i.test(tabla)) throw new Error("Nombre de tabla no válido.");
    if (esModoLocal) {
        return all(`PRAGMA table_info("${tabla}")`);
    }
    return all(
        "SELECT column_name AS name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ?",
        [tabla]
    );
}

async function estaPreparado(tablas) {
    if (typeof db.withTransaction !== "function") return false;
    try {
        for (const tabla of tablas) {
            const columnas = await columnasDe(tabla);
            const nombres = new Set(columnas.map((columna) => columna.name));
            if (!["sync_id", "sync_version", "sync_deleted_at"].every((nombre) => nombres.has(nombre))) {
                return false;
            }
        }
        if (esModoLocal) {
            const filas = await all("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sync_eventos'");
            return filas.length === 1;
        }
        const filas = await all(
            "SELECT to_regclass('public.sync_eventos') AS tabla"
        );
        return Boolean(filas[0]?.tabla);
    } catch {
        return false;
    }
}

module.exports = { estaPreparado, columnasDe };
