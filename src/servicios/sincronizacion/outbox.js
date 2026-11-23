const { randomUUID } = require("node:crypto");

/**
 * Registra un cambio en la bandeja de salida dentro de la transacción
 * que modifica el contenido. El llamador debe invocarlo usando el mismo
 * callback "consultar" recibido por db.withTransaction().
 */
async function registrarEvento(consultar, {
    dispositivoId,
    entidad,
    operacion,
    syncId,
    versionBase = 0,
    versionResultado = 1,
    payload = null
}) {
    if (typeof consultar !== "function") {
        throw new TypeError("Se requiere el ejecutor de la transacción.");
    }
    if (!dispositivoId || !entidad || !operacion || !syncId) {
        throw new Error("Faltan datos obligatorios para registrar el evento.");
    }
    if (!["INSERT", "UPDATE", "DELETE"].includes(operacion)) {
        throw new Error("Operación de sincronización no válida.");
    }

    const eventId = randomUUID();
    const payloadJson = payload === null ? null : JSON.stringify(payload);

    await consultar(
        `INSERT INTO sync_eventos (
            evento_id, origen_device_id, entidad, operacion, sync_id,
            version_base, version_resultado, payload_json, creado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
            eventId,
            dispositivoId,
            entidad,
            operacion,
            syncId,
            versionBase,
            versionResultado,
            payloadJson
        ]
    );

    return eventId;
}

module.exports = { registrarEvento };
