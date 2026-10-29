
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const archivo = path.join(
    __dirname,
    "../src/frontend-admin/js/menus.js"
);

const codigo = fs.readFileSync(archivo, "utf8");

class ElementoFalso {
    constructor() {
        this.style = {};
        this.children = [];
        this.value = "";
        this.checked = true;
        this.src = "";
        this.textContent = "";
        this.files = [];
        this.selectedIndex = 0;
        this._innerHTML = "";
    }

    set innerHTML(valor) {
        this._innerHTML = valor;
    }

    get innerHTML() {
        return this._innerHTML;
    }
}

function prepararPrueba({
    respuestaMenus,
    respuestaMenu,
    rol = "admin"
} = {}) {
    const elementos = new Map();
    const errores = [];
    const solicitudes = [];

    const idsPreview = [
        "previewId",
        "previewNombre",
        "previewDescripcion",
        "previewPlantilla",
        "previewVisible",
        "previewCreadoFecha",
        "previewCreadoHora",
        "previewActualizadoFecha",
        "previewActualizadoHora",
        "previewMenuImagen",
        "modalVistaPrevia"
    ];

    for (const id of idsPreview) {
        elementos.set(id, new ElementoFalso());
    }

    elementos.set("listaMenus", new ElementoFalso());

    const document = {
        getElementById(id) {
            return elementos.get(id) || null;
        }
    };

    const fetchProtegido = async (url, opciones) => {
        solicitudes.push({ url, opciones });

        if (url === "/api/menus") {
            if (!respuestaMenus) {
                throw new Error("No se configuró respuesta para la lista");
            }

            return respuestaMenus;
        }

        if (url.startsWith("/api/menus/")) {
            if (!respuestaMenu) {
                throw new Error("No se configuró respuesta para un menú");
            }

            return respuestaMenu;
        }

        throw new Error(`URL inesperada: ${url}`);
    };

    const inicioHelper = codigo.indexOf(
        "function obtenerFechaMenu(menu)"
    );

    const finHelper = codigo.indexOf(
        "async function cargarMenus()",
        inicioHelper
    );

    const inicioLista = finHelper;

    const finLista = codigo.indexOf(
        "// ABRIR MENU Y VER SUS FICHAS",
        inicioLista
    );

    const inicioPreview = codigo.indexOf(
        "async function vistaPreviaMenu(id_menu)",
        finLista
    );

    const finPreview = codigo.indexOf(
        "function cerrarVistaPrevia()",
        inicioPreview
    );

    const finCerrar = codigo.indexOf(
        "\n}",
        finPreview
    );

    assert.notEqual(inicioHelper, -1, "Falta obtenerFechaMenu");
    assert.notEqual(finHelper, -1, "Falta cargarMenus");
    assert.notEqual(finLista, -1, "No se encontró el final de cargarMenus");
    assert.notEqual(inicioPreview, -1, "Falta vistaPreviaMenu");
    assert.notEqual(finPreview, -1, "No se encontró cerrarVistaPrevia");
    assert.notEqual(finCerrar, -1, "No se encontró el cierre de vista previa");

    const codigoNecesario = [
        codigo.slice(inicioHelper, finHelper),
        codigo.slice(inicioLista, finLista),
        codigo.slice(inicioPreview, finCerrar + 2),
        "globalThis.pruebas = { cargarMenus, vistaPreviaMenu, cerrarVistaPrevia, obtenerRutaImagenMenu };"
    ].join("\n");

    const contexto = {
        document,
        window: {
            usuarioActual: { rol },
            __idCargaVentana: 1,
            __ultimaVentanaPanel: "menus",
            fetchProtegido
        },
        console: {
            log() {},
            error(...args) {
                errores.push(args);
            }
        },
        Date
    };

    vm.createContext(contexto);
    vm.runInContext(codigoNecesario, contexto);

    return {
        elementos,
        errores,
        solicitudes,
        funciones: contexto.pruebas
    };
}

function respuestaCorrecta(datos) {
    return {
        ok: true,
        json: async () => datos
    };
}

test("la lista solicita los menús a la API correcta", async () => {
    const prueba = prepararPrueba({
        respuestaMenus: respuestaCorrecta([])
    });

    await prueba.funciones.cargarMenus();

    assert.equal(prueba.solicitudes[0].url, "/api/menus");
    assert.equal(prueba.errores.length, 0);
});

test("muestra el nombre y la descripción de los menús", async () => {
    const prueba = prepararPrueba({
        respuestaMenus: respuestaCorrecta([
            {
                id_menu: 1,
                nombre: "Historia",
                descripcion: "Archivo histórico",
                visible: 1
            }
        ])
    });

    await prueba.funciones.cargarMenus();

    const html = prueba.elementos.get("listaMenus").innerHTML;

    assert.match(html, /Historia/);
    assert.match(html, /Archivo histórico/);
    assert.match(html, /Vista previa/);
    assert.match(html, /Ver Fichas/);
});

test("muestra un texto alternativo si falta la descripción", async () => {
    const prueba = prepararPrueba({
        respuestaMenus: respuestaCorrecta([
            {
                id_menu: 2,
                nombre: "Documentos",
                descripcion: null,
                visible: 1
            }
        ])
    });

    await prueba.funciones.cargarMenus();

    assert.match(
        prueba.elementos.get("listaMenus").innerHTML,
        /Sin descripcion/
    );
});

