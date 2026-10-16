const { AsyncLocalStorage } = require("node:async_hooks");
const { Pool } = require("pg");
const { traducirConsulta } = require("./databaseSqlCompat");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const contextoAsync = new AsyncLocalStorage();
const umbralConsultaLentaMs = Number.parseInt(process.env.DB_LOG_SLOW_QUERIES_MS || "0", 10);

const columnasId = {
    usuario: "id_usuario",
    plantilla: "id_plantilla",
    menu: "id_menu",
    ficha: "id_ficha",
    etiqueta: "id_etiqueta",
    multimedia: "id_multi",
    relacion_ficha: "id_relacion"
};

const nuevoContextoSerial = () => ({ cola: Promise.resolve() });

const resumenConsulta = (sql) => {
    const operacion = sql.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER)\b/i)?.[1]?.toUpperCase() || "SQL";
    const tabla = sql.match(/\b(?:FROM|INTO|UPDATE|JOIN)\s+([a-z_][a-z0-9_.]*)/i)?.[1];
    return tabla ? `${operacion} ${tabla}` : operacion;
};

const informarConsultaLenta = (sql, inicioSolicitado, inicioEjecucion, fin, filas, codigoError) => {
    if (!(umbralConsultaLentaMs > 0)) return;

    const totalMs = Number(fin - inicioSolicitado) / 1e6;
    if (totalMs < umbralConsultaLentaMs) return;

    const esperaSerialMs = Number(inicioEjecucion - inicioSolicitado) / 1e6;
    const consultaMs = Number(fin - inicioEjecucion) / 1e6;
    const estado = codigoError ? `[error=${codigoError}]` : `filas=${filas ?? "n/d"}`;
    console.warn(`[db][lenta] total=${totalMs.toFixed(1)} ms; espera_serial=${esperaSerialMs.toFixed(1)} ms; espera_pool_y_query=${consultaMs.toFixed(1)} ms; ${resumenConsulta(sql)}; ${estado}`);
};

const ejecutar = (consulta, valores = [], contexto = contextoAsync.getStore()) => {
    const sql = traducirConsulta(consulta);
    const inicioSolicitado = process.hrtime.bigint();

    const ejecutarEnPool = async () => {
        const inicioEjecucion = process.hrtime.bigint();
        try {
            const resultado = await pool.query(sql, valores);
            informarConsultaLenta(sql, inicioSolicitado, inicioEjecucion, process.hrtime.bigint(), resultado.rowCount, null);
            return resultado;
        } catch (error) {
            informarConsultaLenta(sql, inicioSolicitado, inicioEjecucion, process.hrtime.bigint(), null, error.code || "sin_codigo");
            throw error;
        }
    };

    if (!contexto) return ejecutarEnPool();

    const resultado = contexto.cola.then(ejecutarEnPool);
    // Un error no debe bloquear el resto de la cola; cada llamada conserva su propio resultado.
    contexto.cola = resultado.then(() => undefined, () => undefined);
    return resultado;
};

const separarArgumentos = (parametros, callback) => {
    if (typeof parametros === "function") return { valores: [], callback: parametros };
    return { valores: parametros || [], callback };
};

const obtenerColumnaId = (consulta) => {
    const coincidencia = consulta.match(/INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+([a-z_][a-z0-9_]*)/i);
    return coincidencia ? columnasId[coincidencia[1].toLowerCase()] : null;
};

const registrarErrorSinCallback = (operacion, error) => {
    // No imprimir SQL, parámetros ni mensajes que puedan incluir valores de datos.
    console.error(`Error en consulta PostgreSQL (${operacion}); codigo=${error.code || "sin_codigo"}`);
};

const ejecutarCallback = (contexto, callback, ...argumentos) => {
    if (contexto) return contextoAsync.run(contexto, () => callback(...argumentos));
    return callback(...argumentos);
};

