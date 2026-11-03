const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const estado = {
    lista: [],
    ficha: null
};

const modeloFalso = {
    async obtenerTodas() {
        return estado.lista.map((fila) => ({ ...fila }));
    },
    async obtenerPorMenu() {
        return estado.lista.map((fila) => ({ ...fila }));
    },
    async obtenerPorEtiqueta() {
        return estado.lista.map((fila) => ({ ...fila }));
    },
    async obtenerPorId() {
        return estado.ficha ? { ...estado.ficha } : null;
    },
    async obtenerEtiquetas() {
        return [];
    },
    async obtenerRelacionadas() {
        return [];
    },
    async obtenerMultimedia() {
        return [];
    }
};

const cacheFalsa = {
    datos: null,
    obtenerDatosPublicos(tipo) {
        return this.datos?.[tipo] ?? null;
    }
};

const cargarOriginal = Module._load;
Module._load = function (solicitud, padre, esPrincipal) {
    const esModeloFichaPublica =
        solicitud === "../../modelos/public/ficha" &&
        padre?.filename?.endsWith(
            path.join("src", "controladores", "public", "fichasController.js")
        );

    const esCachePublica =
        solicitud === "../../servicios/cachePublica" &&
        padre?.filename?.endsWith(
            path.join("src", "controladores", "public", "fichasController.js")
        );

    if (esModeloFichaPublica) {
        return modeloFalso;
    }

    if (esCachePublica) {
        return cacheFalsa;
    }

    return cargarOriginal.call(this, solicitud, padre, esPrincipal);
};


let controlador;
try {
    controlador = require("../src/controladores/public/fichasController");
} finally {
    Module._load = cargarOriginal;
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

function crearFicha(datosJson, plantillaJson) {
    return {
        id_ficha: 7,
        titulo: "Ficha de prueba",
        datos_json: datosJson,
        plantilla_json: plantillaJson
    };
}


test("listado público devuelve las fichas preparadas en la caché", async () => {
    cacheFalsa.datos = {
        fichas: [
            {
                ...crearFicha({ texto: "JSONB" }, { campos: [{ nombre: "titulo" }] }),
                plantilla: { campos: [{ nombre: "titulo" }] }
            },
            {
                ...crearFicha({ texto: "SQLite" }, { campos: [{ nombre: "titulo" }] }),
                plantilla: { campos: [{ nombre: "titulo" }] }
            }
        ]
    };

    for (const ficha of cacheFalsa.datos.fichas) {
        delete ficha.plantilla_json;
    }

    const res = crearRespuesta();
    await controlador.obtenerFichas({}, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.cuerpo[0].datos_json, { texto: "JSONB" });
    assert.deepEqual(res.cuerpo[0].plantilla, { campos: [{ nombre: "titulo" }] });
    assert.equal("plantilla_json" in res.cuerpo[0], false);
    assert.deepEqual(res.cuerpo[1].datos_json, { texto: "SQLite" });
    assert.deepEqual(res.cuerpo[1].plantilla, { campos: [{ nombre: "titulo" }] });
});


test("filtro por menú admite objetos JSONB", async () => {
    const ficha = {
        ...crearFicha({ resumen: "Resumen" }, { campos: [] }),
        id_menu: 1,
        plantilla: { campos: [] }
    };

    delete ficha.plantilla_json;

    cacheFalsa.datos = {
        fichas: [ficha]
    };

    const res = crearRespuesta();

    await controlador.obtenerFichasPorMenu(
        { params: { id_menu: "1" } },
        res
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.cuerpo[0].datos_json, { resumen: "Resumen" });
    assert.deepEqual(res.cuerpo[0].plantilla, { campos: [] });
});

test("filtro por etiqueta admite objetos JSONB", async () => {
    const ficha = {
        ...crearFicha({ etiqueta: "Historia" }, { campos: [] }),
        plantilla: { campos: [] }
    };

    delete ficha.plantilla_json;

    cacheFalsa.datos = {
        fichas: [ficha],
        relacionesEtiquetas: [
            {
                id_ficha: 7,
                id_etiqueta: 1
            }
        ]
    };

    const res = crearRespuesta();

    await controlador.obtenerFichasPorEtiqueta(
        { params: { id_etiqueta: "1" } },
        res
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.cuerpo[0].datos_json, { etiqueta: "Historia" });
    assert.deepEqual(res.cuerpo[0].plantilla, { campos: [] });
});
test("detalle público devuelve las asociaciones incluidas en la consulta unificada", async () => {
    cacheFalsa.datos = {
        fichasDetalle: [
            {
                ...crearFicha({ descripcion: "Detalle" }, { campos: [] }),
                etiquetas: [{ id_etiqueta: 1 }],
                relacionadas: [{ id_ficha_destino: 8 }],
                multimedia: [{ id_multi: 2 }]
            }
        ]
    };

    const res = crearRespuesta();
    await controlador.obtenerFichaPorId(
        { params: { id_ficha: "7" } },
        res
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.cuerpo.etiquetas, [{ id_etiqueta: 1 }]);
    assert.deepEqual(res.cuerpo.relacionadas, [{ id_ficha_destino: 8 }]);
    assert.deepEqual(res.cuerpo.multimedia, [{ id_multi: 2 }]);
});


test("detalle público admite objetos JSONB en ficha y plantilla", async () => {
    cacheFalsa.datos = {
        fichasDetalle: [
            {
                id_ficha: 7,
                titulo: "Ficha de prueba",
                datos_json: { descripcion: "Detalle" },
                plantilla: {
                    campos: [{ nombre: "descripcion" }]
                }
            }
        ]
    };

    const res = crearRespuesta();

    await controlador.obtenerFichaPorId(
        { params: { id_ficha: "7" } },
        res
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.cuerpo.datos_json, {
        descripcion: "Detalle"
    });
    assert.deepEqual(res.cuerpo.plantilla, {
        campos: [{ nombre: "descripcion" }]
    });
    assert.equal("plantilla_json" in res.cuerpo, false);
    assert.deepEqual(res.cuerpo.etiquetas, []);
    assert.deepEqual(res.cuerpo.relacionadas, []);
    assert.deepEqual(res.cuerpo.multimedia, []);
});
