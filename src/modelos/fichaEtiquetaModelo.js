
// =======================================================
// MODELO FICHA - ETIQUETA
// =======================================================
//
// Este modelo administra la relación entre fichas y etiquetas.
//
// La tabla ficha_etiqueta representa una relación muchos a muchos:
//
//      ficha
//        |
//        |
// ficha_etiqueta
//        |
//        |
//     etiqueta
//
// Una ficha puede tener varias etiquetas.
// Una etiqueta puede pertenecer a varias fichas.
//
// Responsabilidades:
// - Obtener etiquetas asociadas a una ficha.
// - Reemplazar las etiquetas asignadas a una ficha.
//
// No maneja:
// - Peticiones HTTP.
// - Respuestas al cliente.
// - Lógica de interfaz.
//

const db = require("../database");
const { randomUUID } = require("node:crypto");
const { esModoLocal } = require("../config/modoServidor");
const { registrarEvento } = require("../servicios/sincronizacion/outbox");
const { obtenerIdDispositivo } = require("../servicios/sincronizacion/dispositivo");

function consultarPromesa(sql, valores = []) {
    return new Promise((resolve, reject) => db.all(sql, valores, (error, filas) =>
        error ? reject(error) : resolve(filas)
    ));
}

async function outboxRelacionDisponible() {
    if (
        !esModoLocal ||
        typeof db.withTransaction !== "function" ||
        typeof db.open !== "function"
    ) return false;
    try {
        const columnas = await consultarPromesa('PRAGMA table_info("ficha_etiqueta")');
        const nombres = new Set(columnas.map((columna) => columna.name));
        if (!["sync_id", "sync_version", "sync_deleted_at"].every((nombre) => nombres.has(nombre))) return false;
        const tablas = await consultarPromesa("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sync_eventos'");
        return tablas.length === 1;
    } catch {
        return false;
    }
}






// =======================================================
// CLASE FICHA ETIQUETA
// =======================================================
//
// Contiene las operaciones relacionadas con la tabla
// intermedia ficha_etiqueta.
//

class FichaEtiqueta {






    // ===================================================
    // OBTENER ETIQUETAS DE UNA FICHA
    // ===================================================
    //
    // Obtiene todas las etiquetas relacionadas
    // con una ficha específica.
    //
    // Recibe:
    // - idFicha: identificador de la ficha.
    //
    // Retorna:
    // Lista de etiquetas asociadas.
    //
    // Ejemplo:
    //
    // Ficha:
    //   Soldado Juan
    //
    // Etiquetas:
    //   - Malvinas
    //   - Historia
    //   - Militar
    //

    static async obtenerPorFicha(idFicha){
        const filtro = await outboxRelacionDisponible() ? "AND fe.sync_deleted_at IS NULL" : "";
        return new Promise((resolve, reject) => db.all(`
            SELECT e.id_etiqueta, e.nombre, e.descripcion, e.activo
            FROM ficha_etiqueta fe
            INNER JOIN etiqueta e ON fe.id_etiqueta = e.id_etiqueta
            WHERE fe.id_ficha = ? ${filtro}
            ORDER BY e.nombre
        `, [idFicha], (error, filas) => error ? reject(error) : resolve(filas)));
    }








    // ===================================================
    // REEMPLAZAR ETIQUETAS DE UNA FICHA
    // ===================================================
    //
    // Actualiza las etiquetas asociadas a una ficha.
    //
    // Funcionamiento:
    //
    // 1) Elimina todas las relaciones actuales.
    //
    // 2) Inserta nuevamente las etiquetas recibidas.
    //
    //
    // Ejemplo:
    //
    // Antes:
    //
    // Ficha 1
    //  - Historia
    //  - Militar
    //
    //
    // Nuevas etiquetas:
    //
    //  - Historia
    //  - Museo
    //
    //
    // Resultado:
    //
    // Ficha 1
    //  - Historia
    //  - Museo
    //
    //
    // Recibe:
    // - idFicha: identificador de ficha.
    // - etiquetas: arreglo con IDs de etiquetas.
    //

