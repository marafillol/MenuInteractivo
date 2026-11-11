const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizar } = require("../scripts/diagnosticar-diferencias-catalogos");

test("normaliza descripciones vacías como NULL en plantilla, etiqueta y multimedia", () => {
  for (const tabla of ["plantilla", "etiqueta", "multimedia"]) {
    assert.deepEqual(normalizar(tabla, "descripcion", ""), null);
    assert.deepEqual(normalizar(tabla, "descripcion", null), null);
    assert.notDeepEqual(normalizar(tabla, "descripcion", "Texto real"), null);
  }
});

test("normaliza resumen y texto vacíos como NULL en fichas", () => {
  for (const campo of ["resumen", "texto"]) {
    assert.deepEqual(normalizar("ficha", campo, ""), null);
    assert.deepEqual(normalizar("ficha", campo, null), null);
    assert.notDeepEqual(normalizar("ficha", campo, "Contenido real"), null);
  }
});

test("no altera campos no textuales ni descripciones con contenido", () => {
  assert.equal(normalizar("multimedia", "tipo_multi", "pdf"), "pdf");
  assert.equal(normalizar("etiqueta", "descripcion", "Etiqueta histórica"), "Etiqueta histórica");
});
