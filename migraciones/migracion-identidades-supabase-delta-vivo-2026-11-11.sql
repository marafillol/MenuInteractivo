-- CANDIDATO DE SOLO REVISION. NO APLICAR EN PRODUCCION.
-- Complementa el backfill historico del backup 2026-11-10.
-- Fuente: lectura SELECT de Supabase vivo el 2026-11-11.
-- Las identidades se derivan con UUIDv5(namespace, entidad || ':' || PK natural).
-- Incluye cuatro fichas nuevas (89-92) y cinco asociaciones ausentes del dump:
-- (33,6), (89,10), (90,7), (91,6), (92,7).
-- Requiere que el backfill historico base haya sido aplicado y que sus sync_id
-- estén presentes en plantilla/menu/etiqueta y en las demás filas históricas.
-- Esta prueba termina en ROLLBACK deliberadamente.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.ficha) <> 59 THEN
    RAISE EXCEPTION 'Conteo vivo inesperado en ficha; se esperaba 59';
  END IF;
  IF (SELECT COUNT(*) FROM public.ficha_etiqueta) <> 39 THEN
    RAISE EXCEPTION 'Conteo vivo inesperado en ficha_etiqueta; se esperaba 39';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.ficha
    WHERE id_ficha IN (89,90,91,92) AND sync_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Una ficha delta ya tiene sync_id; detener para revisar';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.ficha_etiqueta
    WHERE (id_ficha,id_etiqueta) IN ((33,6),(89,10),(90,7),(91,6),(92,7))
      AND sync_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Una asociacion delta ya tiene sync_id; detener para revisar';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.menu WHERE id_menu=1 AND sync_id IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.etiqueta WHERE id_etiqueta IN (6,7,10) AND sync_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Faltan identidades de padres del backfill historico';
  END IF;
END $$;

UPDATE public.ficha
SET sync_id = v.sync_id, sync_version = 1, sync_deleted_at = NULL
FROM (VALUES
  (89, '1e767600-0128-5594-9ee9-7f8977af6093'::uuid),
  (90, '6048126e-4a4f-54f7-9996-85790094962a'::uuid),
  (91, 'e7cfbac1-9709-50df-94fd-3770650ec339'::uuid),
  (92, '93256373-3612-5a42-ac91-fa74cf84d4c2'::uuid)
) AS v(id_ficha, sync_id)
WHERE public.ficha.id_ficha = v.id_ficha AND public.ficha.sync_id IS NULL;

UPDATE public.ficha_etiqueta
SET sync_id = v.sync_id, sync_version = 1, sync_deleted_at = NULL
FROM (VALUES
  (33, 6, '75e03d61-1027-582b-9fcf-aeb3a12a5aae'::uuid),
  (89,10, '4639536b-25e5-5a0c-86eb-dd911ef61133'::uuid),
  (90, 7, 'a4b6ea7a-3200-53a9-bc12-fc6ebf0f6a35'::uuid),
  (91, 6, '5ce910e4-42c1-5ccd-98f5-e222faeaccf2'::uuid),
  (92, 7, '35589c61-addd-5b1f-9c08-525f0a5f67b3'::uuid)
) AS v(id_ficha, id_etiqueta, sync_id)
WHERE public.ficha_etiqueta.id_ficha = v.id_ficha
  AND public.ficha_etiqueta.id_etiqueta = v.id_etiqueta
  AND public.ficha_etiqueta.sync_id IS NULL;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.ficha WHERE id_ficha IN (89,90,91,92) AND sync_id IS NOT NULL) <> 4 THEN
    RAISE EXCEPTION 'No se asignaron las cuatro identidades nuevas';
  END IF;
  IF (SELECT COUNT(*) FROM public.ficha_etiqueta
      WHERE (id_ficha,id_etiqueta) IN ((33,6),(89,10),(90,7),(91,6),(92,7))
        AND sync_id IS NOT NULL) <> 5 THEN
    RAISE EXCEPTION 'No se asignaron las cinco identidades de asociaciones';
  END IF;
  IF EXISTS (
    SELECT sync_id FROM (
      SELECT sync_id FROM public.ficha WHERE sync_id IS NOT NULL
      UNION ALL
      SELECT sync_id FROM public.ficha_etiqueta WHERE sync_id IS NOT NULL
    ) x GROUP BY sync_id HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Colision de UUID entre las entidades delta';
  END IF;
END $$;

ROLLBACK;
