-- AUDITORÍA SOLO LECTURA: estado actual de Supabase vs backup SQL del 2026-11-10.
-- SHA-256 del dump: f5817b9bf741f121fe816c8756091b99a14698c7c6187a68742c709031e49cce
-- Ejecutar en Supabase SQL Editor. Solo SELECT; no crea objetos ni modifica datos.
-- Compara claves primarias y relaciones, no contenido personal ni campos descriptivos.
-- Una diferencia indica que el estado vivo cambió respecto del snapshot; NO implica por sí sola corrupción.

WITH
expected_ids(table_name, record_id) AS (
  VALUES
    ('plantilla', '2'),
    ('plantilla', '3'),
    ('plantilla', '1'),
    ('menu', '23'),
    ('menu', '2'),
    ('menu', '1'),
    ('ficha', '15'),
    ('ficha', '19'),
    ('ficha', '21'),
    ('ficha', '5'),
    ('ficha', '7'),
    ('ficha', '11'),
    ('ficha', '12'),
    ('ficha', '9'),
    ('ficha', '20'),
    ('ficha', '10'),
    ('ficha', '13'),
    ('ficha', '6'),
    ('ficha', '22'),
    ('ficha', '24'),
    ('ficha', '26'),
    ('ficha', '32'),
    ('ficha', '33'),
    ('ficha', '23'),
    ('ficha', '25'),
    ('ficha', '29'),
    ('ficha', '28'),
    ('ficha', '35'),
    ('ficha', '59'),
    ('ficha', '18'),
    ('ficha', '27'),
    ('ficha', '34'),
    ('ficha', '2'),
    ('ficha', '1'),
    ('ficha', '14'),
    ('ficha', '36'),
    ('ficha', '66'),
    ('ficha', '67'),
    ('ficha', '68'),
    ('ficha', '3'),
    ('ficha', '4'),
    ('ficha', '8'),
    ('ficha', '71'),
    ('ficha', '72'),
    ('ficha', '73'),
    ('ficha', '74'),
    ('ficha', '75'),
    ('ficha', '76'),
    ('ficha', '77'),
    ('ficha', '78'),
    ('ficha', '79'),
    ('ficha', '80'),
    ('ficha', '81'),
    ('ficha', '82'),
    ('ficha', '83'),
    ('ficha', '84'),
    ('ficha', '85'),
    ('ficha', '86'),
    ('ficha', '60'),
    ('ficha', '87'),
    ('ficha', '88'),
    ('etiqueta', '6'),
    ('etiqueta', '10'),
    ('etiqueta', '11'),
    ('etiqueta', '8'),
    ('etiqueta', '7'),
    ('multimedia', '4'),
    ('multimedia', '5'),
    ('multimedia', '7'),
    ('multimedia', '8'),
    ('multimedia', '9'),
    ('multimedia', '11'),
    ('multimedia', '12'),
    ('multimedia', '13'),
    ('multimedia', '14'),
    ('multimedia', '16'),
    ('multimedia', '1'),
    ('multimedia', '15'),
    ('multimedia', '39'),
    ('multimedia', '40'),
    ('multimedia', '6'),
    ('multimedia', '2'),
    ('multimedia', '10'),
    ('multimedia', '41'),
    ('multimedia', '42'),
    ('multimedia', '3'),
    ('multimedia', '48'),
    ('relacion_ficha', '1'),
    ('ficha_etiqueta', '7:6'),
    ('ficha_etiqueta', '7:7'),
    ('ficha_etiqueta', '7:8'),
    ('ficha_etiqueta', '72:11'),
    ('ficha_etiqueta', '73:11'),
    ('ficha_etiqueta', '74:11'),
    ('ficha_etiqueta', '76:11'),
    ('ficha_etiqueta', '78:10'),
    ('ficha_etiqueta', '79:7'),
    ('ficha_etiqueta', '80:7'),
    ('ficha_etiqueta', '28:11'),
    ('ficha_etiqueta', '81:11'),
    ('ficha_etiqueta', '82:10'),
    ('ficha_etiqueta', '83:7'),
    ('ficha_etiqueta', '84:6'),
    ('ficha_etiqueta', '85:7'),
    ('ficha_etiqueta', '85:10'),
    ('ficha_etiqueta', '86:7'),
    ('ficha_etiqueta', '1:10'),
    ('ficha_etiqueta', '60:6'),
    ('ficha_etiqueta', '87:6'),
    ('ficha_etiqueta', '88:6'),
    ('ficha_etiqueta', '5:8'),
    ('ficha_etiqueta', '20:6'),
    ('ficha_etiqueta', '11:6'),
    ('ficha_etiqueta', '14:6'),
    ('ficha_etiqueta', '36:6'),
    ('ficha_etiqueta', '2:10'),
    ('ficha_etiqueta', '66:10'),
    ('ficha_etiqueta', '12:7'),
    ('ficha_etiqueta', '25:7'),
    ('ficha_etiqueta', '3:11'),
    ('ficha_etiqueta', '4:11'),
    ('ficha_etiqueta', '8:10')
),
actual_ids(table_name, record_id) AS (
  SELECT 'plantilla'::text table_name, id_plantilla::text record_id FROM public.plantilla
UNION ALL
SELECT 'menu', id_menu::text FROM public.menu
UNION ALL
SELECT 'ficha', id_ficha::text FROM public.ficha
UNION ALL
SELECT 'etiqueta', id_etiqueta::text FROM public.etiqueta
UNION ALL
SELECT 'multimedia', id_multi::text FROM public.multimedia
UNION ALL
SELECT 'relacion_ficha', id_relacion::text FROM public.relacion_ficha
UNION ALL
SELECT 'ficha_etiqueta', id_ficha::text || ':' || id_etiqueta::text FROM public.ficha_etiqueta
)
SELECT
  e.table_name,
  (SELECT count(*) FROM expected_ids x WHERE x.table_name = e.table_name) AS backup_rows,
  (SELECT count(*) FROM actual_ids x WHERE x.table_name = e.table_name) AS live_rows,
  COALESCE((
    SELECT array_agg(x.record_id ORDER BY x.record_id)
    FROM expected_ids x
    LEFT JOIN actual_ids a USING (table_name, record_id)
    WHERE x.table_name = e.table_name AND a.record_id IS NULL
  ), ARRAY[]::text[]) AS missing_from_live,
  COALESCE((
    SELECT array_agg(a.record_id ORDER BY a.record_id)
    FROM actual_ids a
    LEFT JOIN expected_ids x USING (table_name, record_id)
    WHERE a.table_name = e.table_name AND x.record_id IS NULL
  ), ARRAY[]::text[]) AS added_since_backup
