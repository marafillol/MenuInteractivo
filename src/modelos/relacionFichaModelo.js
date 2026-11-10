const db = require("../database");
const { randomUUID } = require("node:crypto");
const { estaPreparado } = require("../servicios/sincronizacion/esquema");
const { registrarEvento } = require("../servicios/sincronizacion/outbox");
const { obtenerIdDispositivo } = require("../servicios/sincronizacion/dispositivo");

async function outboxDisponible() {
    return estaPreparado(["relacion_ficha", "ficha"]);
}

async function buscarFicha(consultar, idFicha) {
    const resultado = await consultar(
        "SELECT sync_id FROM ficha WHERE id_ficha = ?",
        [idFicha]
    );
    return resultado.rows[0]?.sync_id || null;
}

async function registrarRelacion(consultar, dispositivoId, idOrigen, idDestino, tipoRelacion) {
    const origenSyncId = await buscarFicha(consultar, idOrigen);
    const destinoSyncId = await buscarFicha(consultar, idDestino);

    if (!origenSyncId || !destinoSyncId) {
        const local = await consultar(
            "INSERT INTO relacion_ficha (id_ficha_origen, id_ficha_destino, tipo_relacion) VALUES (?, ?, ?)",
            [idOrigen, idDestino, tipoRelacion]
        );
        return local.lastID;
    }

    const syncId = randomUUID();
    const insercion = await consultar(`
        INSERT INTO relacion_ficha (
            id_ficha_origen, id_ficha_destino, tipo_relacion,
            sync_id, sync_version, sync_deleted_at
        ) VALUES (?, ?, ?, ?, 1, NULL)
    `, [idOrigen, idDestino, tipoRelacion, syncId]);

    await registrarEvento(consultar, {
        dispositivoId, entidad: "relacion_ficha", operacion: "INSERT",
        syncId, versionBase: 0, versionResultado: 1,
        payload: {
            ficha_origen_sync_id: origenSyncId,
            ficha_destino_sync_id: destinoSyncId,
            tipo_relacion: tipoRelacion
        }
    });
    return insercion.lastID;
}

async function eliminarFilaRelacion(consultar, dispositivoId, relacion) {
    if (!relacion.sync_id) {
        await consultar("DELETE FROM relacion_ficha WHERE id_relacion = ?", [relacion.id_relacion]);
        return;
    }
    if (relacion.sync_deleted_at) return;

    const origenSyncId = await buscarFicha(consultar, relacion.id_ficha_origen);
    const destinoSyncId = await buscarFicha(consultar, relacion.id_ficha_destino);
    if (!origenSyncId || !destinoSyncId) {
        throw new Error("No se puede eliminar una relación sincronizada sin las identidades de ambas fichas.");
    }

    const versionBase = Number(relacion.sync_version || 1);
    const versionResultado = versionBase + 1;
    const eliminadoEn = new Date().toISOString();
    await consultar(
        "UPDATE relacion_ficha SET sync_deleted_at = ?, sync_version = ? WHERE id_relacion = ?",
        [eliminadoEn, versionResultado, relacion.id_relacion]
    );
    await registrarEvento(consultar, {
        dispositivoId, entidad: "relacion_ficha", operacion: "DELETE",
        syncId: relacion.sync_id, versionBase, versionResultado,
        payload: {
            ficha_origen_sync_id: origenSyncId,
            ficha_destino_sync_id: destinoSyncId,
            tipo_relacion: relacion.tipo_relacion,
            deleted_at: eliminadoEn
        }
    });
}

