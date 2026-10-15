const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const fs = require("node:fs");

test("Firebase Admin no bloquea el arranque si falta la credencial local", () => {
    const cargarOriginal = Module._load;
    const existsSyncOriginal = fs.existsSync;
    const rutaModulo = require.resolve("../src/firebase/firebaseAdmin");

    Module._load = function (solicitud, padre, esPrincipal) {
        if (solicitud === "firebase-admin/app") {
            return {
                initializeApp() {},
                getApps: () => [],
                cert: (cuenta) => cuenta
            };
        }

        if (solicitud === "firebase-admin/auth") {
            return {
                getAuth: () => ({})
            };
        }

        return cargarOriginal.call(this, solicitud, padre, esPrincipal);
    };

    // Simula un equipo local sin el archivo de cuenta de servicio y sin secretos montados.
    fs.existsSync = () => false;
    delete require.cache[rutaModulo];

    try {
        const firebaseAdmin = require("../src/firebase/firebaseAdmin");
        assert.equal(firebaseAdmin.auth, null);
    } finally {
        Module._load = cargarOriginal;
        fs.existsSync = existsSyncOriginal;
        delete require.cache[rutaModulo];
    }
});