    static async reemplazar(idFicha, etiquetas) {
        if (!Number.isSafeInteger(Number(idFicha)) || Number(idFicha) <= 0) {
            throw new TypeError("La ficha debe tener un ID entero positivo.");
        }
        if (!Array.isArray(etiquetas)) {
            throw new TypeError("Las etiquetas deben enviarse como una lista.");
        }
        if (!etiquetas.every((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0)) {
            throw new TypeError("Cada etiqueta debe tener un ID entero positivo.");
        }

        const idsDeseados = [...new Set(etiquetas.map(Number))];
        if (!await outboxRelacionDisponible()) {
            if (typeof db.withTransaction === "function") {
                return db.withTransaction(async (consultar) => {
                    await consultar("DELETE FROM ficha_etiqueta WHERE id_ficha = ?", [idFicha]);
                    for (const idEtiqueta of idsDeseados) {
                        await consultar(
                            "INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES (?, ?)",
                            [idFicha, idEtiqueta]
                        );
                    }
                    return true;
                });
            }
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run("DELETE FROM ficha_etiqueta WHERE id_ficha = ?", [idFicha], (error) => {
                        if (error) return reject(error);
                        if (idsDeseados.length === 0) return resolve(true);
                        const sentencia = db.prepare(
                            "INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES (?, ?)"
                        );
                        idsDeseados.forEach((idEtiqueta) => sentencia.run(idFicha, idEtiqueta));
                        sentencia.finalize((errorFinal) => errorFinal ? reject(errorFinal) : resolve(true));
                    });
                });
            });
        }

        const dispositivoId = await obtenerIdDispositivo();
        return db.withTransaction(async (consultar) => {
            const fichaResultado = await consultar(
                "SELECT sync_id FROM ficha WHERE id_ficha = ?", [idFicha]
            );
            const fichaSyncId = fichaResultado.rows[0]?.sync_id;

            // Las fichas históricas sin identidad compartida conservan el
            // reemplazo local tradicional hasta la reconciliación inicial.
            if (!fichaSyncId) {
                await consultar("DELETE FROM ficha_etiqueta WHERE id_ficha = ?", [idFicha]);
                for (const idEtiqueta of idsDeseados) {
                    await consultar(
                        "INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES (?, ?)",
                        [idFicha, idEtiqueta]
                    );
                }
                return true;
            }

            let etiquetasSync = [];
            if (idsDeseados.length > 0) {
                const placeholders = idsDeseados.map(() => "?").join(", ");
                const resultadoEtiquetas = await consultar(
                    `SELECT id_etiqueta, sync_id FROM etiqueta
                     WHERE id_etiqueta IN (${placeholders}) AND sync_deleted_at IS NULL`,
                    idsDeseados
                );
                etiquetasSync = resultadoEtiquetas.rows;
                if (etiquetasSync.length !== idsDeseados.length || etiquetasSync.some((fila) => !fila.sync_id)) {
                    throw new Error("No se pueden sincronizar asociaciones con etiquetas que aún no tienen identidad reconciliada.");
                }
            }

            const actualesResultado = await consultar(`
                SELECT fe.*, e.sync_id AS etiqueta_sync_id
                FROM ficha_etiqueta fe
                INNER JOIN etiqueta e ON e.id_etiqueta = fe.id_etiqueta
                WHERE fe.id_ficha = ?
            `, [idFicha]);
            const actuales = actualesResultado.rows;
            const porEtiqueta = new Map(actuales.map((fila) => [Number(fila.id_etiqueta), fila]));
            const deseadas = new Set(idsDeseados);

            for (const actual of actuales) {
                if (actual.sync_deleted_at) continue;
                if (!actual.sync_id) {
                    throw new Error("La ficha tiene asociaciones históricas sin identidad reconciliada; debe reconciliarse antes de reemplazar etiquetas.");
                }
                if (deseadas.has(Number(actual.id_etiqueta))) continue;

                const versionBase = Number(actual.sync_version || 1);
                const versionResultado = versionBase + 1;
                const eliminadoEn = new Date().toISOString();
                await consultar(`
                    UPDATE ficha_etiqueta SET sync_deleted_at = ?, sync_version = ?
                    WHERE id_ficha = ? AND id_etiqueta = ?
                `, [eliminadoEn, versionResultado, idFicha, actual.id_etiqueta]);
                await registrarEvento(consultar, {
                    dispositivoId, entidad: "ficha_etiqueta", operacion: "DELETE",
                    syncId: actual.sync_id, versionBase, versionResultado,
                    payload: {
                        ficha_sync_id: fichaSyncId,
                        etiqueta_sync_id: actual.etiqueta_sync_id,
                        deleted_at: eliminadoEn
                    }
                });
            }

            for (const idEtiqueta of idsDeseados) {
                const etiqueta = etiquetasSync.find((fila) => Number(fila.id_etiqueta) === idEtiqueta);
                const actual = porEtiqueta.get(idEtiqueta);
                if (actual && !actual.sync_deleted_at) {
                    if (!actual.sync_id) {
                        throw new Error("La asociación existente aún no tiene identidad reconciliada.");
                    }
                    continue;
                }

                if (actual && actual.sync_deleted_at) {
                    if (!actual.sync_id) {
                        throw new Error("La asociación eliminada no tiene identidad reconciliada.");
                    }
                    const versionBase = Number(actual.sync_version || 1);
                    const versionResultado = versionBase + 1;
                    await consultar(`
                        UPDATE ficha_etiqueta
                        SET sync_deleted_at = NULL, sync_version = ?
                        WHERE id_ficha = ? AND id_etiqueta = ?
                    `, [versionResultado, idFicha, idEtiqueta]);
                    await registrarEvento(consultar, {
                        dispositivoId, entidad: "ficha_etiqueta", operacion: "UPDATE",
                        syncId: actual.sync_id, versionBase, versionResultado,
                        payload: {
                            ficha_sync_id: fichaSyncId,
                            etiqueta_sync_id: etiqueta.sync_id,
                            deleted_at: null
                        }
                    });
                    continue;
                }

                const syncId = randomUUID();
                await consultar(`
                    INSERT INTO ficha_etiqueta (
                        id_ficha, id_etiqueta, sync_id, sync_version, sync_deleted_at
                    ) VALUES (?, ?, ?, 1, NULL)
                `, [idFicha, idEtiqueta, syncId]);
                await registrarEvento(consultar, {
                    dispositivoId, entidad: "ficha_etiqueta", operacion: "INSERT",
                    syncId, versionBase: 0, versionResultado: 1,
                    payload: {
                        ficha_sync_id: fichaSyncId,
                        etiqueta_sync_id: etiqueta.sync_id
                    }
                });
            }
            return true;
        });
    }


    // =======================================================
    // OBTENER FICHAS DE UNA ETIQUETA
    // =======================================================
    //
    // Obtiene todas las fichas asociadas a una etiqueta.
    //
    // Recibe:
    // - idEtiqueta: identificador de la etiqueta.
    //
    // Retorna:
    // - Lista de fichas relacionadas con esa etiqueta.
    //

    static async obtenerPorEtiqueta(idEtiqueta){
        const filtro = await outboxRelacionDisponible() ? "AND fe.sync_deleted_at IS NULL" : "";
        return new Promise((resolve, reject) => db.all(`
            SELECT f.*
            FROM ficha_etiqueta fe
            INNER JOIN ficha f ON fe.id_ficha = f.id_ficha
            WHERE fe.id_etiqueta = ? ${filtro}
            ORDER BY f.id_ficha
        `, [idEtiqueta], (error, filas) => error ? reject(error) : resolve(filas)));
    }

    // ===================================================
    // ELIMINAR TODAS LAS ETIQUETAS DE UNA FICHA
    // ===================================================

    static eliminarRelacionesFicha(idFicha){

        return new Promise((resolve,reject)=>{


            db.run(

                `
                DELETE FROM ficha_etiqueta
                WHERE id_ficha = ?
                `,

                [idFicha],

                function(error){

                    if(error){

                        reject(error);

                    }else{

                        resolve(true);

                    }

                }

            );


        });

    }


    // ===================================================
    // ELIMINAR TODAS LAS RELACIONES DE UNA ETIQUETA
    // ===================================================

    static eliminarEtiquetasRelacionadas(idEtiqueta){

        return new Promise((resolve,reject)=>{

            db.run(
                `
                DELETE
                FROM ficha_etiqueta
                WHERE id_etiqueta = ?
                `,
                [idEtiqueta],
                function(error){

                    if(error){

                        reject(error);

                    }else{

                        resolve();

                    }

                }
            );

        });

    }

}











// =======================================================
// EXPORTACIÓN DEL MODELO
// =======================================================
//
// Permite utilizar este modelo desde controladores
// u otros módulos del backend.
//

module.exports = FichaEtiqueta;