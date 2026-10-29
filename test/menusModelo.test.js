
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const dbPath = require.resolve("../src/database");
const menuPath = require.resolve("../src/modelos/menu");

const cacheAnterior = new Map(
    [dbPath, menuPath].map((ruta) => [ruta, require.cache[ruta]])
);

const originalLoad = Module._load;
const llamadas = [];

let siguienteId = 100;
let errorPendiente = null;
let filaMenu = undefined;
let filasMenus = [];
let cantidadFichas = 0;

function tomarError() {
    const error = errorPendiente;
    errorPendiente = null;
    return error;
}

const dbFalso = {
    run(sql, parametros, callback) {
        llamadas.push({
            tipo: "run",
            sql: String(sql),
            parametros: parametros || []
        });

        const error = tomarError();

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

        const error = tomarError();

        if (error) {
            callback(error);
            return;
        }

        if (/COUNT\s*\(\s*\*\s*\)\s+AS\s+cantidad/i.test(sql)) {
            callback(null, { cantidad: cantidadFichas });
            return;
        }

        callback(null, filaMenu);
    },

    all(sql, parametros, callback) {
        llamadas.push({
            tipo: "all",
            sql: String(sql),
            parametros: parametros || []
        });

        const error = tomarError();
        callback(error, error ? undefined : filasMenus);
    }
};

let Menu;

try {
    require.cache[dbPath] = {
        id: dbPath,
        filename: dbPath,
        loaded: true,
        exports: dbFalso
    };

    delete require.cache[menuPath];
    Menu = require("../src/modelos/menu");
} finally {
    Module._load = originalLoad;
}

function reiniciar() {
    llamadas.length = 0;
    siguienteId = 100;
    errorPendiente = null;

    filaMenu = {
        id_menu: 5,
        nombre: "Menú de prueba",
        descripcion: "Descripción",
        imagen: null,
        id_plantilla: 2,
        visible: 1
    };

    filasMenus = [filaMenu];
    cantidadFichas = 0;
}

test.beforeEach(reiniciar);

test.after(() => {
    for (const [ruta, modulo] of cacheAnterior) {
        if (modulo) {
            require.cache[ruta] = modulo;
        } else {
            delete require.cache[ruta];
        }
    }
});

test("listar menús devuelve las filas recibidas de la base", async () => {
    const resultado = await Menu.obtenerMenus();

    assert.deepEqual(resultado, [filaMenu]);
    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].tipo, "all");
    assert.match(llamadas[0].sql, /SELECT\s+menu\.\*/i);
    assert.match(llamadas[0].sql, /LEFT\s+JOIN\s+plantilla/i);
});

test("listar menús devuelve una lista vacía cuando no hay registros", async () => {
    filasMenus = [];

    const resultado = await Menu.obtenerMenus();

    assert.deepEqual(resultado, []);
});

test("listar menús propaga errores de la base de datos", async () => {
    errorPendiente = new Error("fallo al listar");

    await assert.rejects(Menu.obtenerMenus(), /fallo al listar/);
});

test("buscar menú consulta por ID y devuelve el registro", async () => {
    const resultado = await Menu.obtenerPorId(5);

    assert.deepEqual(resultado, filaMenu);
    assert.equal(llamadas[0].tipo, "get");
    assert.match(
        llamadas[0].sql,
        /WHERE\s+menu\.id_menu\s*=\s*\?/i
    );
    assert.deepEqual(llamadas[0].parametros, [5]);
});

test("buscar menú inexistente devuelve undefined", async () => {
    filaMenu = undefined;

    const resultado = await Menu.obtenerPorId(999);

    assert.equal(resultado, undefined);
});

test("buscar menú propaga errores de la base", async () => {
    errorPendiente = new Error("fallo al buscar");

    await assert.rejects(Menu.obtenerPorId(5), /fallo al buscar/);
});

