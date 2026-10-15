const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const ejecuciones = [];
const consultasTransaccion = [];
let clientesLiberados = 0;
let devolverIdComoTexto = false;
class PoolFalso {
    constructor() {}
    on() {}
    async connect() {
        return {
            query: async (sql, valores = []) => {
                consultasTransaccion.push(String(sql).trim());
                return this.query(sql, valores);
            },
            release: () => { clientesLiberados += 1; }
        };
    }
    query(sql, valores = []) {
        const marca = valores[0] ?? "sin-parametro";
        ejecuciones.push("inicio:" + marca);
        const demora = marca === "primera" ? 25 : 0;
        return new Promise((resolve) => setTimeout(() => {
            ejecuciones.push("fin:" + marca);
            const columna = sql.match(/\bRETURNING\s+([a-z_][a-z0-9_]*)/i)?.[1];
            const id = devolverIdComoTexto ? "999" : 999;
            resolve({ rows: columna ? [{ [columna]: id }] : [{ valor: marca }], rowCount: 1 });
        }, demora));
    }
}
function cargarAdaptador() {
    const cargarOriginal = Module._load;
    const anterior = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://prueba-interna/no-se-conecta";
    Module._load = function (solicitud, padre, esPrincipal) {
        if (solicitud === "pg") return { Pool: PoolFalso };
        return cargarOriginal.call(this, solicitud, padre, esPrincipal);
    };
    try {
        delete require.cache[require.resolve("../src/databasePostgres")];
        return require("../src/databasePostgres");
    } finally {
        Module._load = cargarOriginal;
        if (anterior === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = anterior;
    }
}
const db = cargarAdaptador();

test("serialize encola consultas en el orden programado", async () => {
    ejecuciones.length = 0;
    await new Promise((resolve, reject) => {
        let terminadas = 0;
        const fin = (error) => { if (error) return reject(error); if (++terminadas === 3) resolve(); };
        db.serialize(() => {
            db.all("SELECT ? AS valor", ["primera"], fin);
            db.all("SELECT ? AS valor", ["segunda"], fin);
            db.all("SELECT ? AS valor", ["tercera"], fin);
        });
    });
    assert.deepEqual(ejecuciones, ["inicio:primera", "fin:primera", "inicio:segunda", "fin:segunda", "inicio:tercera", "fin:tercera"]);
});

test("consultas iniciadas desde un callback serializado quedan en la misma cola", async () => {
    ejecuciones.length = 0;
    await new Promise((resolve, reject) => {
        let terminadas = 0;
        const fin = (error) => { if (error) return reject(error); if (++terminadas === 3) resolve(); };
        db.serialize(() => {
            db.get("SELECT ? AS valor", ["primera"], (error) => {
                fin(error);
                db.get("SELECT ? AS valor", ["anidada"], fin);
            });
            db.get("SELECT ? AS valor", ["segunda"], fin);
        });
    });
    assert.deepEqual(ejecuciones, ["inicio:primera", "fin:primera", "inicio:segunda", "fin:segunda", "inicio:anidada", "fin:anidada"]);
});

test("prepare serializa las llamadas run y finalize espera por todas", async () => {
    ejecuciones.length = 0;
    await new Promise((resolve, reject) => {
        const sentencia = db.prepare("INSERT INTO tabla_prueba(valor) VALUES (?)");
        sentencia.run("primera", (error) => { if (error) reject(error); });
        sentencia.run("segunda", (error) => { if (error) reject(error); });
        sentencia.run("tercera", (error) => { if (error) reject(error); });
        sentencia.finalize((error) => error ? reject(error) : resolve());
    });
    assert.deepEqual(ejecuciones, ["inicio:primera", "fin:primera", "inicio:segunda", "fin:segunda", "inicio:tercera", "fin:tercera"]);
});

test("run recupera lastID mediante RETURNING", async () => {
    devolverIdComoTexto = false;
    const id = await new Promise((resolve, reject) => db.run("INSERT INTO plantilla(nombre) VALUES (?);", ["prueba"], function (error) {
        if (error) reject(error); else resolve(this.lastID);
    }));
    assert.equal(id, 999);
});

test("run convierte a Number los IDs BIGINT seguros devueltos como string", async () => {
    devolverIdComoTexto = true;
    const id = await new Promise((resolve, reject) => db.run("INSERT INTO plantilla(nombre) VALUES (?)", ["prueba"], function (error) {
        if (error) reject(error); else resolve(this.lastID);
    }));
    assert.equal(id, 999);
    devolverIdComoTexto = false;
});


test("withTransaction confirma las consultas sobre un cliente dedicado", async () => {
    consultasTransaccion.length = 0;
    clientesLiberados = 0;

    const resultado = await db.withTransaction(async (consultar) => {
        await consultar("DELETE FROM ficha_etiqueta WHERE id_ficha = ?", [34]);
        await consultar(
            "INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES (?, ?)",
            [34, 2]
        );
        return "terminado";
    });

    assert.equal(resultado, "terminado");
    assert.deepEqual(
        consultasTransaccion.map((sql) => sql.split(/\\s+/).slice(0, 2).join(" ").toUpperCase()),
        ["BEGIN", "DELETE FROM", "INSERT INTO", "COMMIT"]
    );
    assert.equal(clientesLiberados, 1);
});

test("withTransaction revierte la operación cuando falla el trabajo", async () => {
    consultasTransaccion.length = 0;
    clientesLiberados = 0;

    await assert.rejects(
        db.withTransaction(async (consultar) => {
            await consultar("DELETE FROM ficha_etiqueta WHERE id_ficha = ?", [34]);
            throw new Error("fallo simulado");
        }),
        /fallo simulado/
    );

    assert.equal(consultasTransaccion.includes("BEGIN"), true);
    assert.equal(consultasTransaccion.includes("ROLLBACK"), true);
    assert.equal(consultasTransaccion.includes("COMMIT"), false);
    assert.equal(clientesLiberados, 1);
});
