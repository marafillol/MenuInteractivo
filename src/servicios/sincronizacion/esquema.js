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
        const tablasAuxiliares = ["sync_eventos", "sync_dispositivos", "sync_conflictos"];
        if (esModoLocal) {
            const filas = await all(
                `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${tablasAuxiliares.map(() => "?").join(", ")})`,
                tablasAuxiliares
            );
            return filas.length === tablasAuxiliares.length;
        }
        const filas = await all(
            "SELECT to_regclass('public.sync_eventos') AS eventos, to_regclass('public.sync_dispositivos') AS dispositivos, to_regclass('public.sync_conflictos') AS conflictos"
        );
        return Boolean(filas[0]?.eventos && filas[0]?.dispositivos && filas[0]?.conflictos);
    } catch {
        return false;
    }
}

module.exports = { estaPreparado, columnasDe };
