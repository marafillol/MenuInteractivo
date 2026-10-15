const test = require("node:test");
const assert = require("node:assert/strict");
const { traducirConsulta } = require("../src/databaseSqlCompat");

const dbPath = require.resolve("../src/database");
const modelPaths = [
    require.resolve("../src/modelos/menu"),
    require.resolve("../src/modelos/ficha"),
    require.resolve("../src/modelos/etiquetaModelo"),
    require.resolve("../src/modelos/configuracion"),
    require.resolve("../src/modelos/fichaEtiquetaModelo")
];

const cacheAnterior = new Map(
    [dbPath, ...modelPaths].map((ruta) => [ruta, require.cache[ruta]])
);

const llamadas = [];
let siguienteId = 700;
let proximoError = null;

const dbFalso = {
    run(sql, parametros, callback) {
        if (typeof parametros === "function") {
            callback = parametros;
            parametros = [];
        }

        llamadas.push({
            tipo: "run",
            sql: String(sql),
            parametros: parametros || []
        });

        const error = proximoError;
        proximoError = null;

        if (callback) {
            callback.call(
                { lastID: siguienteId++, changes: 1 },
                error
            );
        }
    },

    get(sql, parametros, callback) {
        llamadas.push({
            tipo: "get",
            sql: String(sql),
            parametros: parametros || []
        });
        if (callback) callback(null, undefined);
    },

    all(sql, parametros, callback) {
        llamadas.push({
            tipo: "all",
            sql: String(sql),
            parametros: parametros || []
        });
        if (callback) callback(null, []);
    },

    serialize(funcion) {
        funcion();
    },

    prepare(sql) {
        llamadas.push({ tipo: "prepare", sql: String(sql) });

        return {
            run(...argumentos) {
                llamadas.push({
                    tipo: "prepare.run",
                    parametros: argumentos
                });
                return this;
            },

            finalize(callback) {
                llamadas.push({ tipo: "finalize" });
                if (callback) callback(null);
                return this;
            }
        };
    }
};

require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: dbFalso
};

for (const ruta of modelPaths) delete require.cache[ruta];

const Menu = require("../src/modelos/menu");
const Ficha = require("../src/modelos/ficha");
const Etiqueta = require("../src/modelos/etiquetaModelo");
const Configuracion = require("../src/modelos/configuracion");
const FichaEtiqueta = require("../src/modelos/fichaEtiquetaModelo");

test.after(() => {
    for (const [ruta, modulo] of cacheAnterior) {
        if (modulo) require.cache[ruta] = modulo;
        else delete require.cache[ruta];
    }
});

test("crear menú envía los campos esperados y devuelve el ID simulado", async () => {
    llamadas.length = 0;
    siguienteId = 701;

    const id = await Menu.crear({
        nombre: "Menú de prueba",
        descripcion: "Descripción de prueba",
        imagen: null,
        id_plantilla: 2,
        visible: 1
    });

    const consulta = llamadas.find((llamada) => llamada.tipo === "run");
    assert.equal(id, 701);
    assert.match(consulta.sql, /INSERT INTO menu/i);
    assert.deepEqual(consulta.parametros, [
        "Menú de prueba",
        "Descripción de prueba",
        null,
        2,
        1
    ]);
    assert.equal(consulta.sql.includes("RETURNING"), false);
});

test("actualizar menú conserva la imagen anterior cuando no se envía otra", async () => {
    llamadas.length = 0;

    await Menu.actualizar(12, {
        nombre: "Menú editado",
        descripcion: "Descripción editada",
        id_plantilla: 3,
        visible: 0
    });

    const consulta = llamadas.find((llamada) => llamada.tipo === "run");
    assert.match(consulta.sql, /UPDATE menu/i);
    assert.match(consulta.sql, /imagen\s*=\s*COALESCE\(\?,\s*imagen\)/i);
    assert.deepEqual(consulta.parametros, [
        "Menú editado",
        "Descripción editada",
        null,
        3,
        0,
        12
    ]);
});