test("crear menú guarda todos los campos y devuelve el ID generado", async () => {
    siguienteId = 321;

    const id = await Menu.crear({
        nombre: "Historia",
        descripcion: "Descripción nueva",
        imagen: "imagen.png",
        id_plantilla: 4,
        visible: 0
    });

    assert.equal(id, 321);
    assert.equal(llamadas[0].tipo, "run");
    assert.match(llamadas[0].sql, /INSERT INTO menu/i);
    assert.deepEqual(llamadas[0].parametros, [
        "Historia",
        "Descripción nueva",
        "imagen.png",
        4,
        0
    ]);
});

test("crear menú convierte descripción e imagen vacías a null", async () => {
    await Menu.crear({
        nombre: "Historia",
        descripcion: "",
        imagen: "",
        id_plantilla: 4,
        visible: 1
    });

    assert.deepEqual(llamadas[0].parametros, [
        "Historia",
        null,
        null,
        4,
        1
    ]);
});

test("crear menú usa visible igual a 1 si el valor es null o undefined", async () => {
    await Menu.crear({
        nombre: "Historia",
        id_plantilla: 4
    });

    assert.equal(llamadas[0].parametros[4], 1);
});

test("crear menú propaga errores de la base", async () => {
    errorPendiente = new Error("fallo al crear");

    await assert.rejects(
        Menu.crear({
            nombre: "Historia",
            id_plantilla: 1
        }),
        /fallo al crear/
    );
});

test("actualizar menú envía los campos en el orden esperado", async () => {
    await Menu.actualizar(5, {
        nombre: "Historia actualizada",
        descripcion: "Nueva descripción",
        id_plantilla: 3,
        visible: 0
    });

    assert.equal(llamadas[0].tipo, "run");
    assert.match(llamadas[0].sql, /UPDATE\s+menu/i);
    assert.match(
        llamadas[0].sql,
        /imagen\s*=\s*COALESCE\(\?,\s*imagen\)/i
    );

    assert.deepEqual(llamadas[0].parametros, [
        "Historia actualizada",
        "Nueva descripción",
        null,
        3,
        0,
        5
    ]);
});

test("actualizar menú permite enviar una nueva imagen", async () => {
    await Menu.actualizar(5, {
        nombre: "Historia",
        descripcion: null,
        imagen: "nueva.png",
        id_plantilla: 3,
        visible: 1
    });

    assert.equal(llamadas[0].parametros[2], "nueva.png");
});

test("actualizar menú propaga errores de la base", async () => {
    errorPendiente = new Error("fallo al actualizar");

    await assert.rejects(
        Menu.actualizar(5, {
            nombre: "Historia",
            descripcion: null,
            id_plantilla: 3,
            visible: 1
        }),
        /fallo al actualizar/
    );
});

test("eliminar menú ejecuta DELETE usando el ID recibido", async () => {
    await Menu.eliminar(5);

    assert.equal(llamadas[0].tipo, "run");
    assert.match(llamadas[0].sql, /DELETE\s+FROM\s+menu/i);
    assert.deepEqual(llamadas[0].parametros, [5]);
});

test("eliminar menú propaga errores de la base", async () => {
    errorPendiente = new Error("fallo al eliminar");

    await assert.rejects(Menu.eliminar(5), /fallo al eliminar/);
});

test("contar fichas devuelve la cantidad asociada al menú", async () => {
    cantidadFichas = 7;

    const cantidad = await Menu.contarFichas(5);

    assert.equal(cantidad, 7);
    assert.equal(llamadas[0].tipo, "get");
    assert.match(llamadas[0].sql, /COUNT\s*\(\s*\*\s*\)/i);
    assert.match(llamadas[0].sql, /FROM\s+ficha/i);
    assert.deepEqual(llamadas[0].parametros, [5]);
});

test("contar fichas devuelve cero si el menú no tiene fichas", async () => {
    cantidadFichas = 0;

    assert.equal(await Menu.contarFichas(5), 0);
});

test("contar fichas propaga errores de la base", async () => {
    errorPendiente = new Error("fallo al contar");

    await assert.rejects(Menu.contarFichas(5), /fallo al contar/);
});