const db = {
    all(consulta, parametros, callback) {
        const { valores, callback: responder } = separarArgumentos(parametros, callback);
        const contexto = contextoAsync.getStore();

        ejecutar(consulta, valores, contexto).then(
            (resultado) => {
                if (responder) ejecutarCallback(contexto, () => responder(null, resultado.rows));
            },
            (error) => {
                if (responder) ejecutarCallback(contexto, () => responder(error));
                else registrarErrorSinCallback("all", error);
            }
        );
    },

    get(consulta, parametros, callback) {
        const { valores, callback: responder } = separarArgumentos(parametros, callback);
        const contexto = contextoAsync.getStore();

        ejecutar(consulta, valores, contexto).then(
            (resultado) => {
                if (responder) ejecutarCallback(contexto, () => responder(null, resultado.rows[0]));
            },
            (error) => {
                if (responder) ejecutarCallback(contexto, () => responder(error));
                else registrarErrorSinCallback("get", error);
            }
        );
    },

    run(consulta, parametros, callback) {
        const { valores, callback: responder } = separarArgumentos(parametros, callback);
        const columnaId = obtenerColumnaId(consulta);
        const contexto = contextoAsync.getStore();
        let consultaFinal = consulta.trim().replace(/;\s*$/, "");

        if (columnaId && !/\bRETURNING\b/i.test(consultaFinal)) {
            consultaFinal += ` RETURNING ${columnaId}`;
        }

        ejecutar(consultaFinal, valores, contexto).then(
            (resultado) => {
                const idDevuelto = columnaId ? resultado.rows[0]?.[columnaId] : undefined;
                const contextoResultado = {
                    lastID: typeof idDevuelto === "string" && /^\d+$/.test(idDevuelto) && Number.isSafeInteger(Number(idDevuelto))
                        ? Number(idDevuelto)
                        : idDevuelto,
                    changes: resultado.rowCount
                };
                if (responder) ejecutarCallback(contexto, () => responder.call(contextoResultado, null));
            },
            (error) => {
                if (responder) ejecutarCallback(contexto, () => responder.call({ lastID: undefined, changes: 0 }, error));
                else registrarErrorSinCallback("run", error);
            }
        );
    },

    serialize(funcion) {
        if (typeof funcion !== "function") return;
        const contexto = contextoAsync.getStore() || nuevoContextoSerial();
        return contextoAsync.run(contexto, funcion);
    },

    prepare(consulta) {
        const contextoPrepare = contextoAsync.getStore() || nuevoContextoSerial();
        let pendientes = 0;
        let finalizada = false;
        let callbackFinal = null;
        let primerError = null;

        const finalizarSiCorresponde = () => {
            if (!finalizada || pendientes !== 0 || !callbackFinal) return;
            const callback = callbackFinal;
            callbackFinal = null;
            ejecutarCallback(contextoPrepare, () => callback(primerError));
        };

        return {
            run(...argumentos) {
                if (finalizada) {
                    const error = new Error("La sentencia preparada ya fue finalizada.");
                    const posibleCallback = argumentos.at(-1);
                    if (typeof posibleCallback === "function") posibleCallback(error);
                    else registrarErrorSinCallback("prepare.run", error);
                    return this;
                }

                const posibleCallback = argumentos.at(-1);
                const callback = typeof posibleCallback === "function" ? argumentos.pop() : null;
                const valores = argumentos.length === 1 && Array.isArray(argumentos[0]) ? argumentos[0] : argumentos;
                pendientes += 1;

                ejecutarCallback(contextoPrepare, () => db.run(consulta, valores, (error) => {
                    if (error && !primerError) primerError = error;
                    pendientes -= 1;
                    try {
                        if (callback) callback(error);
                    } finally {
                        finalizarSiCorresponde();
                    }
                }));

                return this;
            },

            finalize(callback) {
                if (finalizada) {
                    const error = new Error("La sentencia preparada ya fue finalizada.");
                    if (callback) callback(error);
                    return;
                }
                finalizada = true;
                callbackFinal = callback || (() => {});
                finalizarSiCorresponde();
            }
        };
    },

    // Ejecuta una serie de consultas en una única transacción PostgreSQL.
    // El cliente dedicado evita que otras peticiones se mezclen en la transacción.
    async withTransaction(trabajo) {
        if (typeof trabajo !== "function") {
            throw new TypeError("La transacción requiere una función.");
        }

        const cliente = await pool.connect();

        try {
            await cliente.query("BEGIN");

            const consultar = (consulta, valores = []) =>
                cliente.query(traducirConsulta(consulta), valores);

            const resultado = await trabajo(consultar);
            await cliente.query("COMMIT");
            return resultado;
        } catch (error) {
            try {
                await cliente.query("ROLLBACK");
            } catch (errorRollback) {
                registrarErrorSinCallback("rollback", errorRollback);
            }
            throw error;
        } finally {
            cliente.release();
        }
    },

    close(callback) {
        pool.end().then(
            () => callback && callback(null),
            (error) => callback ? callback(error) : registrarErrorSinCallback("close", error)
        );
    }
};

pool.on("error", (error) => {
    // No exponer la URL de conexión, sentencias ni parámetros.
    console.error(`Error inesperado en el pool PostgreSQL; codigo=${error.code || "sin_codigo"}`);
});

module.exports = db;
