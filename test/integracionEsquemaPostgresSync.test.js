const test = require("node:test");
const assert = require("node:assert/strict");
const { Client } = require("pg");

const connectionString = process.env.DATABASE_URL;
let client;

test.before(async () => {
  assert.ok(connectionString, "DATABASE_URL debe apuntar a la base PostgreSQL efímera de CI");
  client = new Client({ connectionString, connectionTimeoutMillis: 10000 });
  await client.connect();
});

test.after(async () => {
  if (client) await client.end();
});

test("el esquema PostgreSQL de sincronización se prepara sin asignar identidades históricas", async () => {
  const entidades = [
    "plantilla", "menu", "ficha", "etiqueta",
    "ficha_etiqueta", "relacion_ficha", "multimedia"
  ];

  for (const tabla of entidades) {
    const columnas = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
      [tabla]
    );
    const nombres = new Set(columnas.rows.map((fila) => fila.column_name));
    for (const columna of ["sync_id", "sync_version", "sync_deleted_at"]) {
      assert.ok(nombres.has(columna), tabla + " debe tener " + columna);
    }
    const filas = await client.query('SELECT COUNT(*)::int AS cantidad FROM public."' + tabla + '" WHERE sync_id IS NOT NULL');
    assert.equal(filas.rows[0].cantidad, 0, tabla + " no debe recibir UUID automáticamente");
  }

  const configuracion = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'configuracion'"
  );
  assert.equal(
    configuracion.rows.some((fila) => fila.column_name === "sync_id"),
    false,
    "configuracion debe quedar fuera de la identidad compartida"
  );

  for (const tabla of ["sync_dispositivos", "sync_eventos", "sync_conflictos"]) {
    const existe = await client.query(
      "SELECT to_regclass($1) IS NOT NULL AS existe",
      ["public." + tabla]
    );
    assert.equal(existe.rows[0].existe, true, tabla + " debe existir");
  }

  for (const tabla of ["menu", "ficha"]) {
    const columnas = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
      [tabla]
    );
    const nombres = new Set(columnas.rows.map((fila) => fila.column_name));
    for (const columna of [
      "imagen_storage_key", "imagen_checksum_sha256",
      "imagen_mime_type", "imagen_tamano_bytes"
    ]) {
      assert.ok(nombres.has(columna), tabla + " debe tener " + columna);
    }
  }

  const multimedia = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'multimedia'"
  );
  const multimediaColumns = new Set(multimedia.rows.map((fila) => fila.column_name));
  for (const columna of [
    "checksum_sha256", "mime_type", "tamano_bytes", "storage_key", "sync_previous_path"
  ]) {
    assert.ok(multimediaColumns.has(columna), "multimedia debe tener " + columna);
  }

  const secuencias = [
    ["plantilla", "id_plantilla", 4],
    ["menu", "id_menu", 23],
    ["ficha", "id_ficha", 88],
    ["etiqueta", "id_etiqueta", 12],
    ["relacion_ficha", "id_relacion", 8],
    ["multimedia", "id_multi", 48]
  ];
  for (const [tabla, columna, maximo] of secuencias) {
    const nombre = tabla + "_" + columna + "_seq";
    const resultado = await client.query(
      "SELECT nextval($1::regclass)::bigint AS siguiente",
      ["public." + nombre]
    );
    assert.ok(
      Number(resultado.rows[0].siguiente) > maximo,
      "la secuencia " + nombre + " debe continuar después del ID heredado"
    );
  }

  const ids = await client.query(
    "SELECT (SELECT id_menu FROM public.menu LIMIT 1) AS menu, " +
    "(SELECT id_ficha FROM public.ficha LIMIT 1) AS ficha, " +
    "(SELECT id_multi FROM public.multimedia LIMIT 1) AS multimedia"
  );
  assert.deepEqual(
    [Number(ids.rows[0].menu), Number(ids.rows[0].ficha), Number(ids.rows[0].multimedia)],
    [23, 88, 48],
    "la preparación no debe alterar IDs existentes"
  );
});


test("la instantánea de bootstrap captura contenido, relaciones y cursor en una transacción de solo lectura", async () => {
  const ids = {
    plantilla: "10000000-0000-4000-8000-000000000001",
    menu: "10000000-0000-4000-8000-000000000002",
    ficha: "10000000-0000-4000-8000-000000000003",
    etiqueta: "10000000-0000-4000-8000-000000000004",
    fichaEtiqueta: "10000000-0000-4000-8000-000000000005",
    relacion: "10000000-0000-4000-8000-000000000006",
    multimedia: "10000000-0000-4000-8000-000000000007",
    evento: "10000000-0000-4000-8000-000000000008",
    dispositivo: "10000000-0000-4000-8000-000000000009"
  };

  await client.query("UPDATE public.plantilla SET sync_id = $1 WHERE id_plantilla = 4", [ids.plantilla]);
  await client.query("UPDATE public.menu SET sync_id = $1 WHERE id_menu = 23", [ids.menu]);
  await client.query("UPDATE public.ficha SET sync_id = $1 WHERE id_ficha = 88", [ids.ficha]);
  await client.query("UPDATE public.etiqueta SET sync_id = $1 WHERE id_etiqueta = 12", [ids.etiqueta]);
  await client.query("UPDATE public.ficha_etiqueta SET sync_id = $1 WHERE id_ficha = 88 AND id_etiqueta = 12", [ids.fichaEtiqueta]);
  await client.query("UPDATE public.relacion_ficha SET sync_id = $1 WHERE id_relacion = 8", [ids.relacion]);
  await client.query(
    "UPDATE public.multimedia SET sync_id = $1, storage_key = $2, checksum_sha256 = $3, mime_type = $4, tamano_bytes = $5 WHERE id_multi = 48",
    [ids.multimedia, "multimedia/imagen/" + ids.multimedia + "/v1.png", "a".repeat(64), "image/png", 12]
  );
  await client.query(
    "INSERT INTO public.sync_eventos (evento_id, origen_device_id, entidad, operacion, sync_id, version_base, version_resultado, payload_json) VALUES ($1, $2, 'plantilla', 'INSERT', $3, 0, 1, '{}'::jsonb)",
    [ids.evento, ids.dispositivo, ids.plantilla]
  );

  const db = require("../src/database");
  const { crearSnapshot } = require("../src/servicios/sincronizacion/bootstrap");
  try {
    const snapshot = await db.withTransaction(crearSnapshot);

    assert.equal(snapshot.version, 1);
    assert.equal(snapshot.cursor, 1);
    assert.equal(snapshot.data.plantilla.length, 1);
    assert.equal(snapshot.data.menu[0].sync_id, ids.menu);
    assert.equal(snapshot.data.ficha[0].id_usuario, null);
    assert.equal(snapshot.data.ficha_etiqueta[0].sync_id, ids.fichaEtiqueta);
    assert.equal(snapshot.data.relacion_ficha[0].sync_id, ids.relacion);
    assert.equal(snapshot.data.multimedia[0].storage_key, "multimedia/imagen/" + ids.multimedia + "/v1.png");
    assert.equal(snapshot.data.multimedia[0].checksum_sha256, "a".repeat(64));

    const filas = await client.query("SELECT COUNT(*)::int AS cantidad FROM public.sync_eventos");
    assert.equal(filas.rows[0].cantidad, 1, "la captura no debe escribir eventos en PostgreSQL");
  } finally {
    await new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
  }
});
