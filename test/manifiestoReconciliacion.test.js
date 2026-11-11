const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canonicalizar,
  normalizarRegistro,
  huella,
  prepararFilas,
  agruparPorHuella,
  uuidPropuesto,
  validarDestinoSeguro,
  ENTIDADES
} = require("../scripts/generar-manifiesto-reconciliacion");

test("canonicaliza objetos independientemente del orden de sus claves", () => {
  assert.deepEqual(canonicalizar({ z: 1, a: { y: 2, b: 3 } }), {
    a: { b: 3, y: 2 }, z: 1
  });
});

test("normaliza JSON y booleanos entre representaciones SQLite y PostgreSQL", () => {
  assert.deepEqual(
    normalizarRegistro("ficha", { datos_json: '{"b":2,"a":1}', visible: 1 }),
    normalizarRegistro("ficha", { datos_json: { a: 1, b: 2 }, visible: true })
  );
});

test("excluye IDs, dependencias y metadatos de sincronización de la huella", () => {
  const a = { id_ficha: 1, id_menu: 4, titulo: "Historia", sync_id: "a", sync_version: 1 };
  const b = { id_ficha: 99, id_menu: 8, titulo: "Historia", sync_id: "b", sync_version: 7 };
  assert.equal(
    huella("ficha", a, ["id_ficha", "id_menu"]),
    huella("ficha", b, ["id_ficha", "id_menu"])
  );
});

test("el manifiesto de filas no exporta valores completos", () => {
  const filas = prepararFilas(
    [{ id_etiqueta: 3, nombre: "Reservado", descripcion: "Texto privado" }],
    { tabla: "etiqueta", pk: ["id_etiqueta"], excluir: ["id_etiqueta"] }
  );
  assert.deepEqual(Object.keys(filas[0]).sort(), ["clave_local", "huella_contenido"]);
  assert.equal(JSON.stringify(filas).includes("Texto privado"), false);
});

test("marca grupos duplicados como ambiguos al agrupar huellas", () => {
  const grupos = agruparPorHuella([
    { huella_contenido: "abc", clave_local: { id: 1 } },
    { huella_contenido: "abc", clave_local: { id: 2 } },
    { huella_contenido: "def", clave_local: { id: 3 } }
  ]);
  assert.equal(grupos.get("abc").length, 2);
  assert.equal(grupos.get("def").length, 1);
});


test("propone un UUID estable por entidad y huella de contenido", () => {
  const primero = uuidPropuesto("plantilla", "abc123");
  const segundo = uuidPropuesto("plantilla", "abc123");
  const otro = uuidPropuesto("menu", "abc123");
  assert.equal(primero, segundo);
  assert.notEqual(primero, otro);
  assert.match(primero, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});


test("declara dependencias para entidades hijas y relaciones", () => {
  const padres = (tabla) => ENTIDADES.find(e => e.tabla === tabla).padres;
  assert.deepEqual(padres("menu"), [{ tabla: "plantilla", fk: "id_plantilla" }]);
  assert.deepEqual(padres("ficha"), [{ tabla: "menu", fk: "id_menu" }]);
  assert.deepEqual(padres("multimedia"), [{ tabla: "ficha", fk: "id_ficha" }]);
  assert.equal(padres("ficha_etiqueta").length, 2);
  assert.equal(padres("relacion_ficha").length, 2);
});

test("las relaciones usan sus extremos y no IDs numéricos como identidad", () => {
  const etiquetas = ENTIDADES.find(e => e.tabla === "ficha_etiqueta");
  const relaciones = ENTIDADES.find(e => e.tabla === "relacion_ficha");
  assert.deepEqual(etiquetas.pk, ["id_ficha", "id_etiqueta"]);
  assert.equal(etiquetas.relacion, true);
  assert.equal(relaciones.relacion, true);
  assert.deepEqual(relaciones.referencias, ["id_ficha_origen", "id_ficha_destino", "tipo_relacion"]);
});

test("multimedia declara su ficha padre y exige checksum", () => {
  const multimedia = ENTIDADES.find(e => e.tabla === "multimedia");
  assert.equal(multimedia.multimedia, true);
  assert.equal(multimedia.padres[0].tabla, "ficha");
});

test("bloquea destinos PostgreSQL remotos y solo admite la copia local aislada", () => {
  const validar = validarDestinoSeguro;
  assert.doesNotThrow(() => validar("postgresql://usuario:clave@127.0.0.1:5432/museo_reconciliacion_prueba"));
  
  for (const url of [
    "postgresql://usuario:clave@db.example.com:5432/postgres",
    "postgresql://usuario:clave@127.0.0.1:5433/museo_reconciliacion_prueba",
    
    "postgresql://usuario:clave@127.0.0.1:5433/postgres",
    "https://example.com"
  ]) {
    assert.throws(() => validar(url), /Conexión bloqueada|URL de PostgreSQL inválida/);
  }
});
