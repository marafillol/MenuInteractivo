
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const controllerPath = require.resolve("../src/controladores/menus");
const oldController = require.cache[controllerPath];
const originalLoad = Module._load;

const state = {
    menus: [{ id_menu: 1, nombre: "Historia" }],
    menu: {
        id_menu: 3,
        nombre: "Menú anterior",
        imagen: "menus/anterior.png"
    },
    cantidadFichas: 0,
    subidas: [],
    eliminaciones: [],
    datosCreados: null,
    datosActualizados: null,
    error: null,
    menuNoExiste: false
};

const rutaImagenNueva = "menus/nueva.png";

const MenuMock = {
    async obtenerMenus() {
        if (state.error) throw state.error;
        return state.menus;
    },

    async obtenerPorId(id) {
        if (state.error) throw state.error;
        if (state.menuNoExiste) return undefined;
        return { ...state.menu, id_menu: Number(id) };
    },

    async crear(datos) {
        state.datosCreados = datos;
        if (state.error) throw state.error;
        return 15;
    },

    async actualizar(id, datos) {
        state.datosActualizados = { id, datos };
        if (state.error) throw state.error;
    },

    async contarFichas() {
        if (state.error) throw state.error;
        return state.cantidadFichas;
    },

    async eliminar(id) {
        state.idEliminado = id;
        if (state.error) throw state.error;
    }
};

const almacenamientoMock = {
    async subirArchivo(archivo, carpeta) {
        state.subidas.push({ archivo, carpeta });
        return archivo ? rutaImagenNueva : null;
    },

    async eliminarArchivo(ruta) {
        state.eliminaciones.push(ruta);
    }
};

Module._load = function (request, parent, isMain) {
    if (parent?.filename === controllerPath) {
        if (request === "../modelos/menu") return MenuMock;

        if (request === "../config/almacenamientoSupabase") {
            return almacenamientoMock;
        }
    }

    return originalLoad.call(this, request, parent, isMain);
};

let controller;

try {
    delete require.cache[controllerPath];
    controller = require("../src/controladores/menus");
} finally {
    Module._load = originalLoad;
}

function crearRespuesta() {
    return {
        statusCode: 200,
        cuerpo: undefined,

        status(codigo) {
            this.statusCode = codigo;
            return this;
        },

        json(cuerpo) {
            this.cuerpo = cuerpo;
            return this;
        }
    };
}

function reiniciar() {
    state.menus = [{ id_menu: 1, nombre: "Historia" }];
    state.menu = {
        id_menu: 3,
        nombre: "Menú anterior",
        imagen: "menus/anterior.png"
    };
    state.cantidadFichas = 0;
    state.subidas = [];
    state.eliminaciones = [];
    state.datosCreados = null;
    state.datosActualizados = null;
    state.error = null;
    state.menuNoExiste = false;
    state.idEliminado = null;
}

test.beforeEach(reiniciar);

test.after(() => {
    if (oldController) {
        require.cache[controllerPath] = oldController;
    } else {
        delete require.cache[controllerPath];
    }
});

test("listar menús devuelve los registros", async () => {
    const res = crearRespuesta();

    await controller.listarMenus({}, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.cuerpo, state.menus);
});

test("listar menús responde 500 si falla el modelo", async () => {
    state.error = new Error("fallo de consulta");
    const res = crearRespuesta();

    await controller.listarMenus({}, res);

    assert.equal(res.statusCode, 500);
    assert.match(res.cuerpo.error, /fallo de consulta/);
});

