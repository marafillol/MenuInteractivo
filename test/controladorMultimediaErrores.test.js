const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const estado = {
    obtenerPorId: async () => null,
    actualizar: async () => { throw new Error("No debería intentar actualizar."); },
    eliminar: async () => { throw new Error("No debería intentar eliminar."); },
    subirArchivo: async () => { throw new Error("No debería subir un archivo."); }
};

const controladorPath = require.resolve("../src/controladores/multimedia");
const cacheAnterior = require.cache[controladorPath];
const cargarOriginal = Module._load;

Module._load = function (solicitud, padre, esPrincipal) {
    if (padre?.filename === controladorPath && solicitud === "../modelos/multimedia") {
        return {
            obtenerPorId: (...args) => estado.obtenerPorId(...args),
            actualizar: (...args) => estado.actualizar(...args),
            eliminar: (...args) => estado.eliminar(...args)
        };
    }

    if (padre?.filename === controladorPath && solicitud === "../config/almacenamientoSupabase") {
        return { subirArchivo: (...args) => estado.subirArchivo(...args) };
    }

    return cargarOriginal.call(this, solicitud, padre, esPrincipal);
};

let controlador;
try {
    delete require.cache[controladorPath];
    controlador = require("../src/controladores/multimedia");
} finally {
    Module._load = cargarOriginal;
}

test.after(() => {
    if (cacheAnterior) require.cache[controladorPath] = cacheAnterior;
    else delete require.cache[controladorPath];
});

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

test("actualizar multimedia inexistente devuelve 404 sin subir archivos ni escribir", async () => {
    let intentoActualizar = false;
    let intentoSubir = false;
    estado.obtenerPorId = async () => null;
    estado.actualizar = async () => { intentoActualizar = true; };
    estado.subirArchivo = async () => { intentoSubir = true; };

    const res = crearRespuesta();
    await controlador.actualizarMultimedia({
        params: { id: "99999" },
        body: { id_ficha: "1", descripcion: "Prueba", tipo_multi: "imagen" },
        file: { originalname: "prueba.png" }
    }, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.cuerpo.error, "No se encontró la multimedia.");
    assert.equal(intentoActualizar, false);
    assert.equal(intentoSubir, false);
});

test("eliminar multimedia inexistente devuelve 404", async () => {
    estado.eliminar = async () => {
        throw new Error("No se encontró la multimedia.");
    };

    const res = crearRespuesta();
    await controlador.eliminarMultimedia({ params: { id: "99999" } }, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.cuerpo.error, "No se encontró la multimedia.");
});

test("un error inesperado al eliminar multimedia mantiene respuesta 500", async () => {
    estado.eliminar = async () => {
        throw new Error("Error interno simulado.");
    };

    const res = crearRespuesta();
    await controlador.eliminarMultimedia({ params: { id: "8" } }, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.cuerpo.error, "Error interno simulado.");
});
