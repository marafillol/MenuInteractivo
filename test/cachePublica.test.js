const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const llamadas = {
    fichas: 0,
    fichasDetalle: 0,
    menus: 0,
    etiquetas: 0,
    relacionesEtiquetas: 0
};

let fallarEtiquetasUnaVez = false;
let fichasDevueltas = [];
let fichasDetalleDevueltas = [];

const modelosFalsos = {
    "../modelos/public/ficha": {
        async obtenerTodas() {
            llamadas.fichas++;
            return fichasDevueltas;
        },
        async obtenerRelacionesEtiquetas() {
            llamadas.relacionesEtiquetas++;
            return [];
        },
        async obtenerTodasConDetalle() {
            llamadas.fichasDetalle++;
            return fichasDetalleDevueltas;
        },
    },
    "../modelos/public/menu": {
        async obtenerMenus() {
            llamadas.menus++;
            return [];
        }
    },
    "../modelos/public/etiquetas": {
        async obtenerTodas() {
            llamadas.etiquetas++;

            if (fallarEtiquetasUnaVez) {
                fallarEtiquetasUnaVez = false;
                throw new Error("Fallo simulado de etiquetas");
            }

            return [];
        }
    }
};

const cargarOriginal = Module._load;
const rutaServicio = path.join("src", "servicios", "cachePublica.js");

Module._load = function (solicitud, padre, esPrincipal) {
    if (padre?.filename?.endsWith(rutaServicio)) {
        if (modelosFalsos[solicitud]) {
            return modelosFalsos[solicitud];
        }

        if (solicitud === "../utilidades/interpretarJson") {
            return { interpretarJson: valor => JSON.parse(valor) };
        }
    }

    return cargarOriginal.call(this, solicitud, padre, esPrincipal);
};

let cachePublica;

try {
    cachePublica = require("../src/servicios/cachePublica");
} finally {
    Module._load = cargarOriginal;
}

function reiniciarContadores() {
    llamadas.fichas = 0;
    llamadas.menus = 0;
    llamadas.etiquetas = 0;
    llamadas.relacionesEtiquetas = 0;
    llamadas.fichasDetalle = 0;
}

test("actualiza solo las etiquetas solicitadas", async () => {
    reiniciarContadores();

    await cachePublica.actualizarCachePublica(["etiquetas"]);

    assert.deepEqual(llamadas, {
        fichas: 0,
        fichasDetalle: 0,
        menus: 0,
        etiquetas: 1,
        relacionesEtiquetas: 1
    });
});

test("actualiza solo las fichas solicitadas", async () => {
    reiniciarContadores();

    await cachePublica.actualizarCachePublica(["fichas"]);

    assert.deepEqual(llamadas, {
        fichas: 1,
        fichasDetalle: 1,
        menus: 0,
        etiquetas: 0,
        relacionesEtiquetas: 1
    });
});

test("actualiza fichas y menús sin consultar etiquetas", async () => {
    reiniciarContadores();

    await cachePublica.actualizarCachePublica(["fichas", "menus"]);

    assert.deepEqual(llamadas, {
        fichas: 1,
        fichasDetalle: 1,
        menus: 1,
        etiquetas: 0,
        relacionesEtiquetas: 1
    });
});

test("agrupa invalidaciones simultáneas sin perder colecciones", async () => {
    reiniciarContadores();

    await Promise.all([
        cachePublica.actualizarCachePublica(["fichas"]),
        cachePublica.actualizarCachePublica(["etiquetas"])
    ]);

    assert.equal(llamadas.fichas, 1);
    assert.equal(llamadas.etiquetas, 1);
    assert.equal(llamadas.menus, 0);
});

test("rechaza nombres de colecciones no válidos", async () => {
    await assert.rejects(
        cachePublica.actualizarCachePublica(["inexistente"]),
        /Colección pública no válida/
    );
});

test("permite reintentar una colección después de fallar", async () => {
    reiniciarContadores();
    fallarEtiquetasUnaVez = true;

    await assert.rejects(
        cachePublica.actualizarCachePublica(["etiquetas"]),
        /Fallo simulado de etiquetas/
    );

    await cachePublica.actualizarCachePublica(["etiquetas"]);

    assert.equal(llamadas.etiquetas, 2);
    assert.equal(llamadas.relacionesEtiquetas, 2);
});

test("conserva los datos anteriores si falla una actualización", async () => {
    reiniciarContadores();

    fichasDevueltas = [{ id_ficha: 1, titulo: "Ficha anterior" }];
    fichasDetalleDevueltas = [
        { id_ficha: 1, titulo: "Ficha anterior" }
    ];

    await cachePublica.actualizarCachePublica(["fichas"]);

    assert.deepEqual(
        cachePublica.obtenerDatosPublicos("fichas"),
        [{
            id_ficha: 1,
            titulo: "Ficha anterior",
            datos_json: {},
            plantilla: null
        }]
    );

    const obtenerTodasOriginal =
        modelosFalsos["../modelos/public/ficha"].obtenerTodas;

    modelosFalsos["../modelos/public/ficha"].obtenerTodas =
        async () => {
            throw new Error("Fallo simulado al cargar fichas");
        };

    try {
        fichasDevueltas = [{ id_ficha: 2, titulo: "Ficha nueva" }];

        await assert.rejects(
            cachePublica.actualizarCachePublica(["fichas"]),
            /Fallo simulado al cargar fichas/
        );

        assert.deepEqual(
            cachePublica.obtenerDatosPublicos("fichas"),
            [{
                id_ficha: 1,
                titulo: "Ficha anterior",
                datos_json: {},
                plantilla: null
            }]
        );
    } finally {
        modelosFalsos["../modelos/public/ficha"].obtenerTodas =
            obtenerTodasOriginal;

        fichasDevueltas = [];
        fichasDetalleDevueltas = [];
    }
});

test("interpreta los campos JSON de las fichas antes de guardarlas", async () => {
    reiniciarContadores();

    fichasDevueltas = [{
        id_ficha: 10,
        datos_json: '{"nombre":"Ejemplo"}',
        plantilla_json: '{"color":"azul"}'
    }];

    try {
        await cachePublica.actualizarCachePublica(["fichas"]);

        const fichas = cachePublica.obtenerDatosPublicos("fichas");

        assert.deepEqual(fichas[0].datos_json, {
            nombre: "Ejemplo"
        });

        assert.deepEqual(fichas[0].plantilla, {
            color: "azul"
        });

        assert.equal(
            Object.hasOwn(fichas[0], "plantilla_json"),
            false
        );
    } finally {
        fichasDevueltas = [];
        fichasDetalleDevueltas = [];
    }
});