test("el rol consulta no ve los botones de edición ni eliminación", async () => {
    const prueba = prepararPrueba({
        rol: "consulta",
        respuestaMenus: respuestaCorrecta([
            {
                id_menu: 1,
                nombre: "Historia",
                descripcion: "",
                visible: 1
            }
        ])
    });

    await prueba.funciones.cargarMenus();

    const html = prueba.elementos.get("listaMenus").innerHTML;

    assert.match(html, /Vista previa/);
    assert.match(html, /Ver Fichas/);
    assert.doesNotMatch(html, /menu-btn-editar/);
    assert.doesNotMatch(html, /menu-btn-eliminar/);
});

test("admin y editor ven las acciones de administración", async () => {
    for (const rol of ["admin", "editor"]) {
        const prueba = prepararPrueba({
            rol,
            respuestaMenus: respuestaCorrecta([
                {
                    id_menu: 1,
                    nombre: "Historia",
                    descripcion: "",
                    visible: 1
                }
            ])
        });

        await prueba.funciones.cargarMenus();

        const html = prueba.elementos.get("listaMenus").innerHTML;

        assert.match(html, /menu-btn-editar/);
        assert.match(html, /menu-btn-eliminar/);
    }
});

test("marca los menús ocultos con la clase correspondiente", async () => {
    const prueba = prepararPrueba({
        respuestaMenus: respuestaCorrecta([
            {
                id_menu: 4,
                nombre: "Oculto",
                descripcion: "",
                visible: 0
            }
        ])
    });

    await prueba.funciones.cargarMenus();

    assert.match(
        prueba.elementos.get("listaMenus").innerHTML,
        /menu-desactivado/
    );
});

test("normaliza las rutas de imagen", () => {
    const prueba = prepararPrueba();

    assert.equal(
        prueba.funciones.obtenerRutaImagenMenu("menus/foto.png"),
        "/menus/foto.png"
    );

    assert.equal(
        prueba.funciones.obtenerRutaImagenMenu("/menus/foto.png"),
        "/menus/foto.png"
    );

    assert.equal(
        prueba.funciones.obtenerRutaImagenMenu("https://ejemplo.invalid/foto.png"),
        "https://ejemplo.invalid/foto.png"
    );

    assert.equal(
        prueba.funciones.obtenerRutaImagenMenu(null),
        "/imagenes/default.png"
    );
});

test("la vista previa consulta el menú seleccionado", async () => {
    const prueba = prepararPrueba({
        respuestaMenu: respuestaCorrecta({
            id_menu: 8,
            nombre: "Archivo",
            descripcion: "Descripción",
            id_plantilla: 3,
            visible: 1,
            creado: null,
            actualizado: null,
            imagen: null
        })
    });

    await prueba.funciones.vistaPreviaMenu(8);

    assert.equal(prueba.solicitudes[0].url, "/api/menus/8");
    assert.equal(
        prueba.elementos.get("previewNombre").textContent,
        "Archivo"
    );
    assert.equal(
        prueba.elementos.get("previewDescripcion").textContent,
        "Descripción"
    );
    assert.equal(
        prueba.elementos.get("previewVisible").textContent,
        "SÍ"
    );
    assert.equal(
        prueba.elementos.get("previewMenuImagen").src,
        "/imagenes/default.png"
    );
    assert.equal(
        prueba.elementos.get("modalVistaPrevia").style.display,
        "flex"
    );
});

test("la vista previa tolera fechas vacías o inválidas", async () => {
    const prueba = prepararPrueba({
        respuestaMenu: respuestaCorrecta({
            id_menu: 8,
            nombre: "Archivo",
            descripcion: "",
            id_plantilla: 3,
            visible: 0,
            creado: "fecha inválida",
            actualizado: null,
            imagen: ""
        })
    });

    await prueba.funciones.vistaPreviaMenu(8);

    assert.equal(
        prueba.elementos.get("previewCreadoFecha").textContent,
        "-"
    );
    assert.equal(
        prueba.elementos.get("previewCreadoHora").textContent,
        "-"
    );
    assert.equal(
        prueba.elementos.get("previewActualizadoFecha").textContent,
        "-"
    );
    assert.equal(
        prueba.elementos.get("previewActualizadoHora").textContent,
        "-"
    );
    assert.equal(
        prueba.elementos.get("previewVisible").textContent,
        "No"
    );
});

test("cerrar vista previa oculta el modal", () => {
    const prueba = prepararPrueba();

    prueba.elementos.get("modalVistaPrevia").style.display = "flex";

    prueba.funciones.cerrarVistaPrevia();

    assert.equal(
        prueba.elementos.get("modalVistaPrevia").style.display,
        "none"
    );
});

test("la carga registra el error si falla la petición", async () => {
    const prueba = prepararPrueba();

    await prueba.funciones.cargarMenus();

    assert.equal(prueba.errores.length, 1);
});

test("la vista previa registra el error si falla la petición", async () => {
    const prueba = prepararPrueba();

    await prueba.funciones.vistaPreviaMenu(55);

    assert.equal(prueba.errores.length, 1);
});