test("crear ficha envía datos_json como JSON válido y devuelve el ID simulado", async () => {
    llamadas.length = 0;
    siguienteId = 702;
    const datosJson = JSON.stringify({ fecha: "1982", lugar: "Malvinas" });

    const id = await Ficha.crear({
        id_menu: 3,
        titulo: "Ficha de prueba",
        resumen: "",
        texto: "Texto",
        imagen: null,
        datos_json: datosJson,
        visible: 0
    });

    const consulta = llamadas.find((llamada) => llamada.tipo === "run");
    assert.equal(id, 702);
    assert.match(consulta.sql, /INSERT INTO ficha/i);
    assert.deepEqual(consulta.parametros, [
        3,
        "Ficha de prueba",
        null,
        "Texto",
        null,
        datosJson,
        0
    ]);
    assert.deepEqual(JSON.parse(consulta.parametros[5]), {
        fecha: "1982",
        lugar: "Malvinas"
    });
});

test("actualizar ficha omite la columna imagen si no se envía un archivo nuevo", async () => {
    llamadas.length = 0;

    await Ficha.actualizar(34, {
        id_menu: 3,
        titulo: "Ficha editada",
        resumen: null,
        texto: "Texto actualizado",
        visible: 1,
        datos_json: JSON.stringify({ campo: "valor" })
    });

    const consulta = llamadas.find((llamada) => llamada.tipo === "run");
    assert.match(consulta.sql, /UPDATE ficha/i);
    assert.doesNotMatch(consulta.sql, /imagen\s*=\s*\?/i);
    assert.deepEqual(consulta.parametros, [
        3,
        "Ficha editada",
        null,
        "Texto actualizado",
        1,
        JSON.stringify({ campo: "valor" }),
        34
    ]);
});

test("actualizar ficha incluye la imagen cuando se proporciona una nueva", async () => {
    llamadas.length = 0;

    await Ficha.actualizar(34, {
        id_menu: 3,
        titulo: "Ficha editada",
        resumen: null,
        texto: "Texto actualizado",
        visible: 1,
        datos_json: "{}",
        imagen: "https://ejemplo.invalid/ficha.png"
    });

    const consulta = llamadas.find((llamada) => llamada.tipo === "run");
    assert.match(consulta.sql, /imagen\s*=\s*\?/i);
    assert.deepEqual(consulta.parametros, [
        3,
        "Ficha editada",
        null,
        "Texto actualizado",
        1,
        "{}",
        "https://ejemplo.invalid/ficha.png",
        34
    ]);
});

test("crear y editar etiqueta envían sus valores e identificadores", async () => {
    llamadas.length = 0;
    siguienteId = 703;

    const creada = await Etiqueta.crear({
        nombre: "Historia",
        descripcion: "Etiqueta de prueba",
        activo: 1
    });

    let consulta = llamadas.find((llamada) => llamada.tipo === "run");
    assert.equal(creada.id_etiqueta, 703);
    assert.match(consulta.sql, /INSERT INTO etiqueta/i);
    assert.deepEqual(consulta.parametros, [
        "Historia",
        "Etiqueta de prueba",
        1
    ]);

    llamadas.length = 0;
    const editada = await Etiqueta.editar(8, {
        nombre: "Historia editada",
        descripcion: "Descripción nueva",
        activo: 0
    });

    consulta = llamadas.find((llamada) => llamada.tipo === "run");
    assert.equal(editada.id_etiqueta, 8);
    assert.match(consulta.sql, /UPDATE etiqueta/i);
    assert.deepEqual(consulta.parametros, [
        "Historia editada",
        "Descripción nueva",
        0,
        8
    ]);
});

