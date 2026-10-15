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

    await t.test("rechaza un valor que no sea una lista", async () => {
        llamadas.length = 0;

        await assert.rejects(
            RelacionFicha.guardarRelaciones("10", null),
            /Las relaciones deben enviarse como una lista/
        );

        assert.deepEqual(llamadas, []);
    });
});
