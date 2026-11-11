const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const fixture = require('./fixtures/supabase-backup-real-identidades.json');
const plan = require('../docs/plan-identidades-supabase-candidato.json');
const sqlPath = path.join(__dirname, '../migraciones/migracion-identidades-supabase-candidata.sql');
const url = process.env.SYNC_TEST_DATABASE_URL;

function validarDestino(texto) {
    const destino = new URL(String(texto || ''));
    assert.ok(['127.0.0.1', 'localhost'].includes(destino.hostname), 'Solo PostgreSQL local.');
    assert.equal(destino.port, '5432', 'Solo puerto local descartable 5432.');
    assert.equal(destino.pathname.replace(/^\/+/, ''), 'museo_backup_real_test', 'Solo base museo_backup_real_test.');
}

test('backfill UUIDv5 sobre claves y relaciones extraídas del backup real de Supabase', { skip: !url }, async () => {
    validarDestino(url);
    assert.equal(fixture.source.sha256, 'f5817b9bf741f121fe816c8756091b99a14698c7c6187a68742c709031e49cce');
    assert.equal(fixture.source.export_snapshot, '2026-11-10');

    const client = new Client({ connectionString: url, ssl: false });
    await client.connect();
    try {
        await client.query(`
            DROP TABLE IF EXISTS public.ficha_etiqueta CASCADE;
            DROP TABLE IF EXISTS public.relacion_ficha CASCADE;
            DROP TABLE IF EXISTS public.multimedia CASCADE;
            DROP TABLE IF EXISTS public.ficha CASCADE;
            DROP TABLE IF EXISTS public.etiqueta CASCADE;
            DROP TABLE IF EXISTS public.menu CASCADE;
            DROP TABLE IF EXISTS public.plantilla CASCADE;
            CREATE TABLE public.plantilla (id_plantilla BIGINT PRIMARY KEY);
            CREATE TABLE public.menu (id_menu BIGINT PRIMARY KEY, id_plantilla BIGINT REFERENCES public.plantilla(id_plantilla));
            CREATE TABLE public.ficha (id_ficha BIGINT PRIMARY KEY, id_menu BIGINT REFERENCES public.menu(id_menu));
            CREATE TABLE public.etiqueta (id_etiqueta BIGINT PRIMARY KEY);
            CREATE TABLE public.multimedia (id_multi BIGINT PRIMARY KEY, id_ficha BIGINT REFERENCES public.ficha(id_ficha));
            CREATE TABLE public.relacion_ficha (
                id_relacion BIGINT PRIMARY KEY,
                id_ficha_origen BIGINT REFERENCES public.ficha(id_ficha),
                id_ficha_destino BIGINT REFERENCES public.ficha(id_ficha)
            );
            CREATE TABLE public.ficha_etiqueta (
                id_ficha BIGINT NOT NULL REFERENCES public.ficha(id_ficha),
                id_etiqueta BIGINT NOT NULL REFERENCES public.etiqueta(id_etiqueta),
                PRIMARY KEY (id_ficha, id_etiqueta)
            );
        `);

        for (const tabla of ['plantilla', 'menu', 'ficha', 'etiqueta', 'multimedia', 'relacion_ficha']) {
            const columna = {
                plantilla: 'id_plantilla', menu: 'id_menu', ficha: 'id_ficha',
                etiqueta: 'id_etiqueta', multimedia: 'id_multi', relacion_ficha: 'id_relacion'
            }[tabla];
            for (const id of fixture.tables[tabla]) {
                await client.query(`INSERT INTO public.${tabla} (${columna}) VALUES ($1)`, [id]);
            }
        }
        for (const [idFicha, idEtiqueta] of fixture.ficha_etiqueta) {
            await client.query(
                'INSERT INTO public.ficha_etiqueta (id_ficha, id_etiqueta) VALUES ($1, $2)',
                [idFicha, idEtiqueta]
            );
        }
        for (const [id, origen, destino] of fixture.relacion_ficha_rows) {
            await client.query(
                'UPDATE public.relacion_ficha SET id_ficha_origen = $2, id_ficha_destino = $3 WHERE id_relacion = $1',
                [id, origen, destino]
            );
        }

        const conteosReales = {};
        for (const tabla of [...Object.keys(fixture.tables), 'ficha_etiqueta']) {
            const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM public.${tabla}`);
            conteosReales[tabla] = rows[0].n;
            assert.equal(rows[0].n, plan.conteos[tabla], `conteo del backup: ${tabla}`);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');
        assert.match(sql.trim(), /ROLLBACK;$/);
        await client.query(sql.replace(/ROLLBACK;\\s*$/, 'COMMIT;'));

        const resultado = {};
        for (const tabla of [...Object.keys(fixture.tables), 'ficha_etiqueta']) {
            const { rows } = await client.query(
                `SELECT COUNT(*)::int AS total, COUNT(sync_id)::int AS con_id,
                        COUNT(DISTINCT sync_id)::int AS distintos,
                        MIN(sync_version)::int AS version_min, MAX(sync_version)::int AS version_max
                 FROM public.${tabla}`
            );
            const fila = rows[0];
            resultado[tabla] = fila;
            assert.equal(fila.total, plan.conteos[tabla], `total ${tabla}`);
            assert.equal(fila.con_id, plan.conteos[tabla], `sync_id completo ${tabla}`);
            assert.equal(fila.distintos, plan.conteos[tabla], `UUID únicos ${tabla}`);
            assert.equal(fila.version_min, 1);
            assert.equal(fila.version_max, 1);
        }

        assert.equal(plan.identidades.cantidad, 122);
        assert.equal(new Set(plan.identidades.items.map(item => item[2])).size, 122);
        assert.deepEqual(
            fixture.ficha_etiqueta.map(pair => pair.join(':')).sort(),
            plan.identidades.items.filter(item => item[0] === 'ficha_etiqueta').map(item => item[1]).sort()
        );
    } finally {
        await client.end();
    }
});
