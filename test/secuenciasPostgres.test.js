const test = require("node:test");
const assert = require("node:assert/strict");
const {
  IDENTIFICADORES_POSTGRES,
  asegurarSecuenciasIdentificadores
} = require("../src/servicios/sincronizacion/secuenciasPostgres");

test("verifica y prepara secuencias para PK de entidades y relaciones sincronizables", async () => {
  const sentenciasRun = [];
  const sentenciasAll = [];
  await asegurarSecuenciasIdentificadores({
    run: async (sql) => { sentenciasRun.push(sql); },
    all: async (sql) => { sentenciasAll.push(sql); return [{ valor: "ok" }]; }
  });

  assert.deepEqual(IDENTIFICADORES_POSTGRES, [
    ["plantilla", "id_plantilla"],
    ["menu", "id_menu"],
    ["ficha", "id_ficha"],
    ["etiqueta", "id_etiqueta"],
    ["relacion_ficha", "id_relacion"],
    ["multimedia", "id_multi"]
  ]);
  assert.equal(sentenciasRun.length, 18);
  assert.equal(sentenciasAll.length, 6);

  for (const [tabla, columna] of IDENTIFICADORES_POSTGRES) {
    const secuencia = `${tabla}_${columna}_seq`;
    assert.ok(sentenciasRun.some(sql => sql.includes(`CREATE SEQUENCE IF NOT EXISTS public."${secuencia}"`)));
    assert.ok(sentenciasRun.some(sql => sql.includes(`ALTER TABLE public."${tabla}" ALTER COLUMN "${columna}" SET DEFAULT`)));
    assert.ok(sentenciasRun.some(sql => sql.includes(`OWNED BY public."${tabla}"."${columna}"`)));
    const ajuste = sentenciasAll.find(sql => sql.includes(`public."${secuencia}"`));
    assert.ok(ajuste.includes("GREATEST"));
    assert.ok(ajuste.includes("MAX"));
    assert.ok(ajuste.includes("is_called"));
  }
});
