const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const estado = {
    obtenerPorId: async () => null,
    actualizar: async () => { throw new Error("No debería intentar actualizar."); },
    eliminar: async () => { throw new Error("No debería intentar eliminar."); },
    subirArchivo: async () => { throw new Error("No debería subir un archivo."); },
    eliminarArchivo: async () => false
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
        return {
            subirArchivo: (...args) => estado.subirArchivo(...args),
            eliminarArchivo: (...args) => estado.eliminarArchivo(...args)
        };
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
    estado.obtenerPorId = async () => ({
        id_multi: 99999,
        ruta_archivo: "https://ejemplo.invalid/archivo.png"
    });
    estado.eliminar = async () => {
        throw new Error("No se encontró la multimedia.");
    };

    const res = crearRespuesta();
    await controlador.eliminarMultimedia({ params: { id: "99999" } }, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.cuerpo.error, "No se encontró la multimedia.");
});

test("un error inesperado al eliminar multimedia mantiene respuesta 500", async () => {
    estado.obtenerPorId = async () => ({
        id_multi: 8,
        ruta_archivo: "https://ejemplo.invalid/archivo.png"
    });
    estado.eliminar = async () => {
        throw new Error("Error interno simulado.");
    };

    const res = crearRespuesta();
    await controlador.eliminarMultimedia({ params: { id: "8" } }, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.cuerpo.error, "Error interno simulado.");
});


test("crear multimedia sin archivo devuelve 400 antes de subir o guardar", async () => {
    let intentoCrear = false;
    let intentoSubir = false;
    estado.subirArchivo = async () => { intentoSubir = true; return "url-falsa"; };
    estado.obtenerPorId = async () => null;
    estado.actualizar = async () => {};
    estado.eliminar = async () => {};
    // El controlador recibe el modelo desde el mock del módulo.
    const originalCrear = estado.crear;
    estado.crear = async () => { intentoCrear = true; return 1; };

    const res = crearRespuesta();
    await controlador.crearMultimedia({
        body: { id_ficha: "3", tipo_multi: "imagen" },
        file: undefined
    }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(intentoCrear, false);
    assert.equal(intentoSubir, false);
    estado.crear = originalCrear;
});

test("crear multimedia rechaza un tipo no permitido", async () => {
    const res = crearRespuesta();

    await controlador.crearMultimedia({
        body: { id_ficha: "3", tipo_multi: "ejecutable" },
        file: { originalname: "archivo.exe" }
    }, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.cuerpo.error, /tipo de multimedia válido/);
});

test("actualizar multimedia no permite cambiar de tipo sin subir otro archivo", async () => {
    let intentoActualizar = false;
    estado.obtenerPorId = async () => ({
        id_multi: 8,
        id_ficha: 3,
        tipo_multi: "imagen",
        miniatura: "🖼️",
        activo: 1,
        ruta_archivo: "https://ejemplo.invalid/imagen.png"
    });
    estado.actualizar = async () => { intentoActualizar = true; };

    const res = crearRespuesta();
    await controlador.actualizarMultimedia({
        params: { id: "8" },
        body: { id_ficha: "3", tipo_multi: "video", activo: "1" }
    }, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.cuerpo.error, /archivo nuevo/);
    assert.equal(intentoActualizar, false);
});

test("eliminar multimedia elimina el registro y solicita limpieza de la ruta asociada", async () => {
    const pasos = [];
    estado.obtenerPorId = async () => ({
        id_multi: 8,
        ruta_archivo: "https://proyecto-prueba.supabase.co/storage/v1/object/public/multimedia/multimedia/imagen/a.png"
    });
    estado.eliminar = async () => { pasos.push("registro"); };
    estado.eliminarArchivo = async (ruta) => {
        pasos.push("archivo");
        assert.match(ruta, /storage\/v1\/object\/public/);
        return true;
    };

    const res = crearRespuesta();
    await controlador.eliminarMultimedia({ params: { id: "8" } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(pasos, ["registro", "archivo"]);
    assert.match(res.cuerpo.mensaje, /eliminada correctamente/);
});

test("si falla la limpieza de Storage, la respuesta informa la advertencia sin ocultar el borrado del registro", async () => {
    estado.obtenerPorId = async () => ({
        id_multi: 9,
        ruta_archivo: "https://proyecto-prueba.supabase.co/storage/v1/object/public/multimedia/ficha/a.png"
    });
    estado.eliminar = async () => {};
    estado.eliminarArchivo = async () => { throw new Error("fallo storage simulado"); };

    const res = crearRespuesta();
    await controlador.eliminarMultimedia({ params: { id: "9" } }, res);

    assert.equal(res.statusCode, 200);
    assert.match(res.cuerpo.advertencia, /no se pudo eliminar el archivo/);
});
