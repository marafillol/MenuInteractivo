const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const { createHash } = require("node:crypto");

const rutaModulo = require.resolve("../src/config/almacenamientoSupabase");
const rutaModoServidor = require.resolve("../src/config/modoServidor");
const moduloAnterior = require.cache[rutaModulo];
const modoServidorAnterior = require.cache[rutaModoServidor];
const entornoAnterior = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_BUCKET: process.env.SUPABASE_BUCKET,
    MODO_SERVIDOR: process.env.MODO_SERVIDOR
};

const llamadas = [];
let errorAlEliminar = null;
let errorAlSubir = null;
let contenidoStorage = Buffer.from("archivo remoto de prueba");
const urlPrueba = "https://proyecto-prueba.supabase.co";

process.env.MODO_SERVIDOR = "supabase";
process.env.SUPABASE_URL = urlPrueba;
process.env.SUPABASE_SERVICE_ROLE_KEY = "credencial-falsa-de-prueba";
delete process.env.SUPABASE_SECRET_KEY;
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
                                },
                                async upload(ruta, contenido, opciones) {
                                    llamadas.push({ nombreBucket, ruta, contenido: Buffer.from(contenido), opciones });
                                    return { error: errorAlSubir };
                                },
                                async download(ruta) {
                                    llamadas.push({ nombreBucket, descarga: ruta });
                                    return { data: new Blob([contenidoStorage]), error: null };
                                },
                                getPublicUrl(ruta) {
                                    return { data: { publicUrl: urlPrueba + "/storage/v1/object/public/" + nombreBucket + "/" + ruta } };
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
    delete require.cache[rutaModoServidor];
    almacenamiento = require("../src/config/almacenamientoSupabase");
} finally {
    Module._load = cargarOriginal;
    if (modoServidorAnterior) require.cache[rutaModoServidor] = modoServidorAnterior;
    else delete require.cache[rutaModoServidor];
    for (const [nombre, valor] of Object.entries(entornoAnterior)) {
        if (valor === undefined) delete process.env[nombre];
        else process.env[nombre] = valor;
    }
}

test("acepta SUPABASE_SECRET_KEY como alternativa a SUPABASE_SERVICE_ROLE_KEY", () => {
    const moduloCacheadoAntes = require.cache[rutaModulo];
    const modoCacheadoAntes = require.cache[rutaModoServidor];
    const entorno = {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
        SUPABASE_BUCKET: process.env.SUPABASE_BUCKET,
        MODO_SERVIDOR: process.env.MODO_SERVIDOR
    };
    const loadAnterior = Module._load;
    const claveSecretaPrueba = "clave-secreta-falsa-de-prueba";

    try {
        process.env.MODO_SERVIDOR = "supabase";
        process.env.SUPABASE_URL = urlPrueba;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        process.env.SUPABASE_SECRET_KEY = claveSecretaPrueba;
        process.env.SUPABASE_BUCKET = "multimedia";

        Module._load = function (solicitud, padre, esPrincipal) {
            if (solicitud === "@supabase/supabase-js") {
                return {
                    createClient(url, clave, opciones) {
                        assert.equal(url, urlPrueba);
                        assert.equal(clave, claveSecretaPrueba);
                        assert.equal(opciones.auth.persistSession, false);
                        return { storage: {} };
                    }
                };
            }
            return loadAnterior.call(this, solicitud, padre, esPrincipal);
        };

        delete require.cache[rutaModulo];
        delete require.cache[rutaModoServidor];
        const moduloAlternativo = require("../src/config/almacenamientoSupabase");
        assert.equal(moduloAlternativo.estaConfigurado, true);
    } finally {
        Module._load = loadAnterior;
        delete require.cache[rutaModulo];
        delete require.cache[rutaModoServidor];
        if (moduloCacheadoAntes) require.cache[rutaModulo] = moduloCacheadoAntes;
        if (modoCacheadoAntes) require.cache[rutaModoServidor] = modoCacheadoAntes;
        for (const [nombre, valor] of Object.entries(entorno)) {
            if (valor === undefined) delete process.env[nombre];
            else process.env[nombre] = valor;
        }
    }
});

test.after(() => {
    if (moduloAnterior) require.cache[rutaModulo] = moduloAnterior;
    else delete require.cache[rutaModulo];
    if (modoServidorAnterior) require.cache[rutaModoServidor] = modoServidorAnterior;
    else delete require.cache[rutaModoServidor];
});

test("sube multimedia con clave estable y verifica SHA-256", async () => {
    llamadas.length = 0;
    const contenido = Buffer.from("archivo sincronizado");
    const checksum = createHash("sha256").update(contenido).digest("hex");
    const clave = "multimedia/imagen/11111111-1111-4111-8111-111111111111/v1.png";
    const url = await almacenamiento.subirArchivoSincronizado(clave, contenido, "image/png", checksum);
    assert.equal(url, urlPrueba + "/storage/v1/object/public/multimedia/" + clave);
    const subida = llamadas.find((llamada) => llamada.ruta === clave);
    assert.equal(subida.nombreBucket, "multimedia");
    assert.deepEqual(subida.contenido, contenido);
    assert.equal(subida.opciones.contentType, "image/png");
    assert.equal(subida.opciones.upsert, false);
    await assert.rejects(
        almacenamiento.subirArchivoSincronizado(clave, contenido, "image/png", "0".repeat(64)),
        /checksum del archivo no coincide/
    );
});

test("un reintento de Storage acepta solo un objeto existente con el mismo SHA-256", async () => {
    llamadas.length = 0;
    const contenido = Buffer.from("objeto inmutable");
    const checksum = createHash("sha256").update(contenido).digest("hex");
    const clave = "multimedia/imagen/33333333-3333-4333-8333-333333333333/v1.png";
    contenidoStorage = Buffer.from(contenido);
    errorAlSubir = { message: "already exists" };
    await assert.doesNotReject(
        almacenamiento.subirArchivoSincronizado(clave, contenido, "image/png", checksum)
    );
    assert.ok(llamadas.some(llamada => llamada.descarga === clave));

    llamadas.length = 0;
    contenidoStorage = Buffer.from("contenido diferente");
    await assert.rejects(
        almacenamiento.subirArchivoSincronizado(clave, contenido, "image/png", checksum),
        /clave de Storage ya existe con contenido diferente/
    );
    errorAlSubir = null;
});

test("descarga multimedia desde la clave lógica del bucket", async () => {
    llamadas.length = 0;
    contenidoStorage = Buffer.from("archivo descargado");
    const clave = "multimedia/video/22222222-2222-4222-8222-222222222222/v2.mp4";
    const contenido = await almacenamiento.descargarArchivoSincronizado(clave);
    assert.deepEqual(contenido, contenidoStorage);
    assert.deepEqual(llamadas, [{ nombreBucket: "multimedia", descarga: clave }]);
});

test("rechaza claves de Storage fuera del espacio multimedia", async () => {
    await assert.rejects(
        almacenamiento.descargarArchivoSincronizado("../privado"),
        /clave de almacenamiento no es válida/
    );
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
