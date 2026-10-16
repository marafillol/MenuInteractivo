const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const menuControllerPath = require.resolve("../src/controladores/menus");
const fichaControllerPath = require.resolve("../src/controladores/fichas");
const oldMenuController = require.cache[menuControllerPath];
const oldFichaController = require.cache[fichaControllerPath];
const originalLoad = Module._load;

const state = {
    menuActual: { id_menu: 3, imagen: "https://project.supabase.co/storage/v1/object/public/multimedia/menus/old.png" },
    fichaActual: { id_ficha: 7, imagen: "https://project.supabase.co/storage/v1/object/public/multimedia/fichas/old.png" },
    subidas: [],
    eliminaciones: [],
    datosMenu: null,
    datosFicha: null,
    falloCrearMenu: false,
    falloActualizarMenu: false,
    falloCrearFicha: false,
    falloActualizarFicha: false
};

const storageMock = {
    async subirArchivo(archivo, carpeta) {
        state.subidas.push({ archivo, carpeta });
        return `https://project.supabase.co/storage/v1/object/public/multimedia/${carpeta}/nuevo.png`;
    },
    async eliminarArchivo(ruta) {
        state.eliminaciones.push(ruta);
        return true;
    }
};

Module._load = function (request, parent, isMain) {
    if (parent?.filename === menuControllerPath) {
        if (request === "../modelos/menu") {
            return {
                async obtenerPorId() { return state.menuActual; },
                async crear(datos) {
                    state.datosMenu = datos;
                    if (state.falloCrearMenu) throw new Error("fallo simulado al crear menú");
                    return 14;
                },
                async actualizar(id, datos) {
                    state.datosMenu = datos;
                    if (state.falloActualizarMenu) throw new Error("fallo simulado al actualizar menú");
                },
                async contarFichas() { return 0; },
                async eliminar() {}
            };
        }
        if (request === "../config/almacenamientoSupabase") return storageMock;
    }

    if (parent?.filename === fichaControllerPath) {
        if (request === "../modelos/ficha") {
            return {
                async obtenerFichas() { return []; },
                async obtenerFichasPorMenu() { return []; },
                async obtenerPorId() { return state.fichaActual; },
                async crear(datos) {
                    state.datosFicha = datos;
                    if (state.falloCrearFicha) throw new Error("fallo simulado al crear ficha");
                    return 18;
                },
                async actualizar(id, datos) {
                    state.datosFicha = datos;
                    if (state.falloActualizarFicha) throw new Error("fallo simulado al actualizar ficha");
                },
                async contarMultimedia() { return 0; },
                async eliminar() {}
            };
        }
        if (request === "../modelos/relacionFichaModelo" || request === "../modelos/fichaEtiquetaModelo") {
            return {};
        }
        if (request === "../config/almacenamientoSupabase") return storageMock;
    }

    return originalLoad.call(this, request, parent, isMain);
};

let menus;
let fichas;
try {
    delete require.cache[menuControllerPath];
    delete require.cache[fichaControllerPath];
    menus = require("../src/controladores/menus");
    fichas = require("../src/controladores/fichas");
} finally {
    Module._load = originalLoad;
}

function crearRespuesta() {
    return {
        statusCode: 200,
        cuerpo: undefined,
        status(codigo) { this.statusCode = codigo; return this; },
        json(cuerpo) { this.cuerpo = cuerpo; return this; }
    };
}

function reiniciar() {
    state.subidas = [];
    state.eliminaciones = [];
    state.datosMenu = null;
    state.datosFicha = null;
    state.falloCrearMenu = false;
    state.falloActualizarMenu = false;
    state.falloCrearFicha = false;
    state.falloActualizarFicha = false;
    state.menuActual = { id_menu: 3, imagen: "https://project.supabase.co/storage/v1/object/public/multimedia/menus/old.png" };
    state.fichaActual = { id_ficha: 7, imagen: "https://project.supabase.co/storage/v1/object/public/multimedia/fichas/old.png" };
}

