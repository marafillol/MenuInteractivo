const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const fixture = require('./fixtures/supabase-backup-real-identidades.json');
const plan = require('../docs/plan-identidades-supabase-candidato.json');
const url = process.env.SYNC_TEST_DATABASE_URL;

function validarDestino(value) {
  const u = new URL(String(value || ''));
  assert.ok(['127.0.0.1','localhost'].includes(u.hostname));
  assert.equal(u.port, '5432');
  assert.equal(u.pathname.replace(/^\\/+/, ''), 'museo_backup_real_test');
}

test('identidades consolidadas para 59 fichas y 39 asociaciones del Supabase vivo', {skip: !url}, async () => {
  validarDestino(url);
  const client = new Client({connectionString:url, ssl:false});
  await client.connect();
  try {
    const schema = fs.readFileSync(path.join(__dirname,'fixtures/esquema-backup-supabase-2026-11-10.sql'),'utf8');
    await client.query(schema);
    for (const id of fixture.tables.plantilla) await client.query('INSERT INTO public.plantilla(id_plantilla) VALUES($1)',[id]);
    for (const [id,p] of fixture.foreign_keys.menu_plantilla) await client.query('INSERT INTO public.menu(id_menu,id_plantilla) VALUES($1,$2)',[id,p]);
    for (const [id,m] of fixture.foreign_keys.ficha_menu) await client.query('INSERT INTO public.ficha(id_ficha,id_menu) VALUES($1,$2)',[id,m]);
    for (const id of fixture.tables.etiqueta) await client.query('INSERT INTO public.etiqueta(id_etiqueta) VALUES($1)',[id]);
    for (const [id,f] of fixture.foreign_keys.multimedia_ficha) await client.query('INSERT INTO public.multimedia(id_multi,id_ficha) VALUES($1,$2)',[id,f]);
    for (const [id,o,d] of fixture.relacion_ficha_rows) await client.query('INSERT INTO public.relacion_ficha(id_relacion,id_ficha_origen,id_ficha_destino) VALUES($1,$2,$3)',[id,o,d]);
    for (const [f,e] of fixture.ficha_etiqueta) await client.query('INSERT INTO public.ficha_etiqueta(id_ficha,id_etiqueta) VALUES($1,$2)',[f,e]);
    for (const id of [89,90,91,92]) await client.query('INSERT INTO public.ficha(id_ficha,id_menu) VALUES($1,1)',[id]);
    for (const [f,e] of [[33,6],[89,10],[90,7],[91,6],[92,7]]) await client.query('INSERT INTO public.ficha_etiqueta(id_ficha,id_etiqueta) VALUES($1,$2)',[f,e]);

    const sql = fs.readFileSync(path.join(__dirname,'../migraciones/migracion-identidades-supabase-vivo-consolidada-candidata.sql'),'utf8');
    assert.match(sql.trim(), /ROLLBACK;$/);
    await client.query(sql.replace(/ROLLBACK;\\s*$/, 'COMMIT;'));

    const expected = {plantilla:3,menu:3,ficha:59,etiqueta:5,multimedia:21,relacion_ficha:1,ficha_etiqueta:39};
    for (const [table,total] of Object.entries(expected)) {
      const {rows} = await client.query(`SELECT COUNT(*)::int AS total, COUNT(sync_id)::int AS assigned, COUNT(DISTINCT sync_id)::int AS unique_ids, MIN(sync_version)::int AS min_version, MAX(sync_version)::int AS max_version FROM public.${table}`);
      assert.deepEqual(rows[0],{total,assigned:total,unique_ids:total,min_version:1,max_version:1},table);
    }
    assert.equal(plan.identidades.cantidad,122);
    const delta = await client.query("SELECT id_ficha, sync_id::text FROM public.ficha WHERE id_ficha BETWEEN 89 AND 92 ORDER BY id_ficha");
    assert.equal(delta.rows.length,4);
    const associations = await client.query("SELECT COUNT(*)::int AS n FROM public.ficha_etiqueta WHERE sync_id IS NOT NULL AND (id_ficha,id_etiqueta) IN ((33,6),(89,10),(90,7),(91,6),(92,7))");
    assert.equal(associations.rows[0].n,5);
  } finally { await client.end(); }
});
