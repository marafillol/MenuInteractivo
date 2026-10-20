
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const archivoPlantillas = path.join(
    __dirname,
    "../src/frontend-admin/js/plantillas.js"
);

const codigo = fs.readFileSync(archivoPlantillas, "utf8");

// =======================================================
// DOM SIMULADO
// Permite probar la función sin abrir un navegador.
// =======================================================

class ElementoFalso {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.style = {};
        this.className = "";
        this.textContent = "";
        this.src = "";
        this.alt = "";
        this.width = 0;
        this.onerror = null;
        this._innerHTML = "";
    }

    set innerHTML(valor) {
        this._innerHTML = valor;

        if (valor === "") {
            this.children = [];
        }
    }

    get innerHTML() {
        return this._innerHTML;
    }

    appendChild(elemento) {
        this.children.push(elemento);
        return elemento;
    }

    append(...elementos) {
        this.children.push(...elementos);
    }
}

// =======================================================
// PREPARAR ENTORNO DE PRUEBA
// =======================================================

function prepararPrueba({
    respuesta,
    sinContenedor = false
} = {}) {
    const elementos = {
        contenidoVistaPlantilla: new ElementoFalso("div"),
        modalVistaPlantilla: new ElementoFalso("div"),
        textoMensajePlantilla: new ElementoFalso("div"),
        modalMensajePlantilla: new ElementoFalso("div")
    };

    if (sinContenedor) {
        delete elementos.contenidoVistaPlantilla;
    }

    const mensajesError = [];
    let urlSolicitada = "";

    const document = {
        getElementById(id) {
            return elementos[id] || null;
        },

        createElement(tagName) {
            return new ElementoFalso(tagName);
        }
    };

    // Extraemos únicamente las funciones y configuración necesarias.
    // Así evitamos ejecutar los eventos de toda la página admin.
    const inicioConfiguracion = codigo.indexOf(
        "const CONFIG_PLANTILLA_DEFAULT = {"
    );

    const finConfiguracion = codigo.indexOf(
        "function leerConfiguracionInterfaz() {",
        inicioConfiguracion
    );

    const inicioVista = codigo.indexOf(
        "async function vistaPreviaPlantilla(id) {"
    );

    const finVista = codigo.indexOf(
        "function cerrarPreviewPlantilla() {",
        inicioVista
    );

    assert.notEqual(
        inicioConfiguracion,
        -1,
        "No se encontró la configuración predeterminada."
    );

    assert.notEqual(
        finConfiguracion,
        -1,
        "No se encontró el final de la configuración."
    );

    assert.notEqual(
        inicioVista,
        -1,
        "No se encontró vistaPreviaPlantilla()."
    );

    assert.notEqual(
        finVista,
        -1,
        "No se encontró el final de vistaPreviaPlantilla()."
    );

    const codigoNecesario = [
        codigo.slice(inicioConfiguracion, finConfiguracion),
        codigo.slice(inicioVista, finVista),
        "globalThis.ejecutarVistaPrevia = vistaPreviaPlantilla;"
    ].join("\n");

    const contexto = {
        document,

        window: {
            fetchProtegido: async (url) => {
                urlSolicitada = url;
                return respuesta;
            }
        },

        console: {
            error: (...args) => {
                mensajesError.push(args);
            }
        },

        mostrarMensajePlantilla(mensaje) {
            const texto = elementos.textoMensajePlantilla;

            if (texto) {
                texto.textContent = mensaje;
            }

            const modal = elementos.modalMensajePlantilla;

            if (modal) {
                modal.style.display = "flex";
            }
        }
    };

    vm.createContext(contexto);
    vm.runInContext(codigoNecesario, contexto);

    return {
        elementos,
        mensajesError,
        ejecutar: contexto.ejecutarVistaPrevia,

        get urlSolicitada() {
            return urlSolicitada;
        }
    };
}

// =======================================================
// FUNCIONES AUXILIARES
// =======================================================

function respuestaCorrecta(plantilla) {
    return {
        ok: true,

        json: async () => plantilla
    };
}

function obtenerTextos(elemento) {
    if (!elemento) {
        return [];
    }

    return [
        elemento.textContent,
        ...elemento.children.flatMap(obtenerTextos)
    ];
}

// =======================================================
// TEST 1: URL E ID DE PLANTILLA
// =======================================================

test(
    "la vista previa solicita la plantilla con el ID correcto",
    async () => {
        const prueba = prepararPrueba({
            respuesta: respuestaCorrecta({
                nombre: "Plantilla de prueba",
                plantilla_json: {}
            })
        });

        await prueba.ejecutar(27);

        assert.equal(
            prueba.urlSolicitada,
            "/api/plantillas/27"
        );

        assert.ok(
            prueba.elementos.contenidoVistaPlantilla.children.length > 0
        );

        assert.equal(prueba.mensajesError.length, 0);
    }
);