test("obtener menú devuelve el registro solicitado", async () => {
    const res = crearRespuesta();

    await controller.obtenerMenu({ params: { id: "3" } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.cuerpo.id_menu, 3);
});

test("obtener menú responde 500 ante un error del modelo", async () => {
    state.error = new Error("fallo al buscar");
    const res = crearRespuesta();

    await controller.obtenerMenu({ params: { id: "3" } }, res);

    assert.equal(res.statusCode, 500);
});

test("crear menú rechaza un nombre vacío", async () => {
    const res = crearRespuesta();

    await controller.crearMenu({
        body: { nombre: "   ", id_plantilla: 1 }
    }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(state.datosCreados, null);
    assert.equal(state.subidas.length, 0);
});

test("crear menú rechaza la ausencia de plantilla", async () => {
    const res = crearRespuesta();

    await controller.crearMenu({
        body: { nombre: "Historia" }
    }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(state.datosCreados, null);
    assert.equal(state.subidas.length, 0);
});

test("crear menú recorta texto y devuelve el ID creado", async () => {
    const res = crearRespuesta();

    await controller.crearMenu({
        body: {
            nombre: "  Historia  ",
            descripcion: "  Descripción  ",
            id_plantilla: 2,
            visible: 1
        }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.cuerpo.id_menu, 15);
    assert.equal(state.datosCreados.nombre, "Historia");
    assert.equal(state.datosCreados.descripcion, "Descripción");
    assert.equal(state.datosCreados.id_plantilla, 2);
    assert.equal(state.datosCreados.imagen, null);
});

test("crear menú sube la imagen a la carpeta menus", async () => {
    const archivo = {
        originalname: "historia.png",
        buffer: Buffer.from("simulada"),
        mimetype: "image/png"
    };
    const res = crearRespuesta();

    await controller.crearMenu({
        body: {
            nombre: "Historia",
            id_plantilla: 2
        },
        file: archivo
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(state.subidas.length, 1);
    assert.equal(state.subidas[0].archivo, archivo);
    assert.equal(state.subidas[0].carpeta, "menus");
    assert.equal(state.datosCreados.imagen, rutaImagenNueva);
});

test("crear menú limpia la imagen nueva si falla el modelo", async () => {
    state.error = new Error("fallo al crear");
    const res = crearRespuesta();

    await controller.crearMenu({
        body: {
            nombre: "Historia",
            id_plantilla: 2
        },
        file: { originalname: "historia.png" }
    }, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(state.eliminaciones, [rutaImagenNueva]);
});

test("actualizar menú rechaza nombre vacío", async () => {
    const res = crearRespuesta();

    await controller.actualizarMenu({
        params: { id: "3" },
        body: { nombre: " ", id_plantilla: 2 }
    }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(state.datosActualizados, null);
});

test("actualizar menú rechaza plantilla ausente", async () => {
    const res = crearRespuesta();

    await controller.actualizarMenu({
        params: { id: "3" },
        body: { nombre: "Historia" }
    }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(state.datosActualizados, null);
});

test("actualizar menú sin imagen no sube archivos", async () => {
    const res = crearRespuesta();

    await controller.actualizarMenu({
        params: { id: "3" },
        body: {
            nombre: "Historia editada",
            descripcion: "Nueva descripción",
            id_plantilla: 2,
            visible: 1
        }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(state.subidas.length, 0);
    assert.equal(state.datosActualizados.id, "3");
    assert.equal(state.datosActualizados.datos.imagen, undefined);
});

test("actualizar menú con imagen nueva guarda la ruta", async () => {
    const res = crearRespuesta();

    await controller.actualizarMenu({
        params: { id: "3" },
        body: {
            nombre: "Historia editada",
            id_plantilla: 2
        },
        file: { originalname: "nueva.png" }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(state.datosActualizados.datos.imagen, rutaImagenNueva);
});

test("actualizar menú inexistente con imagen responde 404", async () => {
    state.menuNoExiste = true;
    const res = crearRespuesta();

    await controller.actualizarMenu({
        params: { id: "999" },
        body: { nombre: "Historia", id_plantilla: 2 },
        file: { originalname: "nueva.png" }
    }, res);

    assert.equal(res.statusCode, 404);
    assert.equal(state.subidas.length, 0);
    assert.equal(state.datosActualizados, null);
});


test("actualizar menú limpia la imagen nueva si falla el modelo", async () => {
    const res = crearRespuesta();

    // La consulta del menú funciona, pero falla la actualización.
    const originalActualizar = MenuMock.actualizar;
    MenuMock.actualizar = async () => {
        throw new Error("fallo al actualizar");
    };

    try {
        await controller.actualizarMenu({
            params: { id: "3" },
            body: {
                nombre: "Historia",
                id_plantilla: 2
            },
            file: { originalname: "nueva.png" }
        }, res);

        assert.equal(res.statusCode, 500);
        assert.deepEqual(state.eliminaciones, [rutaImagenNueva]);
    } finally {
        MenuMock.actualizar = originalActualizar;
    }
});


test("eliminar menú rechaza la operación si tiene fichas", async () => {
    state.cantidadFichas = 2;
    const res = crearRespuesta();

    await controller.eliminarMenu({ params: { id: "3" } }, res);

    assert.equal(res.statusCode, 409);
    assert.equal(state.idEliminado, null);
});

test("eliminar menú sin fichas elimina y responde correctamente", async () => {
    const res = crearRespuesta();

    await controller.eliminarMenu({ params: { id: "3" } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(state.idEliminado, "3");
    assert.match(res.cuerpo.mensaje, /eliminado correctamente/i);
});

test("eliminar menú responde 500 si falla el conteo o el borrado", async () => {
    state.error = new Error("fallo de base");
    const res = crearRespuesta();

    await controller.eliminarMenu({ params: { id: "3" } }, res);

    assert.equal(res.statusCode, 500);
});

test("eliminar menú responde 500 si falla el borrado", async () => {
    const res = crearRespuesta();

    // El conteo funciona; simulamos que el borrado falla.
    const originalEliminar = MenuMock.eliminar;
    MenuMock.eliminar = async () => {
        throw new Error("fallo al borrar");
    };

    try {
        await controller.eliminarMenu({ params: { id: "3" } }, res);
        assert.equal(res.statusCode, 500);
    } finally {
        MenuMock.eliminar = originalEliminar;
    }
});
