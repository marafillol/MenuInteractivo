const { randomUUID } = require("node:crypto");

const CLAVE_DEVICE_ID = "sync.device_id";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Crea una identidad estable por instalación/nodo. SQLite y PostgreSQL
 * persisten el UUID en configuracion para identificar el origen de eventos.
 */
function crearServicioDispositivo({ db, esModoLocal, generarUUID = randomUUID }) {
    if (!db || typeof db.withTransaction !== "function") {
        throw new TypeError("Se requiere una base de datos con withTransaction().");
    }

    async function obtenerIdDispositivo() {
        return db.withTransaction(async (consultar) => {
            const resultado = await consultar(
                "SELECT valor FROM configuracion WHERE clave = ?",
                [CLAVE_DEVICE_ID]
            );
            const existente = resultado.rows[0]?.valor;

            if (existente !== undefined) {
                if (typeof existente !== "string" || !UUID_RE.test(existente)) {
                    throw new Error(
                        "El device_id local existente no es un UUID válido. Se conserva sin reemplazar para evitar perder la identidad de eventos anteriores."
                    );
                }
                return existente;
            }

            const nuevo = generarUUID();
            if (typeof nuevo !== "string" || !UUID_RE.test(nuevo)) {
                throw new Error("El generador no devolvió un UUID válido.");
            }

            await consultar(
                "INSERT INTO configuracion (clave, valor, actualizado) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT (clave) DO NOTHING",
                [CLAVE_DEVICE_ID, nuevo]
            );

            const confirmado = await consultar(
                "SELECT valor FROM configuracion WHERE clave = ?",
                [CLAVE_DEVICE_ID]
            );
            const idPersistido = confirmado.rows[0]?.valor;
            if (typeof idPersistido !== "string" || !UUID_RE.test(idPersistido)) {
                throw new Error("No se pudo persistir una identidad válida para este nodo.");
            }
            return idPersistido;
        });
    }

    return { obtenerIdDispositivo };
}

async function obtenerIdDispositivo() {
    const { esModoLocal } = require("../../config/modoServidor");
    const db = require("../../database");
    return crearServicioDispositivo({ db, esModoLocal }).obtenerIdDispositivo();
}

module.exports = {
    CLAVE_DEVICE_ID,
    crearServicioDispositivo,
    obtenerIdDispositivo
};
