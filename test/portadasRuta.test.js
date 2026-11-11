const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizarRutaPortada } = require("../src/servicios/sincronizacion/portadas");

test("normaliza separadores Windows individuales a rutas portables", () => {
    assert.equal(normalizarRutaPortada("imagenes\\\\menus\\\\portada.jpg"), "imagenes/menus/portada.jpg");
});

test("conserva rutas que ya usan separadores POSIX", () => {
    assert.equal(normalizarRutaPortada("imagenes/menus/portada.jpg"), "imagenes/menus/portada.jpg");
});