test.after(() => {
    if (oldMenuController) require.cache[menuControllerPath] = oldMenuController;
    else delete require.cache[menuControllerPath];
    if (oldFichaController) require.cache[fichaControllerPath] = oldFichaController;
    else delete require.cache[fichaControllerPath];
});

test("crear menú limpia la imagen nueva si falla el guardado en la base", async () => {
    reiniciar();
    state.falloCrearMenu = true;
    const res = crearRespuesta();

    await menus.crearMenu({
        body: { nombre: "Menú de prueba", id_plantilla: 1 },
        file: { originalname: "nuevo.png", buffer: Buffer.from("prueba"), mimetype: "image/png" }
    }, res);

    assert.equal(res.statusCode, 500);
    assert.equal(state.subidas.length, 1);
    assert.equal(state.eliminaciones.length, 1);
    assert.match(state.eliminaciones[0], /menus\/nuevo\.png$/);
});

test("actualizar menú limpia la imagen nueva si falla la base y conserva la anterior", async () => {
    reiniciar();
    state.falloActualizarMenu = true;
    const res = crearRespuesta();

    await menus.actualizarMenu({
        params: { id: "3" },
        body: { nombre: "Menú editado", id_plantilla: 1 },
        file: { originalname: "nuevo.png", buffer: Buffer.from("prueba"), mimetype: "image/png" }
    }, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(state.eliminaciones, [
        "https://project.supabase.co/storage/v1/object/public/multimedia/menus/nuevo.png"
    ]);
});

test("actualizar menú elimina la imagen anterior solamente después de guardar", async () => {
    reiniciar();
    const res = crearRespuesta();

    await menus.actualizarMenu({
        params: { id: "3" },
        body: { nombre: "Menú editado", id_plantilla: 1 },
        file: { originalname: "nuevo.png", buffer: Buffer.from("prueba"), mimetype: "image/png" }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(state.datosMenu.imagen, "https://project.supabase.co/storage/v1/object/public/multimedia/menus/nuevo.png");
    assert.deepEqual(state.eliminaciones, [
        "https://project.supabase.co/storage/v1/object/public/multimedia/menus/old.png"
    ]);
});

test("crear ficha limpia la imagen nueva si falla el guardado en la base", async () => {
    reiniciar();
    state.falloCrearFicha = true;
    const res = crearRespuesta();

    await fichas.crearFicha({
        body: { titulo: "Ficha de prueba", id_menu: 1 },
        file: { originalname: "nuevo.png", buffer: Buffer.from("prueba"), mimetype: "image/png" }
    }, res);

    assert.equal(res.statusCode, 500);
    assert.equal(state.subidas.length, 1);
    assert.deepEqual(state.eliminaciones, [
        "https://project.supabase.co/storage/v1/object/public/multimedia/fichas/nuevo.png"
    ]);
});

test("actualizar ficha limpia la imagen nueva si falla la base y conserva la anterior", async () => {
    reiniciar();
    state.falloActualizarFicha = true;
    const res = crearRespuesta();

    await fichas.actualizarFicha({
        params: { id_ficha: "7" },
        body: { titulo: "Ficha editada", id_menu: 1 },
        file: { originalname: "nuevo.png", buffer: Buffer.from("prueba"), mimetype: "image/png" }
    }, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(state.eliminaciones, [
        "https://project.supabase.co/storage/v1/object/public/multimedia/fichas/nuevo.png"
    ]);
});

test("actualizar ficha elimina la imagen anterior solamente después de guardar", async () => {
    reiniciar();
    const res = crearRespuesta();

    await fichas.actualizarFicha({
        params: { id_ficha: "7" },
        body: { titulo: "Ficha editada", id_menu: 1 },
        file: { originalname: "nuevo.png", buffer: Buffer.from("prueba"), mimetype: "image/png" }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(state.datosFicha.imagen, "https://project.supabase.co/storage/v1/object/public/multimedia/fichas/nuevo.png");
    assert.deepEqual(state.eliminaciones, [
        "https://project.supabase.co/storage/v1/object/public/multimedia/fichas/old.png"
    ]);
});
