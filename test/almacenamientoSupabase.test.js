const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const rutaModulo = require.resolve("../src/config/almacenamientoSupabase");
const moduloAnterior = require.cache[rutaModulo];
const entornoAnterior = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_BUCKET: process.env.SUPABASE_BUCKET
};

const llamadas = [];
let errorAlEliminar = null;
const urlPrueba = "https://proyecto-prueba.supabase.co";

process.env.SUPABASE_URL = urlPrueba;
process.env.SUPABASE_SERVICE_ROLE_KEY = "credencial-falsa-de-prueba";
process.env.SUPABASE_BUCKET = "multimedia";

const cargarOriginal = Module._load;
Module._load = function (solicitud, padre, esPrincipal) {
    if (solicitud === "@supabase/supabase-js") {
        return {
            createClient(url, clave) {
                assert.equal(url, urlPrueba);
                assert.equal(clave, "credencial-falsa-de-prueba");
                return {
                    storage: {
                        from(nombreBucket) {
                            return {
                                async remove(rutas) {
                                    llamadas.push({ nombreBucket, rutas });
                                    return { error: errorAlEliminar };
                                }
                            };
                        }
                    }
                };
            }
        };
    }

    return cargarOriginal.call(this, solicitud, padre, esPrincipal);
};

let almacenamiento;
try {
    delete require.cache[rutaModulo];
    almacenamiento = require("../src/config/almacenamientoSupabase");
} finally {
    Module._load = cargarOriginal;
    for (const [nombre, valor] of Object.entries(entornoAnterior)) {
        if (valor === undefined) delete process.env[nombre];
        else process.env[nombre] = valor;
    }
}

test.after(() => {
    if (moduloAnterior) require.cache[rutaModulo] = moduloAnterior;
    else delete require.cache[rutaModulo];
});

test("elimina solamente una ruta pública del bucket configurado", async () => {
    llamadas.length = 0;
    errorAlEliminar = null;

    const resultado = await almacenamiento.eliminarArchivo(
        urlPrueba + "/storage/v1/object/public/multimedia/multimedia/imagen/archivo-prueba.png"
    );

    assert.equal(resultado, true);
    assert.deepEqual(llamadas, [{
        nombreBucket: "multimedia",
        rutas: ["multimedia/imagen/archivo-prueba.png"]
    }]);
});

test("ignora rutas locales y URLs de otro origen", async () => {
    llamadas.length = 0;

    assert.equal(await almacenamiento.eliminarArchivo("imagenes/multimedia/archivo.png"), false);
    assert.equal(
        await almacenamiento.eliminarArchivo("https://otro-proyecto.example/storage/v1/object/public/multimedia/archivo.png"),
        false
    );

    assert.equal(llamadas.length, 0);
});

test("ignora URLs de otros buckets y rutas con segmentos inseguros", async () => {
    llamadas.length = 0;

    assert.equal(
        await almacenamiento.eliminarArchivo(urlPrueba + "/storage/v1/object/public/otro-bucket/archivo.png"),
        false
    );
    assert.equal(
        await almacenamiento.eliminarArchivo(urlPrueba + "/storage/v1/object/public/multimedia/%2E%2E/privado.png"),
        false
    );

    assert.equal(llamadas.length, 0);
});

test("no revela detalles del proveedor si Storage informa un error", async () => {
    llamadas.length = 0;
    errorAlEliminar = { message: "detalle interno simulado" };

    await assert.rejects(
        almacenamiento.eliminarArchivo(
            urlPrueba + "/storage/v1/object/public/multimedia/ficha/archivo.png"
        ),
        /No se pudo eliminar el archivo del almacenamiento/
    );

    errorAlEliminar = null;
});
