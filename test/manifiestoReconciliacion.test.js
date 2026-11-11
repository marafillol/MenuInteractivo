const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
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
  enriquecerFilasMultimediaConArchivos,
  evaluarPortada,
  ENTIDADES
} = require("../scripts/generar-manifiesto-reconciliacion");


test("calcula checksum y tamaño multimedia desde archivos locales sin mutar filas originales", async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "museo-manifiesto-media-"));
  const relativa = path.join("imagenes", "multimedia", "imagen", "archivo.png");
  const destino = path.join(raiz, relativa);
  const bytes = Buffer.from("imagen de prueba");
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, bytes);
  const hash = crypto.createHash("sha256").update(bytes).digest("hex");
  const fila = {
    id_multi: 1,
    id_ficha: 2,
    ruta_archivo: relativa.split(path.sep).join("/"),
    checksum_sha256: null,
    tamano_bytes: null,
    mime_type: null
  };
  try {
    const resultado = await enriquecerFilasMultimediaConArchivos([fila], raiz);
    assert.equal(resultado.filas.length, 1);
    assert.equal(resultado.filas[0].checksum_sha256, hash);
    assert.equal(resultado.filas[0].tamano_bytes, bytes.length);
    assert.equal(resultado.filas[0].mime_type, "image/png");
    assert.equal(resultado.filas[0].__integridad_archivo, "checksum_calculado_solo_lectura");
    assert.equal(resultado.resumen.checksum_calculado_en_memoria, 1);
    assert.equal(fila.checksum_sha256, null, "no debe mutar la fila original");
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test("bloquea multimedia cuyo checksum guardado no coincide con el archivo local", async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "museo-manifiesto-media-"));
  const relativa = "imagenes/multimedia/imagen/archivo.png";
  const destino = path.join(raiz, ...relativa.split("/"));
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, Buffer.from("contenido real"));
  try {
    const resultado = await enriquecerFilasMultimediaConArchivos([{
      id_multi: 7,
      ruta_archivo: relativa,
      checksum_sha256: "a".repeat(64),
      tamano_bytes: 14
    }], raiz);
    assert.equal(resultado.filas[0].__integridad_archivo, "checksum_no_coincide");
    assert.equal(resultado.resumen.checksum_no_coincide, 1);
    assert.equal(resultado.filas[0].checksum_sha256, "a".repeat(64));
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test("marca multimedia sin archivo local como pendiente y no inventa checksum", async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "museo-manifiesto-media-"));
  try {
    const resultado = await enriquecerFilasMultimediaConArchivos([{
      id_multi: 9,
      ruta_archivo: "imagenes/multimedia/imagen/no-existe.png",
      checksum_sha256: null,
      tamano_bytes: null
    }], raiz);
    assert.equal(resultado.filas[0].__integridad_archivo, "archivo_no_encontrado");
    assert.equal(resultado.filas[0].checksum_sha256, null);
    assert.equal(resultado.resumen.archivo_no_encontrado, 1);
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

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

test("normaliza activo legado como número o texto y descripcion vacía como NULL en catálogos", () => {
  for (const tabla of ["plantilla", "etiqueta"]) {
    assert.deepEqual(
      normalizarRegistro(tabla, { nombre: "Catálogo", descripcion: "", activo: 1 }),
      normalizarRegistro(tabla, { nombre: "Catálogo", descripcion: null, activo: "1" })
    );
    assert.deepEqual(
      normalizarRegistro(tabla, { nombre: "Catálogo", descripcion: null, activo: 0 }),
      normalizarRegistro(tabla, { nombre: "Catálogo", descripcion: "", activo: "0" })
    );
  }
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
  assert.deepEqual(Object.keys(filas[0]).sort(), ["clave_local", "huella_contenido", "sync_id_existente"]);
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

test("la huella multimedia ignora rutas y storage_key, pero conserva el checksum", () => {
  const idFicha = "11111111-1111-5111-8111-111111111111";
  const mapas = {
    ficha: {
      sqlite: new Map([[JSON.stringify(["1"]), idFicha]]),
      postgres: new Map([[JSON.stringify(["9"]), idFicha]])
    }
  };
  const entidad = ENTIDADES.find(e => e.tabla === "multimedia");
  const base = {
    descripcion: "Documento",
    tipo_multi: "pdf",
    miniatura: "📄",
    activo: 1,
    checksum_sha256: "a".repeat(64),
    mime_type: "application/pdf",
    tamano_bytes: 1024
  };
  const local = prepararFilasConDependencias([{
    ...base,
    id_multi: 4,
    id_ficha: 1,
    ruta_archivo: "imagenes/multimedia/manual.pdf",
    storage_key: null,
    sync_previous_path: null
  }], entidad, mapas, "sqlite");
  const remoto = prepararFilasConDependencias([{
    ...base,
    id_multi: 39,
    id_ficha: 9,
    ruta_archivo: "https://storage.example/manual.pdf",
    storage_key: "multimedia/legacy/manual.pdf",
    sync_previous_path: "imagenes/multimedia/manual-anterior.pdf"
  }], entidad, mapas, "postgres");

  assert.equal(local.filas.length, 1);
  assert.equal(remoto.filas.length, 1);
  assert.equal(local.filas[0].huella_contenido, remoto.filas[0].huella_contenido);

  const distinto = prepararFilasConDependencias([{
    ...base,
    id_multi: 39,
    id_ficha: 9,
    ruta_archivo: "https://storage.example/manual.pdf",
    storage_key: "multimedia/legacy/manual.pdf",
    checksum_sha256: "b".repeat(64)
  }], entidad, mapas, "postgres");
  assert.notEqual(local.filas[0].huella_contenido, distinto.filas[0].huella_contenido);
});


test("resuelve dependencias cuando SQLite entrega IDs numéricos y PostgreSQL strings", () => {
  const mapas = {};
  const syncId = "11111111-1111-5111-8111-111111111111";
  registrarMapaIdentidades("plantilla", ["id_plantilla"],
    [{ id_plantilla: 1 }], [{ id_plantilla: "1" }],
    [{ claves_sqlite: [{ id_plantilla: 1 }], claves_postgres: [{ id_plantilla: "1" }], sync_id_propuesto: syncId }],
    mapas
  );
  const entidad = ENTIDADES.find(e => e.tabla === "menu");
  const local = prepararFilasConDependencias(
    [{ id_menu: 2, id_plantilla: 1, nombre: "Sala", visible: 1 }],
    entidad, mapas, "sqlite"
  );
  const remoto = prepararFilasConDependencias(
    [{ id_menu: "8", id_plantilla: "1", nombre: "Sala", visible: true }],
    entidad, mapas, "postgres"
  );
  assert.equal(local.pendientes.length, 0);
  assert.equal(remoto.pendientes.length, 0);
  assert.equal(local.filas[0].huella_contenido, remoto.filas[0].huella_contenido);
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


test("no equipara portadas por ruta: exige checksum común y reporta portadas pendientes", () => {
  const mapas = {};
  const idPlantilla = "11111111-1111-5111-8111-111111111111";
  registrarMapaIdentidades("plantilla", ["id_plantilla"],
    [{ id_plantilla: 1 }], [{ id_plantilla: 9 }],
    [{ claves_sqlite: [{ id_plantilla: 1 }], claves_postgres: [{ id_plantilla: 9 }], sync_id_propuesto: idPlantilla }],
    mapas
  );
  const entidad = ENTIDADES.find(e => e.tabla === "menu");
  const local = prepararFilasConDependencias(
    [{ id_menu: 2, id_plantilla: 1, nombre: "Sala", visible: 1, imagen: "imagenes/menus/a.png", imagen_checksum_sha256: null }],
    entidad, mapas, "sqlite"
  );
  const remoto = prepararFilasConDependencias(
    [{ id_menu: 8, id_plantilla: 9, nombre: "Sala", visible: true, imagen: "https://cdn.example/b.png", imagen_checksum_sha256: null }],
    entidad, mapas, "postgres"
  );
  assert.equal(local.filas[0].huella_contenido, remoto.filas[0].huella_contenido);
  assert.equal(local.pendientesPortada.length, 1);
  assert.equal(remoto.pendientesPortada.length, 1);
  assert.equal(evaluarPortada(local.filas[0], remoto.filas[0]).estado, "portada_pendiente_checksum");

  const conChecksumLocal = prepararFilasConDependencias(
    [{ id_menu: 2, id_plantilla: 1, nombre: "Sala", visible: 1, imagen: "imagenes/menus/a.png", imagen_checksum_sha256: "a".repeat(64), imagen_tamano_bytes: 10 }],
    entidad, mapas, "sqlite"
  );
  const checksumIgualRemoto = prepararFilasConDependencias(
    [{ id_menu: 8, id_plantilla: 9, nombre: "Sala", visible: true, imagen: "https://cdn.example/b.png", imagen_checksum_sha256: "a".repeat(64), imagen_tamano_bytes: 10 }],
    entidad, mapas, "postgres"
  );
  assert.equal(evaluarPortada(conChecksumLocal.filas[0], checksumIgualRemoto.filas[0]).estado,
    "portada_verificada_por_checksum");

  const checksumDistinto = prepararFilasConDependencias(
    [{ id_menu: 8, id_plantilla: 9, nombre: "Sala", visible: true, imagen: "https://cdn.example/b.png", imagen_checksum_sha256: "b".repeat(64), imagen_tamano_bytes: 10 }],
    entidad, mapas, "postgres"
  );
  assert.equal(local.filas[0].huella_contenido, checksumDistinto.filas[0].huella_contenido);
  assert.equal(evaluarPortada(conChecksumLocal.filas[0], checksumDistinto.filas[0]).estado,
    "conflicto_checksum_portada");
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
