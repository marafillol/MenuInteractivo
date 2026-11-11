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
  registrarMapaIdentidades,
  prepararFilasConDependencias,
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


test("genera candidatos hijos solo cuando sus padres tienen identidad compartida", () => {
  const mapas = {};
  const idPlantilla = "11111111-1111-5111-8111-111111111111";
  registrarMapaIdentidades("plantilla", ["id_plantilla"],
    [{ id_plantilla: 1 }], [{ id_plantilla: 9 }],
    [{ claves_sqlite: [{ id_plantilla: 1 }], claves_postgres: [{ id_plantilla: 9 }], sync_id_propuesto: idPlantilla }],
    mapas
  );
  const entidad = ENTIDADES.find(e => e.tabla === "menu");
  const local = prepararFilasConDependencias(
    [{ id_menu: 2, id_plantilla: 1, nombre: "Sala", visible: 1 }],
    entidad, mapas, "sqlite"
  );
  const remoto = prepararFilasConDependencias(
    [{ id_menu: 8, id_plantilla: 9, nombre: "Sala", visible: true }],
    entidad, mapas, "postgres"
  );
  assert.equal(local.pendientes.length, 0);
  assert.equal(remoto.pendientes.length, 0);
  assert.equal(local.filas[0].huella_contenido, remoto.filas[0].huella_contenido);

  const sinPadre = prepararFilasConDependencias(
    [{ id_menu: 3, id_plantilla: 77, nombre: "Sin padre", visible: 1 }],
    entidad, mapas, "sqlite"
  );
  assert.equal(sinPadre.filas.length, 0);
  assert.deepEqual(sinPadre.pendientes, [{ id_menu: 3 }]);
});

test("las relaciones se emparejan usando identidades de ambos extremos", () => {
  const mapas = {};
  const idFichaA = "11111111-1111-5111-8111-111111111111";
  const idFichaB = "22222222-2222-5222-8222-222222222222";
  registrarMapaIdentidades("ficha", ["id_ficha"],
    [{ id_ficha: 1 }, { id_ficha: 2 }],
    [{ id_ficha: 10 }, { id_ficha: 20 }],
    [
      { claves_sqlite: [{ id_ficha: 1 }], claves_postgres: [{ id_ficha: 10 }], sync_id_propuesto: idFichaA },
      { claves_sqlite: [{ id_ficha: 2 }], claves_postgres: [{ id_ficha: 20 }], sync_id_propuesto: idFichaB }
    ], mapas
  );
  const entidad = ENTIDADES.find(e => e.tabla === "relacion_ficha");
  const local = prepararFilasConDependencias(
    [{ id_relacion: 4, id_ficha_origen: 1, id_ficha_destino: 2, tipo_relacion: "relacionada" }],
    entidad, mapas, "sqlite"
  );
  const remoto = prepararFilasConDependencias(
    [{ id_relacion: 14, id_ficha_origen: 10, id_ficha_destino: 20, tipo_relacion: "relacionada" }],
    entidad, mapas, "postgres"
  );
  assert.equal(local.filas[0].huella_contenido, remoto.filas[0].huella_contenido);
  assert.equal(local.pendientes.length, 0);
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
