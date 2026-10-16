const test = require("node:test");
const assert = require("node:assert/strict");
const { interpretarJson } = require("../src/utilidades/interpretarJson");
test("convierte cadenas JSON de SQLite en objetos", () => assert.deepEqual(interpretarJson('{"nombre":"soldados"}'), { nombre: "soldados" }));
test("devuelve objetos JSONB sin parsearlos de nuevo", () => {
    const plantilla = { campos: [{ nombre: "titulo" }] };
    assert.equal(interpretarJson(plantilla), plantilla);
});
test("conserva arrays, null y undefined", () => {
    const campos = [{ nombre: "titulo" }];
    assert.equal(interpretarJson(campos), campos);
    assert.equal(interpretarJson(null), null);
    assert.equal(interpretarJson(undefined), undefined);
});