test("reemplazar etiquetas elimina las anteriores e inserta las nuevas con parámetros", async () => {
    llamadas.length = 0;

    const resultado = await FichaEtiqueta.reemplazar(34, [2, 5]);

    assert.equal(resultado, true);
    assert.equal(llamadas[0].tipo, "run");
    assert.match(llamadas[0].sql, /DELETE\s+FROM\s+ficha_etiqueta/i);
    assert.deepEqual(llamadas[0].parametros, [34]);

    const preparacion = llamadas.find((llamada) => llamada.tipo === "prepare");
    assert.match(preparacion.sql, /INSERT INTO ficha_etiqueta/i);

    const inserciones = llamadas.filter((llamada) => llamada.tipo === "prepare.run");
    assert.deepEqual(inserciones.map((llamada) => llamada.parametros), [
        [34, 2],
        [34, 5]
    ]);
    assert.equal(llamadas.at(-1).tipo, "finalize");
});

test("reemplazar etiquetas con una lista vacía quita las asociaciones de esa ficha", async () => {
    llamadas.length = 0;

    const resultado = await FichaEtiqueta.reemplazar(34, []);

    assert.equal(resultado, true);
    assert.equal(llamadas.length, 1);
    assert.match(llamadas[0].sql, /DELETE\s+FROM\s+ficha_etiqueta/i);
});

test("guardar configuración usa el upsert compatible y conserva el JSON recibido", async () => {
    llamadas.length = 0;
    const valor = JSON.stringify({ fondo: "pergamino", tiempoInactividad: 30 });

    await Configuracion.guardar("estilo_visitante", valor);

    const consulta = llamadas.find((llamada) => llamada.tipo === "run");
    assert.match(consulta.sql, /INSERT\s+OR\s+REPLACE\s+INTO\s+configuracion/i);
    assert.deepEqual(consulta.parametros, ["estilo_visitante", valor]);

    const postgres = traducirConsulta(consulta.sql);
    assert.match(postgres, /INSERT INTO configuracion/i);
    assert.match(postgres, /ON CONFLICT \(clave\) DO UPDATE/i);
    assert.deepEqual(JSON.parse(consulta.parametros[1]), {
        fondo: "pergamino",
        tiempoInactividad: 30
    });
});

test("los errores de base de datos se propagan en la creación de menú", async () => {
    llamadas.length = 0;
    proximoError = Object.assign(new Error("error simulado"), { code: "XX000" });

    await assert.rejects(
        Menu.crear({
            nombre: "No debe persistirse",
            descripcion: null,
            imagen: null,
            id_plantilla: 1,
            visible: 1
        }),
        /error simulado/
    );
});


test("reemplazar etiquetas usa la transacción PostgreSQL si está disponible", async () => {
    llamadas.length = 0;

    dbFalso.withTransaction = async (trabajo) => {
        llamadas.push({ tipo: "transaction.begin" });
        try {
            const resultado = await trabajo(async (sql, parametros = []) => {
                llamadas.push({
                    tipo: "transaction.query",
                    sql: String(sql),
                    parametros
                });
                return { rowCount: 1, rows: [] };
            });
            llamadas.push({ tipo: "transaction.commit" });
            return resultado;
        } catch (error) {
            llamadas.push({ tipo: "transaction.rollback" });
            throw error;
        }
    };

    try {
        const resultado = await FichaEtiqueta.reemplazar(34, [2, 5]);

        assert.equal(resultado, true);
        assert.equal(llamadas[0].tipo, "transaction.begin");
        assert.match(llamadas[1].sql, /DELETE FROM ficha_etiqueta/i);
        assert.deepEqual(llamadas[1].parametros, [34]);
        assert.match(llamadas[2].sql, /INSERT INTO ficha_etiqueta/i);
        assert.deepEqual(llamadas[2].parametros, [34, 2]);
        assert.deepEqual(llamadas[3].parametros, [34, 5]);
        assert.equal(llamadas.at(-1).tipo, "transaction.commit");
    } finally {
        delete dbFalso.withTransaction;
    }
});

test("reemplazar etiquetas rechaza un valor que no sea una lista", async () => {
    await assert.rejects(
        FichaEtiqueta.reemplazar(34, null),
        /Las etiquetas deben enviarse como una lista/
    );
});
