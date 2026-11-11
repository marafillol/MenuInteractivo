const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const plan = require('../docs/plan-identidades-supabase-candidato.json');
const sqlPath = path.join(__dirname, '../migraciones/migracion-identidades-supabase-candidata.sql');
const tablas = ['plantilla', 'menu', 'ficha', 'etiqueta', 'multimedia', 'relacion_ficha', 'ficha_etiqueta'];
const url = process.env.SYNC_TEST_DATABASE_URL;

function validarDestino(urlTexto) {
    const destino = new URL(String(urlTexto || ''));
    assert.ok(['127.0.0.1', 'localhost'].includes(destino.hostname), 'La prueba solo admite PostgreSQL local.');
    assert.equal(destino.port, '5432', 'La prueba solo admite el puerto local descartable 5432.');
    assert.equal(destino.pathname.replace(/^\/+/, ''), 'museo_plan_test', 'La prueba solo admite museo_plan_test.');
}

test('la migración candidata asigna las 122 identidades UUIDv5 sin tocar producción', { skip: !url }, async () => {
    validarDestino(url);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    assert.match(sql.trim(), /ROLLBACK;$/);

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
            CREATE TABLE public.plantilla (id_plantilla bigint PRIMARY KEY);
            CREATE TABLE public.menu (id_menu bigint PRIMARY KEY);
            CREATE TABLE public.ficha (id_ficha bigint PRIMARY KEY);
            CREATE TABLE public.etiqueta (id_etiqueta bigint PRIMARY KEY);
            CREATE TABLE public.multimedia (id_multi bigint PRIMARY KEY);
            CREATE TABLE public.relacion_ficha (id_relacion bigint PRIMARY KEY);
            CREATE TABLE public.ficha_etiqueta (
                id_ficha bigint NOT NULL,
                id_etiqueta bigint NOT NULL,
                PRIMARY KEY (id_ficha, id_etiqueta)
            );
        `);

        for (const tabla of tablas) {
            const items = plan.identidades.items.filter((item) => item[0] === tabla);
            for (const item of items) {
                const key = item[1];
                if (tabla === 'ficha_etiqueta') {
                    const [idFicha, idEtiqueta] = key.split(':').map(Number);
                    await client.query(
                        'INSERT INTO public.ficha_etiqueta (id_ficha, id_etiqueta) VALUES ($1, $2)',
                        [idFicha, idEtiqueta]
                    );
                } else {
                    const columna = {
                        plantilla: 'id_plantilla', menu: 'id_menu', ficha: 'id_ficha',
                        etiqueta: 'id_etiqueta', multimedia: 'id_multi', relacion_ficha: 'id_relacion'
                    }[tabla];
                    await client.query(`INSERT INTO public.${tabla} (${columna}) VALUES ($1)`, [Number(key)]);
                }
            }
        }

        // En CI se confirma la transacción en una base desechable para verificar el resultado.
        const sqlDePrueba = sql.replace(/ROLLBACK;\s*$/, 'COMMIT;');
        await client.query(sqlDePrueba);

        for (const tabla of tablas) {
            const result = await client.query(
                `SELECT COUNT(*)::int AS total, COUNT(sync_id)::int AS con_id,
                        COUNT(DISTINCT sync_id)::int AS distintos,
                        MIN(sync_version)::int AS version_min, MAX(sync_version)::int AS version_max
                 FROM public.${tabla}`
            );
            const fila = result.rows[0];
            const esperado = plan.conteos[tabla];
            assert.equal(fila.total, esperado, `cantidad de ${tabla}`);
            assert.equal(fila.con_id, esperado, `identidades completas de ${tabla}`);
            assert.equal(fila.distintos, esperado, `identidades únicas de ${tabla}`);
            assert.equal(fila.version_min, 1, `versión mínima de ${tabla}`);
            assert.equal(fila.version_max, 1, `versión máxima de ${tabla}`);
        }

        assert.equal(plan.identidades.cantidad, 122);
        assert.equal(new Set(plan.identidades.items.map((item) => item[2])).size, 122);
    } finally {
        await client.end();
    }
});