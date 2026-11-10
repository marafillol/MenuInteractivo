const { randomUUID } = require("node:crypto");

const CLAVE_DEVICE_ID = "sync.device_id";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Crea el servicio de identidad de una instalación local.
 * La identidad se persiste en configuracion dentro de una transacción
 * SQLite BEGIN IMMEDIATE, por lo que llamadas concurrentes comparten el UUID.
 */
function crearServicioDispositivo({ db, esModoLocal, generarUUID = randomUUID }) {
    if (!db || typeof db.withTransaction !== "function") {
        throw new TypeError("Se requiere una base de datos con withTransaction().");
    }

    async function obtenerIdDispositivo() {
        if (esModoLocal !== true) {
            throw new Error(
                "El device_id solo se obtiene desde una instalación local SQLite; no debe compartirse desde Supabase."
            );
        }

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
                "INSERT INTO configuracion (clave, valor, actualizado) VALUES (?, ?, CURRENT_TIMESTAMP)",
                [CLAVE_DEVICE_ID, nuevo]
            );

            return nuevo;
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
