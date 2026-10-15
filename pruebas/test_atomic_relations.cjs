const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

async function testPostgresAdapterTransactions() {
    const adapterPath = path.resolve(__dirname, "../src/databasePostgres.js");
    const originalLoad = Module._load;
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const calls = [];
    let failInsert = false;
    let released = 0;

    class FakeClient {
        async query(sql, values = []) {
            const normalized = String(sql).trim().replace(/\s+/g, " ");
            calls.push({ sql: normalized, values });
            if (failInsert && normalized.startsWith("INSERT INTO")) {
                throw new Error("simulated insert failure");
            }
            return { rows: [], rowCount: 1 };
        }
        release() { released += 1; }
    }

    class FakePool {
        constructor() { this.client = new FakeClient(); }
        on() {}
        async connect() { return this.client; }
        async query(sql, values = []) { return this.client.query(sql, values); }
    }

    Module._load = function(request, parent, isMain) {
        if (request === "pg") return { Pool: FakePool };
        return originalLoad.call(this, request, parent, isMain);
    };
    process.env.DATABASE_URL = "postgres://mock-not-real";
    delete require.cache[adapterPath];

    try {
        const db = require(adapterPath);
        const committed = await db.transaction(async tx => {
            await tx.query("DELETE FROM ficha_etiqueta WHERE id_ficha = ?", [12]);
            await tx.query("INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES (?, ?)", [12, 5]);
            return "ok";
        });
        assert.equal(committed, "ok");
        assert.deepEqual(calls.map(c => c.sql), [
            "BEGIN",
            "DELETE FROM ficha_etiqueta WHERE id_ficha = $1",
            "INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES ($1, $2)",
            "COMMIT"
        ]);
        assert.equal(released, 1);

        calls.length = 0;
        failInsert = true;
        await assert.rejects(db.transaction(async tx => {
            await tx.query("DELETE FROM relacion_ficha WHERE id_ficha_origen = ?", [12]);
            await tx.query("INSERT INTO relacion_ficha (id_ficha_origen, id_ficha_destino, tipo_relacion) VALUES (?, ?, ?)", [12, 7, "relacionada"]);
        }), /simulated insert failure/);
        assert.equal(calls[0].sql, "BEGIN");
        assert.equal(calls.at(-1).sql, "ROLLBACK");
        assert.equal(released, 2);
    } finally {
        Module._load = originalLoad;
        delete require.cache[adapterPath];
        if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = originalDatabaseUrl;
    }
}

async function testModelsAndValidation() {
    const originalLoad = Module._load;
    const modelPaths = [
        path.resolve(__dirname, "../src/modelos/fichaEtiquetaModelo.js"),
        path.resolve(__dirname, "../src/modelos/relacionFichaModelo.js")
    ];
    for (const p of modelPaths) delete require.cache[p];

    let mode = "success";
    const txCalls = [];
    const fakeDb = {
        transaction: async (work) => {
            txCalls.push("BEGIN");
            try {
                const result = await work({
                    query: async (sql, values = []) => {
                        const normalized = sql.trim().replace(/\s+/g, " ");
                        txCalls.push({ sql: normalized, values });
                        if (mode === "fail" && normalized.startsWith("INSERT INTO")) {
                            throw new Error("simulated model insert failure");
                        }
                        return { rows: [], rowCount: 1 };
                    }
                });
                txCalls.push("COMMIT");
                return result;
            } catch (error) {
                txCalls.push("ROLLBACK");
                throw error;
            }
        }
    };

    Module._load = function(request, parent, isMain) {
        if (request === "../database" && parent && modelPaths.includes(path.resolve(parent.filename))) {
            return fakeDb;
        }
        return originalLoad.call(this, request, parent, isMain);
    };

    try {
        const FichaEtiqueta = require(modelPaths[0]);
        const RelacionFicha = require(modelPaths[1]);

        assert.throws(() => FichaEtiqueta.reemplazar(12, null), /arreglo/);
        assert.throws(() => FichaEtiqueta.reemplazar(12, [0]), /ID entero positivo/);
        assert.throws(() => RelacionFicha.guardarRelaciones(12, null), /arreglo/);
        assert.throws(() => RelacionFicha.guardarRelaciones(12, [{ id_ficha_destino: "x" }]), /ID de ficha destino/);
        assert.equal(txCalls.length, 0, "un payload inválido no debe iniciar una transacción");

        const etiquetasOk = await FichaEtiqueta.reemplazar(12, [2, "4"]);
        assert.equal(etiquetasOk, true);
        assert.deepEqual(txCalls.map(v => typeof v === "string" ? v : v.sql), [
            "BEGIN",
            "DELETE FROM ficha_etiqueta WHERE id_ficha = ?",
            "INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES (?, ?)",
            "INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES (?, ?)",
            "COMMIT"
        ]);

        txCalls.length = 0;
        await RelacionFicha.guardarRelaciones(12, [
            { id_ficha_destino: 20, tipo_relacion: "relacionada" },
            { id_ficha_destino: "25", tipo_relacion: "contexto" }
        ]);
        assert.deepEqual(txCalls.map(v => typeof v === "string" ? v : v.sql), [
            "BEGIN",
            "DELETE FROM relacion_ficha WHERE id_ficha_origen = ?",
            "INSERT INTO relacion_ficha (id_ficha_origen, id_ficha_destino, tipo_relacion) VALUES (?, ?, ?)",
            "INSERT INTO relacion_ficha (id_ficha_origen, id_ficha_destino, tipo_relacion) VALUES (?, ?, ?)",
            "COMMIT"
        ]);

        txCalls.length = 0;
        mode = "fail";
        await assert.rejects(FichaEtiqueta.reemplazar(12, [2]), /simulated model insert failure/);
        assert.equal(txCalls.at(-1), "ROLLBACK");

        txCalls.length = 0;
        mode = "success";
        await FichaEtiqueta.reemplazar(12, []);
        assert.deepEqual(txCalls.map(v => typeof v === "string" ? v : v.sql), [
            "BEGIN", "DELETE FROM ficha_etiqueta WHERE id_ficha = ?", "COMMIT"
        ]);
    } finally {
        Module._load = originalLoad;
        for (const p of modelPaths) delete require.cache[p];
    }
}

(async () => {
    await testPostgresAdapterTransactions();
    await testModelsAndValidation();
    console.log("OK: el adaptador confirma la transacción si funciona y ejecuta rollback si falla.");
    console.log("OK: los modelos reemplazan relaciones dentro de transacciones y validan entradas.");
    console.log("OK: payload inválido no inicia transacciones; [] explícito permite quitar relaciones.");
    console.log("OK: todos los tests usan clientes simulados, sin conectarse a Supabase.");
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
