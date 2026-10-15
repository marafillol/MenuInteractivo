const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

test("middleware protegido responde 503 sin auth y no continúa", async () => {
    const cargarOriginal = Module._load;
    const rutaModulo = require.resolve("../src/middleware/autenticarFirebase");

    Module._load = function (solicitud, padre, esPrincipal) {
        const esMiddleware =
            padre?.filename?.endsWith(path.join("src", "middleware", "autenticarFirebase.js"));

        if (esMiddleware && solicitud === "../firebase/firebaseAdmin") {
            return { auth: null };
        }

        if (esMiddleware && solicitud === "../modelos/usuario") {
            return {};
        }

        return cargarOriginal.call(this, solicitud, padre, esPrincipal);
    };

    delete require.cache[rutaModulo];

    let middleware;
    try {
        middleware = require("../src/middleware/autenticarFirebase");
    } finally {
        Module._load = cargarOriginal;
        delete require.cache[rutaModulo];
    }

    const res = {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };

    let continuo = false;
    await middleware({}, res, () => { continuo = true; });

    assert.equal(res.statusCode, 503);
    assert.match(res.body.error, /Firebase/);
    assert.equal(continuo, false);
});
