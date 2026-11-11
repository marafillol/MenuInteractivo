const test = require("node:test");
const assert = require("node:assert/strict");
const { validarDestino, parseJson, igualJson, canon } = require("../scripts/reparar-diferencias-fichas-prueba");

test("permite únicamente la base local de reconciliación en puerto 5432", () => {
  assert.deepEqual(
    validarDestino("postgresql://postgres:clave@127.0.0.1:5432/museo_reconciliacion_prueba"),
    { host: "127.0.0.1", port: "5432", database: "museo_reconciliacion_prueba", user: "postgres" }
  );
});

test("bloquea destinos remotos, otros puertos, bases y usuarios", () => {
  const blocked = [
    "postgresql://postgres:clave@db.supabase.co:5432/postgres",
    "postgresql://postgres:clave@127.0.0.1:5433/museo_reconciliacion_prueba",
    "postgresql://postgres:clave@127.0.0.1:5432/postgres",
    "postgresql://otro:clave@localhost:5432/museo_reconciliacion_prueba"
  ];
  for (const url of blocked) assert.throws(() => validarDestino(url), /BLOQUEADO/);
});

test("parsea JSON sin alterar valores que no son JSON", () => {
  assert.deepEqual(parseJson('{"Lugar":"Tucumán"}'), { Lugar: "Tucumán" });
  assert.equal(parseJson("texto libre"), "texto libre");
});

test("compara objetos JSON ignorando solo el orden de sus claves", () => {
  assert.equal(igualJson({ b: 2, a: 1 }, { a: 1, b: 2 }), true);
  assert.equal(igualJson({ a: 1 }, {}), false);
  assert.deepEqual(canon({ z: { b: 1, a: 2 }, a: 0 }), { a: 0, z: { a: 2, b: 1 } });
});