FROM (SELECT DISTINCT table_name FROM expected_ids) e
ORDER BY e.table_name;

WITH
expected_links(relation_name, relation_key) AS (
  VALUES
    ('menu_plantilla', '23>3'),
    ('menu_plantilla', '2>2'),
    ('menu_plantilla', '1>1'),
    ('ficha_menu', '15>1'),
    ('ficha_menu', '19>1'),
    ('ficha_menu', '21>1'),
    ('ficha_menu', '5>1'),
    ('ficha_menu', '7>1'),
    ('ficha_menu', '11>1'),
    ('ficha_menu', '12>1'),
    ('ficha_menu', '9>1'),
    ('ficha_menu', '20>1'),
    ('ficha_menu', '10>1'),
    ('ficha_menu', '13>1'),
    ('ficha_menu', '6>1'),
    ('ficha_menu', '22>2'),
    ('ficha_menu', '24>1'),
    ('ficha_menu', '26>1'),
    ('ficha_menu', '32>1'),
    ('ficha_menu', '33>1'),
    ('ficha_menu', '23>1'),
    ('ficha_menu', '25>1'),
    ('ficha_menu', '29>1'),
    ('ficha_menu', '28>1'),
    ('ficha_menu', '35>1'),
    ('ficha_menu', '59>1'),
    ('ficha_menu', '18>1'),
    ('ficha_menu', '27>1'),
    ('ficha_menu', '34>1'),
    ('ficha_menu', '2>1'),
    ('ficha_menu', '1>1'),
    ('ficha_menu', '14>1'),
    ('ficha_menu', '36>1'),
    ('ficha_menu', '66>1'),
    ('ficha_menu', '67>1'),
    ('ficha_menu', '68>1'),
    ('ficha_menu', '3>1'),
    ('ficha_menu', '4>1'),
    ('ficha_menu', '8>1'),
    ('ficha_menu', '71>1'),
    ('ficha_menu', '72>1'),
    ('ficha_menu', '73>1'),
    ('ficha_menu', '74>1'),
    ('ficha_menu', '75>23'),
    ('ficha_menu', '76>1'),
    ('ficha_menu', '77>1'),
    ('ficha_menu', '78>1'),
    ('ficha_menu', '79>1'),
    ('ficha_menu', '80>1'),
    ('ficha_menu', '81>23'),
    ('ficha_menu', '82>1'),
    ('ficha_menu', '83>1'),
    ('ficha_menu', '84>1'),
    ('ficha_menu', '85>1'),
    ('ficha_menu', '86>1'),
    ('ficha_menu', '60>1'),
    ('ficha_menu', '87>1'),
    ('ficha_menu', '88>1'),
    ('multimedia_ficha', '4>1'),
    ('multimedia_ficha', '5>1'),
    ('multimedia_ficha', '7>2'),
    ('multimedia_ficha', '8>2'),
    ('multimedia_ficha', '9>21'),
    ('multimedia_ficha', '11>7'),
    ('multimedia_ficha', '12>7'),
    ('multimedia_ficha', '13>7'),
    ('multimedia_ficha', '14>22'),
    ('multimedia_ficha', '16>22'),
    ('multimedia_ficha', '1>1'),
    ('multimedia_ficha', '15>22'),
    ('multimedia_ficha', '39>8'),
    ('multimedia_ficha', '40>60'),
    ('multimedia_ficha', '6>2'),
    ('multimedia_ficha', '2>1'),
    ('multimedia_ficha', '10>2'),
    ('multimedia_ficha', '41>2'),
    ('multimedia_ficha', '42>2'),
    ('multimedia_ficha', '3>1'),
    ('multimedia_ficha', '48>59'),
    ('relacion_ficha', '1>22>7'),
    ('ficha_etiqueta', '7>6'),
    ('ficha_etiqueta', '7>7'),
    ('ficha_etiqueta', '7>8'),
    ('ficha_etiqueta', '72>11'),
    ('ficha_etiqueta', '73>11'),
    ('ficha_etiqueta', '74>11'),
    ('ficha_etiqueta', '76>11'),
    ('ficha_etiqueta', '78>10'),
    ('ficha_etiqueta', '79>7'),
    ('ficha_etiqueta', '80>7'),
    ('ficha_etiqueta', '28>11'),
    ('ficha_etiqueta', '81>11'),
    ('ficha_etiqueta', '82>10'),
    ('ficha_etiqueta', '83>7'),
    ('ficha_etiqueta', '84>6'),
    ('ficha_etiqueta', '85>7'),
    ('ficha_etiqueta', '85>10'),
    ('ficha_etiqueta', '86>7'),
    ('ficha_etiqueta', '1>10'),
    ('ficha_etiqueta', '60>6'),
    ('ficha_etiqueta', '87>6'),
    ('ficha_etiqueta', '88>6'),
    ('ficha_etiqueta', '5>8'),
    ('ficha_etiqueta', '20>6'),
    ('ficha_etiqueta', '11>6'),
    ('ficha_etiqueta', '14>6'),
    ('ficha_etiqueta', '36>6'),
    ('ficha_etiqueta', '2>10'),
    ('ficha_etiqueta', '66>10'),
    ('ficha_etiqueta', '12>7'),
    ('ficha_etiqueta', '25>7'),
    ('ficha_etiqueta', '3>11'),
    ('ficha_etiqueta', '4>11'),
    ('ficha_etiqueta', '8>10')
),
actual_links(relation_name, relation_key) AS (
  SELECT 'menu_plantilla'::text relation_name, id_menu::text || '>' || id_plantilla::text relation_key FROM public.menu
UNION ALL
SELECT 'ficha_menu', id_ficha::text || '>' || id_menu::text FROM public.ficha
UNION ALL
SELECT 'multimedia_ficha', id_multi::text || '>' || id_ficha::text FROM public.multimedia
UNION ALL
SELECT 'relacion_ficha', id_relacion::text || '>' || id_ficha_origen::text || '>' || id_ficha_destino::text FROM public.relacion_ficha
UNION ALL
SELECT 'ficha_etiqueta', id_ficha::text || '>' || id_etiqueta::text FROM public.ficha_etiqueta
)
SELECT
  e.relation_name,
  (SELECT count(*) FROM expected_links x WHERE x.relation_name = e.relation_name) AS backup_links,
  (SELECT count(*) FROM actual_links x WHERE x.relation_name = e.relation_name) AS live_links,
  COALESCE((
    SELECT array_agg(x.relation_key ORDER BY x.relation_key)
    FROM expected_links x
    LEFT JOIN actual_links a USING (relation_name, relation_key)
    WHERE x.relation_name = e.relation_name AND a.relation_key IS NULL
  ), ARRAY[]::text[]) AS missing_or_changed_links,
  COALESCE((
    SELECT array_agg(a.relation_key ORDER BY a.relation_key)
    FROM actual_links a
    LEFT JOIN expected_links x USING (relation_name, relation_key)
    WHERE a.relation_name = e.relation_name AND x.relation_key IS NULL
  ), ARRAY[]::text[]) AS added_or_changed_links
FROM (SELECT DISTINCT relation_name FROM expected_links) e
ORDER BY e.relation_name;

-- Metadatos de sincronización/storage presentes hoy; no lee valores de contenido.
-- Incluye metadatos de multimedia y portadas con los nombres reales del preparador.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('plantilla', 'menu', 'ficha', 'etiqueta', 'multimedia', 'relacion_ficha', 'ficha_etiqueta')
  AND (
    column_name LIKE 'sync_%'
    OR column_name IN (
      'storage_key', 'checksum_sha256', 'mime_type', 'tamano_bytes',
      'imagen_storage_key', 'imagen_checksum_sha256', 'imagen_mime_type',
      'imagen_tamano_bytes', 'size_bytes'
    )
  )
ORDER BY table_name, ordinal_position;

-- Presencia de las tablas auxiliares requeridas por el protocolo.
SELECT requerida.nombre AS tabla_requerida,
       (actual.table_name IS NOT NULL) AS existe
FROM (VALUES ('sync_eventos'), ('sync_dispositivos'), ('sync_conflictos')) AS requerida(nombre)
LEFT JOIN information_schema.tables AS actual
  ON actual.table_schema = 'public'
 AND actual.table_name = requerida.nombre
ORDER BY requerida.nombre;