// =======================================================
// TEST 2: DATOS Y CONTENIDO DE LA VISTA PREVIA
// =======================================================

test(
    "muestra el nombre, la descripción y abre el modal",
    async () => {
        const prueba = prepararPrueba({
            respuesta: respuestaCorrecta({
                nombre: "Archivo histórico",
                descripcion: "Plantilla para documentos",

                plantilla_json: {
                    interfaz: {
                        vista: "grid",
                        columnas: 3,
                        mostrarImagen: false,
                        mostrarResumen: true,
                        mostrarEtiquetas: true
                    },

                    estructura: {
                        campos: [
                            {
                                nombre: "fecha",
                                etiqueta: "Fecha histórica"
                            }
                        ]
                    }
                }
            })
        });

        await prueba.ejecutar(12);

        const textos = obtenerTextos(
            prueba.elementos.contenidoVistaPlantilla
        );

        assert.ok(textos.includes("Archivo histórico"));
        assert.ok(textos.includes("Plantilla para documentos"));
        assert.ok(textos.includes("Fecha histórica"));

        assert.ok(
            textos.includes(
                "Este es un resumen de ejemplo de la ficha."
            )
        );

        assert.ok(textos.includes("Etiqueta de ejemplo"));

        assert.equal(
            prueba.elementos.modalVistaPlantilla.style.display,
            "flex"
        );

        assert.equal(prueba.mensajesError.length, 0);
    }
);

// =======================================================
// TEST 3: IMAGEN
// =======================================================

test(
    "muestra la imagen cuando la configuración la habilita",
    async () => {
        const prueba = prepararPrueba({
            respuesta: respuestaCorrecta({
                nombre: "Plantilla con imagen",

                plantilla_json: {
                    interfaz: {
                        mostrarImagen: true,
                        mostrarResumen: false,
                        mostrarEtiquetas: false
                    },

                    estructura: {
                        campos: []
                    }
                }
            })
        });

        await prueba.ejecutar(3);

        const textos = obtenerTextos(
            prueba.elementos.contenidoVistaPlantilla
        );

        assert.ok(textos.includes("Título de ejemplo"));

        const imagenes = [];

        function recorrer(elemento) {
            if (!elemento) {
                return;
            }

            if (elemento.tagName === "img") {
                imagenes.push(elemento);
            }

            elemento.children.forEach(recorrer);
        }

        recorrer(prueba.elementos.contenidoVistaPlantilla);

        assert.equal(imagenes.length, 1);
        assert.equal(imagenes[0].alt, "Imagen de ejemplo");
        assert.equal(imagenes[0].src, "/imagenes/default.png");
    }
);

// =======================================================
// TEST 4: ERROR DE API
// =======================================================

test(
    "maneja un error de la API sin romper la ejecución",
    async () => {
        const prueba = prepararPrueba({
            respuesta: {
                ok: false,

                json: async () => ({})
            }
        });

        await prueba.ejecutar(99);

        assert.equal(prueba.mensajesError.length, 1);

        assert.equal(
            prueba.elementos.textoMensajePlantilla.textContent,
            "No se pudo mostrar la vista previa de la plantilla."
        );

        assert.equal(
            prueba.elementos.modalMensajePlantilla.style.display,
            "flex"
        );
    }
);

// =======================================================
// TEST 5: JSON INVÁLIDO
// =======================================================

test(
    "maneja un JSON inválido en la plantilla",
    async () => {
        const prueba = prepararPrueba({
            respuesta: respuestaCorrecta({
                nombre: "Plantilla rota",
                plantilla_json: "{esto no es JSON válido"
            })
        });

        await prueba.ejecutar(15);

        assert.equal(prueba.mensajesError.length, 1);

        assert.equal(
            prueba.elementos.textoMensajePlantilla.textContent,
            "No se pudo mostrar la vista previa de la plantilla."
        );
    }
);

// =======================================================
// TEST 6: CONTENEDOR INEXISTENTE
// =======================================================

test(
    "no falla si falta el contenedor de la vista previa",
    async () => {
        const prueba = prepararPrueba({
            respuesta: respuestaCorrecta({
                nombre: "Plantilla sin contenedor",
                plantilla_json: {}
            }),

            sinContenedor: true
        });

        await assert.doesNotReject(
            () => prueba.ejecutar(5)
        );

        assert.equal(prueba.mensajesError.length, 0);
    }
);

// =======================================================
// TEST 7: BOTÓN CONECTADO A LA FUNCIÓN
// =======================================================

test(
    "el botón Vista previa está conectado a la función correcta",
    () => {
        assert.match(
            codigo,

            /botonVista\.addEventListener\("click",\s*\(\)\s*=>\s*\{\s*vistaPreviaPlantilla\(plantilla\.id_plantilla\);\s*\}\);/
        );
    }
);
