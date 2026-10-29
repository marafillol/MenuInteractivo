
const test = require("node:test");
const assert = require("node:assert/strict");
const cachePublico = require("../src/middleware/cachePublico");

function crearRespuesta() {
    const listeners = {};

    return {
        statusCode: 200,
        headersSent: false,
        destroyed: false,
        writableEnded: false,
        cuerpo: undefined,
        listeners,

        status(codigo) {
            this.statusCode = codigo;
            return this;
        },

        json(datos) {
            this.cuerpo = datos;
            this.headersSent = true;
            this.writableEnded = true;
            return this;
        },

        on(evento, callback) {
            listeners[evento] = callback;
            return this;
        }
    };
}

function ejecutarMiddleware(url, controlador) {
    const req = { originalUrl: url };
    const res = crearRespuesta();

    cachePublico(req, res, controlador);

    return { req, res };
}

test("reutiliza una respuesta HTTP guardada", () => {
    cachePublico.invalidarHTTP();

    let ejecuciones = 0;
    const datos = { fichas: [1, 2] };

    const primera = ejecutarMiddleware("/prueba-cache", () => {
        ejecuciones++;
    });

    primera.res.json(datos);

    const segunda = ejecutarMiddleware("/prueba-cache", () => {
        ejecuciones++;
    });

    assert.equal(ejecuciones, 1);
    assert.deepEqual(segunda.res.cuerpo, datos);
});

test("comparte el resultado de solicitudes simultáneas idénticas", async () => {
    cachePublico.invalidarHTTP();

    let ejecuciones = 0;

    const primera = ejecutarMiddleware("/prueba-simultanea", () => {
        ejecuciones++;
    });

    const segunda = ejecutarMiddleware("/prueba-simultanea", () => {
        ejecuciones++;
    });

    assert.equal(ejecuciones, 1);

    primera.res.json({ resultado: "correcto" });

    // La segunda respuesta se entrega cuando se resuelve
    // la promesa compartida del middleware.
    await new Promise(resolve => setImmediate(resolve));

    assert.deepEqual(segunda.res.cuerpo, { resultado: "correcto" });
});

test("no guarda una respuesta iniciada antes de invalidar", () => {
    cachePublico.invalidarHTTP();

    const primera = ejecutarMiddleware("/prueba-invalidacion", () => {});
    primera.res.json({ version: "antigua" });

    cachePublico.invalidarHTTP();

    const segunda = ejecutarMiddleware("/prueba-invalidacion", () => {});

    assert.equal(segunda.res.cuerpo, undefined);
});


test("no reutiliza una solicitud pendiente después de invalidar", async () => {
    cachePublico.invalidarHTTP();

    let ejecuciones = 0;
    let terminarPrimera;

    const primera = ejecutarMiddleware("/prueba-pendiente", () => {
        ejecuciones++;
    });

    // La primera solicitud sigue pendiente.
    const respuestaPrimera = new Promise(resolve => {
        terminarPrimera = () => {
            primera.res.json({ version: "antigua" });
            resolve();
        };
    });

    cachePublico.invalidarHTTP();

    const segunda = ejecutarMiddleware("/prueba-pendiente", () => {
        ejecuciones++;
    });

    assert.equal(ejecuciones, 2);

    terminarPrimera();
    await respuestaPrimera;

    segunda.res.json({ version: "nueva" });

    assert.deepEqual(segunda.res.cuerpo, { version: "nueva" });
});


test("agrupa las nuevas solicitudes simultáneas después de invalidar", async () => {
    cachePublico.invalidarHTTP();

    let ejecuciones = 0;

    const antigua = ejecutarMiddleware("/prueba-grupo-invalidacion", () => {
        ejecuciones++;
    });

    cachePublico.invalidarHTTP();

    const nuevas = Array.from({ length: 10 }, () =>
        ejecutarMiddleware("/prueba-grupo-invalidacion", () => {
            ejecuciones++;
        })
    );

    // Una ejecución antigua y una nueva, no once nuevas.
    assert.equal(ejecuciones, 2);

    nuevas[0].res.json({ version: "actualizada" });

    await new Promise(resolve => setImmediate(resolve));

    for (const respuesta of nuevas) {
        assert.deepEqual(respuesta.res.cuerpo, {
            version: "actualizada"
        });
    }

    // Completar la solicitud antigua al final.
    antigua.res.json({ version: "antigua" });
});

test("no reutiliza una respuesta HTTP vencida", () => {
    cachePublico.invalidarHTTP();

    const ahoraOriginal = Date.now;
    let tiempoActual = 1000;

    Date.now = () => tiempoActual;

    try {
        let ejecuciones = 0;

        const primera = ejecutarMiddleware("/prueba-vencimiento", () => {
            ejecuciones++;
        });

        primera.res.json({ resultado: "antiguo" });

        // Avanza más de los 30 segundos de duración de la caché.
        tiempoActual += 30001;

        const segunda = ejecutarMiddleware("/prueba-vencimiento", () => {
            ejecuciones++;
        });

        assert.equal(ejecuciones, 2);
        assert.equal(segunda.res.cuerpo, undefined);

        segunda.res.json({ resultado: "nuevo" });

        assert.deepEqual(segunda.res.cuerpo, {
            resultado: "nuevo"
        });
    } finally {
        Date.now = ahoraOriginal;
        cachePublico.invalidarHTTP();
    }
});


test("no guarda respuestas HTTP de error", () => {
    cachePublico.invalidarHTTP();

    let ejecuciones = 0;

    const primera = ejecutarMiddleware("/prueba-error-http", () => {
        ejecuciones++;
    });

    primera.res.status(500).json({
        error: "Error interno"
    });

    const segunda = ejecutarMiddleware("/prueba-error-http", () => {
        ejecuciones++;
    });

    assert.equal(ejecuciones, 2);
    assert.equal(segunda.res.cuerpo, undefined);

    segunda.res.json({
        resultado: "correcto"
    });

    const tercera = ejecutarMiddleware("/prueba-error-http", () => {
        ejecuciones++;
    });

    assert.equal(ejecuciones, 2);
    assert.deepEqual(tercera.res.cuerpo, {
        resultado: "correcto"
    });

    cachePublico.invalidarHTTP();
});

test("libera una solicitud pendiente cuando la conexión se cierra", async () => {
    cachePublico.invalidarHTTP();

    let ejecuciones = 0;

    const primera = ejecutarMiddleware("/prueba-cierre", () => {
        ejecuciones++;
    });

    // Simula que la conexión se cierra antes de recibir una respuesta.
    primera.res.listeners.close();

    const segunda = ejecutarMiddleware("/prueba-cierre", () => {
        ejecuciones++;
    });

    assert.equal(ejecuciones, 2);

    segunda.res.json({
        resultado: "correcto"
    });

    await new Promise(resolve => setImmediate(resolve));

    assert.deepEqual(segunda.res.cuerpo, {
        resultado: "correcto"
    });

    cachePublico.invalidarHTTP();
});