const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const archivo = path.join(__dirname, "../src/frontend-visita/js/explorador.js");
const codigo = fs.readFileSync(archivo, "utf8");

function extraerFuncion(nombre, siguienteMarcador) {
    const inicio = codigo.indexOf(`function ${nombre}(`);
    assert.notEqual(inicio, -1, `No se encontró ${nombre}`);
    const fin = codigo.indexOf(siguienteMarcador, inicio);
    assert.notEqual(fin, -1, `No se encontró el final de ${nombre}`);
    return codigo.slice(inicio, fin);
}

function preparar() {
    const renderizados = [];
    const elementos = new Map();
    elementos.set("buscador", { value: "" });
    const contexto = {
        fichasExplorador: [],
        menusExplorador: [],
        etiquetasExplorador: [],
        menuExploradorSeleccionado: null,
        terminoBusquedaExplorador: "",
        etiquetaExploradorSeleccionada: null,
        renderizarResultados: (fichas, opciones) => renderizados.push({
            fichas: [...fichas],
            opciones
        }),
        ordenarFichasPorPlantilla: fichas => [...fichas],
        window: {
            abrirHistoriaCompleta() {}
        },
        document: {
            getElementById: id => elementos.get(id) || null
        },
        console,
        Number,
        String,
        Set,
        Map,
        Math,
        Date
    };
    const codigoBase = [
        extraerFuncion("abrirVeterano", "// =======================================================\n// ACTUALIZAR MENSAJE CENTRAL"),
        extraerFuncion("normalizarTexto", "// =======================================================\n// RENDERIZAR RESULTADOS"),
        extraerFuncion("fichaCoincideBusqueda", "// =======================================================\n// NORMALIZAR TEXTO"),
        extraerFuncion("obtenerFichasDelMenuSeleccionado", "function obtenerFichasVisibles"),
        extraerFuncion("obtenerFichasVisibles", "function mostrarTodasLasFichas"),
        extraerFuncion("mostrarTodasLasFichas", "function filtrarFichasExplorador"),
        extraerFuncion("filtrarFichasExplorador", "// =======================================================\n// COMPROBAR COINCIDENCIA")
    ].join("\n");
    const inicioMenu = codigo.indexOf("function mostrarFichasPorMenu(");
    const finMenu = codigo.indexOf("// =======================================================\n// FILTRAR POR ETIQUETA", inicioMenu);
    assert.notEqual(inicioMenu, -1);
    assert.notEqual(finMenu, -1);
    let menuFunc = codigo.slice(inicioMenu, finMenu);
    menuFunc = menuFunc
        .replace(/\n\s*cerrarPaneles\(\);/g, "")
        .replace(/\n\s*actualizarMensajeCentral\(\);/g, "")
        .replace(/\n\s*renderizarIndice\(\);/g, "");
    vm.createContext(contexto);
    vm.runInContext(codigoBase + "\n" + menuFunc +
        "\nglobalThis.api = { obtenerFichasVisibles, filtrarFichasExplorador, mostrarTodasLasFichas, mostrarFichasPorMenu, abrirVeterano };",
        contexto);
    return { contexto, renderizados, elementos };
}

function ficha(id, menuId, titulo) {
    return {
        id_ficha: id,
        id_menu: menuId,
        titulo,
        datos_json: { Nombre: titulo, Descripcion: titulo }
    };
}

test("la búsqueda en un menú muestra coincidencias solo de ese menú", () => {
    const p = preparar();
    p.contexto.fichasExplorador = [
        ficha(1, 10, "Veterano A"),
        ficha(2, 20, "Veterano B"),
        ficha(3, 30, "Veterano Todos")
    ];
    p.contexto.menuExploradorSeleccionado = 10;
    p.contexto.api.filtrarFichasExplorador("veterano");
    assert.deepEqual(p.renderizados.at(-1).fichas.map(f => f.id_ficha), [1]);
    assert.equal(p.contexto.menuExploradorSeleccionado, 10);
});

test("no muestra fichas exclusivas de otro menú ni fuera del menú elegido", () => {
    const p = preparar();
    p.contexto.fichasExplorador = [
        ficha(1, 10, "Coincidencia A"),
        ficha(2, 20, "Coincidencia B"),
        ficha(3, 30, "Coincidencia Todos")
    ];
    p.contexto.menuExploradorSeleccionado = 10;
    p.contexto.api.filtrarFichasExplorador("coincidencia");
    assert.deepEqual(p.renderizados.at(-1).fichas.map(f => f.id_ficha), [1]);
});

test("vaciar la búsqueda conserva el menú y muestra sus fichas", () => {
    const p = preparar();
    p.contexto.fichasExplorador = [
        ficha(1, 10, "Alfa"),
        ficha(2, 10, "Beta"),
        ficha(3, 20, "Gamma")
    ];
    p.contexto.menuExploradorSeleccionado = 10;
    p.contexto.api.filtrarFichasExplorador("alfa");
    p.contexto.api.filtrarFichasExplorador("");
    assert.deepEqual(p.renderizados.at(-1).fichas.map(f => f.id_ficha), [1, 2]);
    assert.equal(p.contexto.menuExploradorSeleccionado, 10);
});

test("«Todos» permite buscar fichas de cualquier menú", () => {
    const p = preparar();
    p.contexto.fichasExplorador = [
        ficha(1, 10, "Veterano A"),
        ficha(2, 20, "Veterano B"),
        ficha(3, 30, "Otro")
    ];
    p.contexto.menuExploradorSeleccionado = null;
    p.contexto.api.filtrarFichasExplorador("veterano");
    assert.deepEqual(p.renderizados.at(-1).fichas.map(f => f.id_ficha), [1, 2]);
});

test("seleccionar otro menú actualiza resultados conservando el término", () => {
    const p = preparar();
    p.contexto.fichasExplorador = [
        ficha(1, 10, "Veterano A"),
        ficha(2, 20, "Veterano B")
    ];
    p.contexto.menusExplorador = [
        { id_menu: 10, plantilla: null },
        { id_menu: 20, plantilla: null }
    ];
    p.elementos.get("buscador").value = "veterano";
    p.contexto.api.mostrarFichasPorMenu(20);
    assert.deepEqual(p.renderizados.at(-1).fichas.map(f => f.id_ficha), [2]);
    assert.equal(p.contexto.menuExploradorSeleccionado, 20);
    assert.equal(p.contexto.terminoBusquedaExplorador, "veterano");
});


test("abrir una ficha no reinicia el menú ni el término de búsqueda", () => {
    const p = preparar();
    p.contexto.fichasExplorador = [ficha(1, 10, "Veterano A")];
    p.contexto.menuExploradorSeleccionado = 10;
    p.contexto.terminoBusquedaExplorador = "veterano";
    p.contexto.api.abrirVeterano(p.contexto.fichasExplorador[0]);
    assert.equal(p.contexto.menuExploradorSeleccionado, 10);
    assert.equal(p.contexto.terminoBusquedaExplorador, "veterano");
});