class RelacionFicha {
    static async obtenerRelaciones(idFicha) {
        const filtro = await outboxDisponible() ? "AND rf.sync_deleted_at IS NULL" : "";
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT
                    rf.id_relacion,
                    CASE WHEN rf.id_ficha_origen = ?
                        THEN rf.id_ficha_destino ELSE rf.id_ficha_origen END AS id_ficha_destino,
                    rf.tipo_relacion,
                    CASE WHEN rf.id_ficha_origen = ?
                        THEN ficha_destino.titulo ELSE ficha_origen.titulo END AS titulo
                FROM relacion_ficha rf
                LEFT JOIN ficha AS ficha_origen
                    ON ficha_origen.id_ficha = rf.id_ficha_origen
                LEFT JOIN ficha AS ficha_destino
                    ON ficha_destino.id_ficha = rf.id_ficha_destino
                WHERE (rf.id_ficha_origen = ? OR rf.id_ficha_destino = ?) ${filtro}
                ORDER BY titulo
            `, [idFicha, idFicha, idFicha, idFicha], (error, filas) =>
                error ? reject(error) : resolve(filas)
            );
        });
    }

    static async eliminarRelacionesFicha(idFicha) {
        if (!await outboxDisponible() || typeof db.withTransaction !== "function") {
            return new Promise((resolve, reject) => db.run(
                "DELETE FROM relacion_ficha WHERE id_ficha_origen = ? OR id_ficha_destino = ?",
                [idFicha, idFicha],
                (error) => error ? reject(error) : resolve()
            ));
        }

        const dispositivoId = await obtenerIdDispositivo();
        return db.withTransaction(async (consultar) => {
            const filas = await consultar(
                "SELECT * FROM relacion_ficha WHERE (id_ficha_origen = ? OR id_ficha_destino = ?) AND sync_deleted_at IS NULL",
                [idFicha, idFicha]
            );
            for (const relacion of filas.rows) {
                await eliminarFilaRelacion(consultar, dispositivoId, relacion);
            }
        });
    }

    static async guardarRelaciones(idFicha, relaciones) {
        if (!Number.isSafeInteger(Number(idFicha)) || Number(idFicha) <= 0) {
            throw new TypeError("La ficha de origen debe tener un ID entero positivo.");
        }
        if (!Array.isArray(relaciones)) {
            throw new TypeError("Las relaciones deben enviarse como una lista.");
        }
        const validas = relaciones.every((relacion) =>
            relacion && typeof relacion === "object" && !Array.isArray(relacion) &&
            Number.isSafeInteger(Number(relacion.id_ficha_destino)) &&
            Number(relacion.id_ficha_destino) > 0 &&
            (relacion.tipo_relacion === undefined || relacion.tipo_relacion === null ||
                typeof relacion.tipo_relacion === "string")
        );
        if (!validas) {
            throw new TypeError("Cada relación debe tener un ID de destino válido y un tipo de texto.");
        }
        if (!relaciones.length) return;

        if (await outboxDisponible() && typeof db.withTransaction === "function") {
            const dispositivoId = await obtenerIdDispositivo();
            return db.withTransaction(async (consultar) => {
                for (const relacion of relaciones) {
                    await registrarRelacion(
                        consultar, dispositivoId, Number(idFicha),
                        Number(relacion.id_ficha_destino), relacion.tipo_relacion ?? null
                    );
                }
            });
        }

        if (typeof db.withTransaction === "function") {
            return db.withTransaction(async (consultar) => {
                for (const relacion of relaciones) {
                    await consultar(
                        "INSERT INTO relacion_ficha (id_ficha_origen, id_ficha_destino, tipo_relacion) VALUES (?, ?, ?)",
                        [idFicha, relacion.id_ficha_destino, relacion.tipo_relacion ?? null]
                    );
                }
            });
        }

        return new Promise((resolve, reject) => {
            db.serialize(() => {
                const sentencia = db.prepare(
                    "INSERT INTO relacion_ficha (id_ficha_origen, id_ficha_destino, tipo_relacion) VALUES (?, ?, ?)"
                );
                relaciones.forEach((relacion) => sentencia.run(
                    idFicha, relacion.id_ficha_destino, relacion.tipo_relacion ?? null
                ));
                sentencia.finalize((error) => error ? reject(error) : resolve());
            });
        });
    }

    static async eliminarRelacion(idRelacion) {
        if (!await outboxDisponible() || typeof db.withTransaction !== "function") {
            return new Promise((resolve, reject) => {
                db.get(
                    "SELECT id_ficha_origen, id_ficha_destino FROM relacion_ficha WHERE id_relacion = ?",
                    [idRelacion],
                    (error, relacion) => {
                        if (error) return reject(error);
                        if (!relacion) return resolve();
                        db.run(`
                            DELETE FROM relacion_ficha
                            WHERE (id_ficha_origen = ? AND id_ficha_destino = ?)
                               OR (id_ficha_origen = ? AND id_ficha_destino = ?)
                        `, [
                            relacion.id_ficha_origen, relacion.id_ficha_destino,
                            relacion.id_ficha_destino, relacion.id_ficha_origen
                        ], (errorBorrar) => errorBorrar ? reject(errorBorrar) : resolve());
                    }
                );
            });
        }

        const dispositivoId = await obtenerIdDispositivo();
        return db.withTransaction(async (consultar) => {
            const resultado = await consultar(
                "SELECT * FROM relacion_ficha WHERE id_relacion = ?",
                [idRelacion]
            );
            const relacion = resultado.rows[0];
            if (!relacion) return;
            const filas = await consultar(`
                SELECT * FROM relacion_ficha
                WHERE (id_ficha_origen = ? AND id_ficha_destino = ?)
                   OR (id_ficha_origen = ? AND id_ficha_destino = ?)
            `, [
                relacion.id_ficha_origen, relacion.id_ficha_destino,
                relacion.id_ficha_destino, relacion.id_ficha_origen
            ]);
            for (const fila of filas.rows) {
                await eliminarFilaRelacion(consultar, dispositivoId, fila);
            }
        });
    }
}

module.exports = RelacionFicha;
