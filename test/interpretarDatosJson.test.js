const test = require("node:test");
const assert = require("node:assert/strict");
const { interpretarDatosJson } = require("../src/frontend-admin/js/interpretarDatosJson");

test("convierte JSON en texto a objeto", () => {
    assert.deepEqual(
        interpretarDatosJson('{"nombre":"batalla"}'),
        { nombre: "batalla" }
    );
});

test("acepta directamente objetos devueltos por JSONB de PostgreSQL", () => {
    const datos = { fecha: "1982", personas: ["A", "B"] };
    assert.equal(interpretarDatosJson(datos), datos);
});

test("conserva arrays JSON recibidos como valor", () => {
    const datos = [{ campo: "titulo" }];
    assert.equal(interpretarDatosJson(datos), datos);
});

test("devuelve un objeto vacío para valores vacíos o JSON inválido", () => {
    assert.deepEqual(interpretarDatosJson(null), {});
    assert.deepEqual(interpretarDatosJson(undefined), {});
    assert.deepEqual(interpretarDatosJson(""), {});
    assert.deepEqual(interpretarDatosJson("{json inválido"), {});
});
