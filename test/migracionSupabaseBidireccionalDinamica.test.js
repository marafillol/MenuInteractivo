const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const fixture = require('./fixtures/supabase-backup-real-identidades.json');
const storage = require('../src/servicios/sincronizacion/mapaStorageHistorico.json');
const url = process.env.SYNC_TEST_DATABASE_URL;

function validarDestino(value) {
  const u = new URL(String(value || ''));
  assert.ok(['127.0.0.1', 'localhost'].includes(u.hostname));
  assert.equal(u.port, '5432');
  assert.equal(u.pathname.slice(1), 'museo_sync_dinamica_test');
}

test('migración dinámica asigna UUIDv5 a filas históricas y altas nuevas, con Storage histórico exacto', { skip: !url }, async () => {
  validarDestino(url);
  const client = new Client({ connectionString: url, ssl: false });
  await client.connect();
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'fixtures/esquema-backup-supabase-2026-11-10.sql'), 'utf8');
    await client.query(schema);
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions');

    const mapa = storage.entries;
    const portada = (tipo, id) => mapa[`${tipo}:${id}`]?.[0] ?? null;
    for (const id of fixture.tables.plantilla) await client.query('INSERT INTO public.plantilla(id_plantilla) VALUES($1)', [id]);
    for (const [id, p] of fixture.foreign_keys.menu_plantilla) {
      await client.query('INSERT INTO public.menu(id_menu,id_plantilla,imagen) VALUES($1,$2,$3)', [id, p, portada('menu', id)]);
    }
    for (const [id, m] of fixture.foreign_keys.ficha_menu) {
      await client.query('INSERT INTO public.ficha(id_ficha,id_menu,imagen) VALUES($1,$2,$3)', [id, m, portada('ficha', id)]);
    }
    for (const id of fixture.tables.etiqueta) await client.query('INSERT INTO public.etiqueta(id_etiqueta) VALUES($1)', [id]);
    for (const [id, f] of fixture.foreign_keys.multimedia_ficha) {
      const entry = mapa[`multimedia:${id}`];
      assert.ok(entry, `falta alias Storage para multimedia ${id}`);
      await client.query('INSERT INTO public.multimedia(id_multi,id_ficha,ruta_archivo,tipo_multi,activo) VALUES($1,$2,$3,$4,1)', [id, f, entry[0], 'imagen']);
    }
    for (const [id, o, d] of fixture.relacion_ficha_rows) await client.query('INSERT INTO public.relacion_ficha(id_relacion,id_ficha_origen,id_ficha_destino) VALUES($1,$2,$3)', [id, o, d]);
    for (const [f, e] of fixture.ficha_etiqueta) await client.query('INSERT INTO public.ficha_etiqueta(id_ficha,id_etiqueta) VALUES($1,$2)', [f, e]);

    // Simula actividad de Render durante el desarrollo: filas nuevas no incluidas en el snapshot de noviembre.
    await client.query("INSERT INTO public.ficha(id_ficha,id_menu,titulo,imagen) VALUES(900,1,'Alta posterior',NULL)");
    await client.query('INSERT INTO public.ficha_etiqueta(id_ficha,id_etiqueta) VALUES(900,6)');

    const sql = fs.readFileSync(path.join(__dirname, '../migraciones/migracion-supabase-bidireccional-dinamica-candidata.sql'), 'utf8');
    assert.match(sql.trim(), /ROLLBACK;$/);
    await client.query(sql.slice(0, sql.lastIndexOf('ROLLBACK;')) + 'COMMIT;');

    const expected = {
      plantilla: fixture.tables.plantilla.length,
      menu: fixture.tables.menu.length,
      ficha: fixture.tables.ficha.length + 1,
      etiqueta: fixture.tables.etiqueta.length,
      multimedia: fixture.tables.multimedia.length,
      relacion_ficha: fixture.tables.relacion_ficha.length,
      ficha_etiqueta: fixture.ficha_etiqueta.length + 1
    };
    for (const [table, total] of Object.entries(expected)) {
      const { rows } = await client.query(`SELECT COUNT(*)::int AS total, COUNT(sync_id)::int AS assigned, COUNT(DISTINCT sync_id)::int AS unique_ids, MIN(sync_version)::int AS min_version, MAX(sync_version)::int AS max_version FROM public.${table}`);
      assert.deepEqual(rows[0], { total, assigned: total, unique_ids: total, min_version: 1, max_version: 1 }, table);
    }
    const { rows: newFicha } = await client.query("SELECT sync_id::text FROM public.ficha WHERE id_ficha=900");
    const { rows: newAssociation } = await client.query("SELECT sync_id::text FROM public.ficha_etiqueta WHERE id_ficha=900 AND id_etiqueta=6");
    assert.equal(newFicha.length, 1);
    assert.equal(newAssociation.length, 1);
    const { rows: media } = await client.query("SELECT COUNT(*)::int AS n FROM public.multimedia WHERE storage_key IS NOT NULL AND checksum_sha256 ~ '^[a-f0-9]{64}$' AND tamano_bytes > 0 AND mime_type IS NOT NULL");
    assert.equal(media[0].n, fixture.tables.multimedia.length);
    const { rows: covers } = await client.query("SELECT COUNT(*)::int AS n FROM public.ficha WHERE imagen IS NOT NULL AND imagen_storage_key IS NOT NULL AND imagen_checksum_sha256 ~ '^[a-f0-9]{64}$'");
    assert.equal(covers[0].n, 34);
  } finally {
    await client.end();
  }
});
