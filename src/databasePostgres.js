const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const columnasId = {
    usuario: "id_usuario",
    plantilla: "id_plantilla",
    menu: "id_menu",
    ficha: "id_ficha",
    etiqueta: "id_etiqueta",
    multimedia: "id_multi",
    relacion_ficha: "id_relacion"
};

const traducirConsulta = (consulta) => {
    let indice = 0;

    let sql = consulta
        .replace(/datetime\('now','-3 hours'\)/gi, "(CURRENT_TIMESTAMP - INTERVAL '3 hours')")
        .replace(/datetime\('now'\)/gi, "CURRENT_TIMESTAMP")
        .replace(/\?/g, () => {
            indice += 1;
            return `$${indice}`;
        });

    if (/INSERT\s+OR\s+REPLACE\s+INTO\s+configuracion/i.test(sql)) {
        sql = sql.replace(/INSERT\s+OR\s+REPLACE\s+INTO\s+configuracion/i, "INSERT INTO configuracion");
        sql += " ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado = EXCLUDED.actualizado";
    }

    return sql;
};

const separarArgumentos = (parametros, callback) => {
    if (typeof parametros === "function") {
        return { valores: [], callback: parametros };
    }

    return {
        valores: parametros || [],
        callback
    };
};

const obtenerColumnaId = (consulta) => {
    const coincidencia = consulta.match(/INSERT\s+INTO\s+([a-z_]+)/i);
    return coincidencia ? columnasId[coincidencia[1].toLowerCase()] : null;
};

const ejecutar = (consulta, valores) =>
    pool.query(traducirConsulta(consulta), valores);

const db = {
    all(consulta, parametros, callback) {
        const { valores, callback: responder } = separarArgumentos(parametros, callback);

        ejecutar(consulta, valores)
            .then((resultado) => responder(null, resultado.rows))
            .catch((error) => responder(error));
    },

    get(consulta, parametros, callback) {
        const { valores, callback: responder } = separarArgumentos(parametros, callback);

        ejecutar(consulta, valores)
            .then((resultado) => responder(null, resultado.rows[0]))
            .catch((error) => responder(error));
    },

    run(consulta, parametros, callback) {
        const { valores, callback: responder } = separarArgumentos(parametros, callback);
        const columnaId = obtenerColumnaId(consulta);
        let consultaFinal = consulta;

        if (columnaId && !/\bRETURNING\b/i.test(consultaFinal)) {
            consultaFinal += ` RETURNING ${columnaId}`;
        }

        ejecutar(consultaFinal, valores)
            .then((resultado) => {
                const contexto = {
                    lastID: columnaId ? resultado.rows[0]?.[columnaId] : undefined,
                    changes: resultado.rowCount
                };

                if (responder) {
                    responder.call(contexto, null);
                }
            })
            .catch((error) => {
                if (responder) {
                    responder.call({ lastID: undefined, changes: 0 }, error);
                }
            });
    },

    serialize(funcion) {
        funcion();
    },

    prepare(consulta) {
        let pendientes = 0;
        let finalizada = false;
        let callbackFinal;
        let primerError;

        const finalizarSiCorresponde = () => {
            if (finalizada && pendientes === 0 && callbackFinal) {
                callbackFinal(primerError);
            }
        };

        return {
            run(...argumentos) {
                const posibleCallback = argumentos.at(-1);
                const callback = typeof posibleCallback === "function"
                    ? argumentos.pop()
                    : null;
                const valores = argumentos.length === 1 && Array.isArray(argumentos[0])
                    ? argumentos[0]
                    : argumentos;

                pendientes += 1;

                db.run(consulta, valores, (error) => {
                    if (error && !primerError) {
                        primerError = error;
                    }

                    pendientes -= 1;

                    if (callback) {
                        callback(error);
                    }

                    finalizarSiCorresponde();
                });

                return this;
            },

            finalize(callback) {
                finalizada = true;
                callbackFinal = callback || (() => {});
                finalizarSiCorresponde();
            }
        };
    }
};

pool.on("error", (error) => {
    console.error("Error inesperado en la conexión a PostgreSQL:", error.message);
});

module.exports = db;
