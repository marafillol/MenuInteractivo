const { AsyncLocalStorage } = require("node:async_hooks");
const { Pool } = require("pg");
const { traducirConsulta } = require("./databaseSqlCompat");
const { performance } = require("node:perf_hooks");
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    min: 3,
    max: 5,
    idleTimeoutMillis: 30000
});
const iniciosConexion = new WeakMap();

pool.on("connect", (cliente) => {
    iniciosConexion.set(cliente, performance.now());

    // Captura errores de conexión incluso mientras el cliente está en uso.
    cliente.on("error", (error) => {
        console.error(
            "[POOL][CLIENTE] Error de conexión PostgreSQL:",
            error.message
        );
    });

    console.log(
        `[POOL] Conexión establecida. ` +
        `total=${pool.totalCount}; ` +
        `idle=${pool.idleCount}; ` +
        `esperando=${pool.waitingCount}`
    );
});

pool.on("acquire", (cliente) => {
    const inicio = iniciosConexion.get(cliente);

    const tiempoDesdeConexion = inicio !== undefined
        ? (performance.now() - inicio).toFixed(1)
        : "conexión ya existente";

    console.log(
        `[POOL] Conexión adquirida; ` +
        `tiempo_desde_apertura=${tiempoDesdeConexion} ms`
    );
});

pool.on("remove", () => {
    console.log(
        `[POOL] Conexión eliminada. ` +
        `total=${pool.totalCount}; ` +
        `idle=${pool.idleCount}`
    );
});

pool.on("error", (error) => {
    console.error("[POOL] Error:", error.message);
});
setInterval(() => {
    console.log(
        `[POOL] total=${pool.totalCount}; ` +
        `idle=${pool.idleCount}; ` +
        `esperando=${pool.waitingCount}`
    );
}, 2000).unref();


const conectarCliente = async () => {
    const cliente = await pool.connect();
    let errorConexion = null;
    let liberado = false;

    const manejarError = (error) => {
        errorConexion ??= error;

        console.error(
            "[DB] Error en cliente PostgreSQL:",
            error.message
        );
    };

    cliente.on("error", manejarError);

    return {
        cliente,

        liberar() {
            if (liberado) return;
            liberado = true;

            // Si la conexión falló, el pool debe descartar este cliente.
            cliente.release(errorConexion || undefined);

            // El pool vuelve a administrar los errores cuando queda inactivo.
            cliente.removeListener("error", manejarError);
        }
    };
};

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
    let inicioConsulta;
    let conexion;

    try {
        conexion = await conectarCliente();
        const { cliente } = conexion;
        const inicioQuery = process.hrtime.bigint();

        inicioConsulta = inicioQuery;

        const resultado = await cliente.query(sql, valores);
        const fin = process.hrtime.bigint();

        if (umbralConsultaLentaMs > 0) {
            const esperaMs = Number(inicioQuery - inicioEjecucion) / 1e6;
            const consultaMs = Number(fin - inicioQuery) / 1e6;

            if (esperaMs + consultaMs >= umbralConsultaLentaMs) {
                console.warn(
                    `[db][diagnóstico] espera_conexion=${esperaMs.toFixed(1)} ms; ` +
                    `consulta=${consultaMs.toFixed(1)} ms; ` +
                    `${resumenConsulta(sql)}; filas=${resultado.rowCount}`
                );
            }
        }

        return resultado;
    } catch (error) {
        if (umbralConsultaLentaMs > 0) {
            console.warn(
                `[db][diagnóstico] Error en ${resumenConsulta(sql)}; ` +
                `codigo=${error.code || "sin_codigo"}`
            );
        }

        throw error;
    } finally {
        if (conexion) {
            conexion.liberar();
        }
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

        const conexion = await conectarCliente();
        const { cliente } = conexion;

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
            conexion.liberar();
        }
    },



    async preparar() {
        await Promise.all(
            Array.from({ length: 3 }, async () => {
                const conexion = await conectarCliente();
                const { cliente } = conexion;

                try {
                    await cliente.query("SELECT 1");
                } finally {
                    conexion.liberar();
                }
            })
        );
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
