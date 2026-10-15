const test = require("node:test");
const assert = require("node:assert/strict");

const dbPath = require.resolve("../src/database");
const modeloPath = require.resolve("../src/modelos/relacionFichaModelo");
const dbOriginal = require.cache[dbPath];
const modeloOriginal = require.cache[modeloPath];
const llamadas = [];

const dbFalso = {
    serialize(callback) {
        callback();
    },
    prepare(sql) {
        llamadas.push({ tipo: "prepare", sql });
        return {
            run(...parametros) {
                llamadas.push({ tipo: "run", parametros });
                return this;
            },
            finalize(callback) {
                llamadas.push({ tipo: "finalize" });
                if (callback) callback(null);
                return this;
            }
        };
    },
    run(sql, parametros, callback) {
        llamadas.push({ tipo: "runSql", sql, parametros });
        if (callback) callback(null);
    }
};

require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: dbFalso
};
delete require.cache[modeloPath];

const RelacionFicha = require("../src/modelos/relacionFichaModelo");

test("guardarRelaciones agrega las nuevas sin borrar las relaciones existentes", async (t) => {
    t.after(() => {
        if (dbOriginal) require.cache[dbPath] = dbOriginal;
        else delete require.cache[dbPath];

        if (modeloOriginal) require.cache[modeloPath] = modeloOriginal;
        else delete require.cache[modeloPath];
    });

    await t.test("inserta solamente las nuevas relaciones recibidas", async () => {
        llamadas.length = 0;

        await RelacionFicha.guardarRelaciones("10", [
            { id_ficha_destino: "12", tipo_relacion: "relacionada" },
            { id_ficha_destino: "15", tipo_relacion: "complementaria" }
        ]);

        assert.equal(llamadas.filter((llamada) => llamada.tipo === "run").length, 2);
        assert.equal(llamadas.filter((llamada) => llamada.tipo === "runSql").length, 0);
        assert.equal(llamadas.filter((llamada) => llamada.tipo === "prepare").length, 1);
        assert.match(llamadas.find((llamada) => llamada.tipo === "prepare").sql, /INSERT INTO relacion_ficha/i);
        assert.equal(llamadas.some((llamada) => /DELETE\s+FROM\s+relacion_ficha/i.test(llamada.sql || "")), false);
        assert.deepEqual(
            llamadas.filter((llamada) => llamada.tipo === "run").map((llamada) => llamada.parametros),
            [
                ["10", "12", "relacionada"],
                ["10", "15", "complementaria"]
            ]
        );
    });

    await t.test("no hace consultas cuando la lista está vacía", async () => {
        llamadas.length = 0;

        await RelacionFicha.guardarRelaciones("10", []);

        assert.deepEqual(llamadas, []);
    });

    await t.test("rechaza IDs inválidos antes de ejecutar consultas", async () => {
        llamadas.length = 0;
        await assert.rejects(
            RelacionFicha.guardarRelaciones("10", [{ id_ficha_destino: "abc", tipo_relacion: "relacionada" }]),
            /ID de destino válido/
        );
        assert.deepEqual(llamadas, []);

        await assert.rejects(
            RelacionFicha.guardarRelaciones("no-id", [{ id_ficha_destino: "12", tipo_relacion: "relacionada" }]),
            /ficha de origen debe tener un ID entero positivo/
        );
        assert.deepEqual(llamadas, []);
    });

    await t.test("usa transacción PostgreSQL para añadir relaciones sin borrar las existentes", async () => {
        llamadas.length = 0;
        dbFalso.withTransaction = async (trabajo) => {
            llamadas.push({ tipo: "tx", accion: "BEGIN" });
            try {
                const resultado = await trabajo(async (sql, parametros) => {
                    llamadas.push({ tipo: "txQuery", sql, parametros });
                    return { rows: [], rowCount: 1 };
                });
                llamadas.push({ tipo: "tx", accion: "COMMIT" });
                return resultado;
            } catch (error) {
                llamadas.push({ tipo: "tx", accion: "ROLLBACK" });
                throw error;
            }
        };

        try {
            await RelacionFicha.guardarRelaciones("10", [
                { id_ficha_destino: "12", tipo_relacion: "relacionada" },
                { id_ficha_destino: "15", tipo_relacion: "complementaria" }
            ]);
            assert.deepEqual(
                llamadas.filter((x) => x.tipo === "tx").map((x) => x.accion),
                ["BEGIN", "COMMIT"]
            );
            const queries = llamadas.filter((x) => x.tipo === "txQuery");
            assert.equal(queries.length, 2);
            assert.ok(queries.every((x) => /INSERT INTO relacion_ficha/i.test(x.sql)));
            assert.equal(queries.some((x) => /DELETE FROM relacion_ficha/i.test(x.sql)), false);
        } finally {
            delete dbFalso.withTransaction;
        }
    });

    await t.test("rechaza un valor que no sea una lista", async () => {
        llamadas.length = 0;

        await assert.rejects(
            RelacionFicha.guardarRelaciones("10", null),
            /Las relaciones deben enviarse como una lista/
        );

        assert.deepEqual(llamadas, []);
    });
});
