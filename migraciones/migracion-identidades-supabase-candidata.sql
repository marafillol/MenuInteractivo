-- CANDIDATO DE SOLO REVISION. NO APLICAR EN PRODUCCION.
-- Fuente: supabase_backup.sql. UUIDv5 deterministas por entidad + PK.
-- Requiere el esquema de sincronizacion ya preparado en una copia aislada.
-- No importa desde SQLite, no altera contenido ni Storage.
-- ROLLBACK final deliberado: ninguna escritura queda persistida.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.plantilla ADD COLUMN IF NOT EXISTS sync_id uuid;
ALTER TABLE public.plantilla ADD COLUMN IF NOT EXISTS sync_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.plantilla ADD COLUMN IF NOT EXISTS sync_deleted_at timestamptz;
ALTER TABLE public.menu ADD COLUMN IF NOT EXISTS sync_id uuid;
ALTER TABLE public.menu ADD COLUMN IF NOT EXISTS sync_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.menu ADD COLUMN IF NOT EXISTS sync_deleted_at timestamptz;
ALTER TABLE public.ficha ADD COLUMN IF NOT EXISTS sync_id uuid;
ALTER TABLE public.ficha ADD COLUMN IF NOT EXISTS sync_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.ficha ADD COLUMN IF NOT EXISTS sync_deleted_at timestamptz;
ALTER TABLE public.etiqueta ADD COLUMN IF NOT EXISTS sync_id uuid;
ALTER TABLE public.etiqueta ADD COLUMN IF NOT EXISTS sync_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.etiqueta ADD COLUMN IF NOT EXISTS sync_deleted_at timestamptz;
ALTER TABLE public.multimedia ADD COLUMN IF NOT EXISTS sync_id uuid;
ALTER TABLE public.multimedia ADD COLUMN IF NOT EXISTS sync_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.multimedia ADD COLUMN IF NOT EXISTS sync_deleted_at timestamptz;
ALTER TABLE public.relacion_ficha ADD COLUMN IF NOT EXISTS sync_id uuid;
ALTER TABLE public.relacion_ficha ADD COLUMN IF NOT EXISTS sync_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.relacion_ficha ADD COLUMN IF NOT EXISTS sync_deleted_at timestamptz;

DO $$ BEGIN
 IF (SELECT COUNT(*) FROM public.plantilla) <> 3 THEN RAISE EXCEPTION 'Conteo inesperado: plantilla'; END IF;
 IF EXISTS (SELECT 1 FROM public.plantilla WHERE sync_id IS NOT NULL) THEN RAISE EXCEPTION 'sync_id preexistente en plantilla; detener'; END IF;
 IF (SELECT COUNT(*) FROM public.menu) <> 3 THEN RAISE EXCEPTION 'Conteo inesperado: menu'; END IF;
 IF EXISTS (SELECT 1 FROM public.menu WHERE sync_id IS NOT NULL) THEN RAISE EXCEPTION 'sync_id preexistente en menu; detener'; END IF;
 IF (SELECT COUNT(*) FROM public.ficha) <> 55 THEN RAISE EXCEPTION 'Conteo inesperado: ficha'; END IF;
 IF EXISTS (SELECT 1 FROM public.ficha WHERE sync_id IS NOT NULL) THEN RAISE EXCEPTION 'sync_id preexistente en ficha; detener'; END IF;
 IF (SELECT COUNT(*) FROM public.etiqueta) <> 5 THEN RAISE EXCEPTION 'Conteo inesperado: etiqueta'; END IF;
 IF EXISTS (SELECT 1 FROM public.etiqueta WHERE sync_id IS NOT NULL) THEN RAISE EXCEPTION 'sync_id preexistente en etiqueta; detener'; END IF;
 IF (SELECT COUNT(*) FROM public.multimedia) <> 21 THEN RAISE EXCEPTION 'Conteo inesperado: multimedia'; END IF;
 IF EXISTS (SELECT 1 FROM public.multimedia WHERE sync_id IS NOT NULL) THEN RAISE EXCEPTION 'sync_id preexistente en multimedia; detener'; END IF;
 IF (SELECT COUNT(*) FROM public.relacion_ficha) <> 1 THEN RAISE EXCEPTION 'Conteo inesperado: relacion_ficha'; END IF;
 IF EXISTS (SELECT 1 FROM public.relacion_ficha WHERE sync_id IS NOT NULL) THEN RAISE EXCEPTION 'sync_id preexistente en relacion_ficha; detener'; END IF;
 IF (SELECT COUNT(*) FROM public.ficha_etiqueta) <> 34 THEN RAISE EXCEPTION 'Conteo inesperado: ficha_etiqueta'; END IF;
 IF EXISTS (SELECT 1 FROM public.ficha_etiqueta WHERE sync_id IS NOT NULL) THEN RAISE EXCEPTION 'sync_id preexistente en ficha_etiqueta; detener'; END IF;
END $$;

WITH v(id, sid) AS (VALUES
 (2, '1d41aa25-84fa-5771-bd86-80cfca2c1519'::uuid),
 (3, '707bf794-a1af-5324-b7af-363772c369b9'::uuid),
 (1, 'ca014f0e-f71a-5031-b0b3-30312ff69e0a'::uuid)
)
UPDATE public.plantilla AS dst SET sync_id=v.sid, sync_version=1, sync_deleted_at=NULL FROM v WHERE dst.id_plantilla=v.id AND dst.sync_id IS NULL;

WITH v(id, sid) AS (VALUES
 (23, '777ff3e2-01b8-5cc5-a3dd-00bbf01c2b82'::uuid),
 (2, '7daef882-9781-5430-ba2a-308b12954fde'::uuid),
 (1, 'e0a3d2db-a5b1-5e6e-953e-cd0695d0fe37'::uuid)
)
UPDATE public.menu AS dst SET sync_id=v.sid, sync_version=1, sync_deleted_at=NULL FROM v WHERE dst.id_menu=v.id AND dst.sync_id IS NULL;

WITH v(id, sid) AS (VALUES
 (15, '4c3effdb-a0c7-588a-bab5-860f40295907'::uuid),
 (19, '37e6a1e4-0150-5282-8d46-bd5e7c3c4968'::uuid),
 (21, '881979da-d3cb-596c-9a8a-9e5cf7b5d197'::uuid),
 (5, '0e71d954-1728-5bcc-97de-800c2f5c0e0e'::uuid),
 (7, '7d78b910-d8ea-5073-8edd-4f5adf948d34'::uuid),
 (11, '72bee9be-17bf-5f01-ab31-b1bdc51c20e6'::uuid),
 (12, 'b204f1a7-91b0-573f-a863-b2246345350a'::uuid),
 (9, 'c3fa3845-43fc-56a3-8cdc-e2910568d7da'::uuid),
 (20, '2a7d5108-8d5e-543a-b98a-26804020b61d'::uuid),
 (10, '447f9e5e-3432-59f1-b6e9-e717392e1891'::uuid),
 (13, 'ef6381b4-63a0-54e3-9819-1f55e4adad2c'::uuid),
 (6, '072fa982-5664-595e-b8a6-15c844823aa9'::uuid),
 (22, 'd8d44951-15d5-52e9-b39c-cad458cff744'::uuid),
 (24, '0b15b492-0f17-55ef-ae7c-e29b9eddf2fa'::uuid),
 (26, '3d8cb125-6692-5122-9c6e-917a01e59fb0'::uuid),
 (32, '841cb584-434f-5333-a2e9-2bbac4d2c607'::uuid),
 (33, 'afe0b8fc-f8da-5618-b313-18e86b341f5d'::uuid),
 (23, 'e2492350-2bd6-5be1-ad1f-d4a1f8655ce4'::uuid),
 (25, '7d358162-525c-50fc-baba-3a3e3b675a62'::uuid),
 (29, '087905b9-8720-5806-a448-f7ff52e7154e'::uuid),
 (28, '7fb27369-4a95-5d8b-85a1-7c90dafb92da'::uuid),
 (35, '53f16346-b310-53f6-811d-9b16bde14843'::uuid),
 (59, 'b6fcd5d9-8e66-58ff-a18c-75112c8b072d'::uuid),
 (18, 'b6939119-1fe5-5205-b537-a4eaca218a21'::uuid),
 (27, '113ac2ba-c0f3-52eb-a6b8-2287c96bd80b'::uuid),
 (34, '64e2a0d6-df00-5c6e-b55e-84356d287261'::uuid),
 (2, '687e4427-6028-503a-bb80-77e641f2e86b'::uuid),
 (1, 'e247d534-5dc2-5513-b16e-fb14ededcedb'::uuid),
 (14, 'c195a7d5-ecbd-55c6-8e0c-4ed4222aea2a'::uuid),
 (36, '647c302f-dc04-5dc0-ab12-f3213818caeb'::uuid),
 (66, '2ee1f658-2e99-5af6-875e-e7a5457098b9'::uuid),
 (67, '7e90a0d5-5489-5741-a6a5-f3a1e1d69390'::uuid),
 (68, '8f1e4ffa-6183-5d10-b1d9-85dfd4f722a7'::uuid),
 (3, '92312183-7621-5b80-b3ff-eb276c833cd3'::uuid),
 (4, '4b81e54a-5f88-56b9-b8d7-1302cd26b42b'::uuid),
 (8, '573a2f0b-2851-52f8-a112-93fca0b9b91f'::uuid),
 (71, '3157957f-9d71-5a78-be49-62ed06d68084'::uuid),
 (72, '3b3689c4-5d8b-59ae-9a94-96b7b970f2dd'::uuid),
 (73, 'dffe611f-5343-54e9-8ec9-7099e8bf2dec'::uuid),
 (74, '8ebe9b8b-df86-5eda-88d3-08552e5fd018'::uuid),
 (75, 'ae32eaa6-2332-5502-bf4c-24083ff8481b'::uuid),
 (76, 'f43b6a42-be66-54fb-b4ee-a27aa325ff79'::uuid),
 (77, '247ecf0e-f5f7-5074-a0e9-28a0c7f646c7'::uuid),
 (78, '87fde7b6-e065-5154-a548-fd142e89c4f5'::uuid),
 (79, 'f9a7e1b6-a26a-53f3-9808-5386487aeff3'::uuid),
 (80, '05d5bb12-219b-5b7d-a738-8905696a8528'::uuid),
 (81, '358b609f-532c-5103-afc6-b64396216b1b'::uuid),
 (82, '39f78c9d-ba4d-5916-8f2b-85b45d218f3f'::uuid),
 (83, '943f3599-9956-5b29-8117-3a441d27deb9'::uuid),
 (84, '5c019db6-5be3-5e7c-a731-85e9e32be979'::uuid),
 (85, 'ee1a9613-19d0-5a9d-9789-f09290422db7'::uuid),
 (86, '66b5636c-9cbb-5ebf-a326-53ed57cbb5ee'::uuid),
 (60, 'a5d46268-2472-5b01-9d96-68eb1890c8c7'::uuid),
 (87, '4ff26f55-ec9f-579b-99bf-cee27cbfa9d1'::uuid),
 (88, '6410ec5b-e5e6-57ed-8057-a74a064b9ac0'::uuid)
)
UPDATE public.ficha AS dst SET sync_id=v.sid, sync_version=1, sync_deleted_at=NULL FROM v WHERE dst.id_ficha=v.id AND dst.sync_id IS NULL;

WITH v(id, sid) AS (VALUES
 (6, '17c946c3-fb9d-5b19-96ff-316610c6c2a8'::uuid),
 (10, 'cc9ba65b-c32e-55ba-b622-6519b6729e61'::uuid),
 (11, '034051b0-bbe0-56b7-8870-8b4e8fdcb8fe'::uuid),
 (8, '71b82a2b-2383-50c6-8d17-c2a04f52c15d'::uuid),
 (7, 'bc08012d-e550-5f4e-8332-15f5d2121272'::uuid)
)
UPDATE public.etiqueta AS dst SET sync_id=v.sid, sync_version=1, sync_deleted_at=NULL FROM v WHERE dst.id_etiqueta=v.id AND dst.sync_id IS NULL;

WITH v(id, sid) AS (VALUES
 (4, '61584dcf-3f3c-5777-a6ba-9b5584a7a84d'::uuid),
 (5, '1d3c555b-df28-5190-9191-210f80a56ebd'::uuid),
 (7, '7827a192-d914-5d58-92d8-1e23c483ce05'::uuid),
 (8, '1e125396-f4a0-5363-a568-8ecbb74e6129'::uuid),
 (9, 'a308f783-06b7-512c-ac81-a499b97d91ff'::uuid),
 (11, 'ebbabb78-94c2-5830-8f2a-e9a6f300d565'::uuid),
 (12, 'e2fe8ef3-385d-57b2-9320-0c8c469a514b'::uuid),
 (13, '08291d13-ee0a-5316-940d-5a86a269422d'::uuid),
 (14, '8e6fb9fc-61bb-570a-a5c7-641347eb28d1'::uuid),
 (16, '6d00c07b-ebe3-5ff2-b771-9c2807709ac5'::uuid),
 (1, '88468c48-5667-5803-8c60-85dca88b4a2d'::uuid),
 (15, 'cf5488e3-9d8c-5f77-bb41-87796f47881f'::uuid),
 (39, '12fbb88f-02fa-5feb-b120-550396e12f6e'::uuid),
 (40, '180a5d0c-04f1-5b9e-8659-ecbbd34e61f3'::uuid),
 (6, '76c2c19c-f3ac-550d-acc0-7aa9d8fdc0a3'::uuid),
 (2, 'd80bdef0-c4ab-579d-a795-f9e9f8c88f5a'::uuid),
 (10, '565b2f4a-2d20-558b-87bb-5a82127782b3'::uuid),
 (41, '04a86a8f-3cef-586b-ba86-af75fcebad92'::uuid),
 (42, '0edf60aa-dd83-5ece-8129-2d77d88fc228'::uuid),
 (3, '77a3e5ac-b3c7-5085-9f16-d57491e89ade'::uuid),
 (48, '7546765e-e566-5e5a-9bf6-c09718723edf'::uuid)
)
UPDATE public.multimedia AS dst SET sync_id=v.sid, sync_version=1, sync_deleted_at=NULL FROM v WHERE dst.id_multi=v.id AND dst.sync_id IS NULL;

WITH v(id, sid) AS (VALUES
 (1, '2674fa0d-8ef9-581e-8cdf-5ec0f7bf56ff'::uuid)
)
UPDATE public.relacion_ficha AS dst SET sync_id=v.sid, sync_version=1, sync_deleted_at=NULL FROM v WHERE dst.id_relacion=v.id AND dst.sync_id IS NULL;

WITH v(id_ficha, id_etiqueta, sid) AS (VALUES
 (7, 6, '8e368511-4432-5b43-92cc-34993fb1ee33'::uuid),
 (7, 7, '313fae87-360d-5cfa-9c39-d62d7899dd44'::uuid),
 (7, 8, '41818bc4-7953-5928-9369-027d730cde23'::uuid),
 (72, 11, '7205574c-d639-55ac-ae35-0901cd7efe3f'::uuid),
 (73, 11, '4f234caf-5a59-59a1-a424-9697a9982209'::uuid),
 (74, 11, 'e6d63734-4f1c-526b-977b-d234478ffcb5'::uuid),
 (76, 11, '43a7e90d-2aea-5903-b1f1-4f09f995d2b8'::uuid),
 (78, 10, '8023f4d4-7a23-50ba-8a18-df5bff168609'::uuid),
 (79, 7, 'fa5aafe0-0b57-58ee-a5b5-898a4a17273e'::uuid),
 (80, 7, 'ef0b0731-89c8-5595-9042-731443aa4b93'::uuid),
 (28, 11, '1299e9a4-6deb-59ef-b8c2-8d54f68862c1'::uuid),
 (81, 11, '4566d651-0f19-540f-907f-769e7c0713d1'::uuid),
 (82, 10, '100b217d-50aa-53d7-9f7f-8af6877b1f02'::uuid),
 (83, 7, '5fc4c9bf-5d27-5a98-86d7-34dfeedfc863'::uuid),
 (84, 6, '0080cb2c-a72d-5a23-b03a-89b1bb10e87c'::uuid),
 (85, 7, '8a251113-ba1e-58a9-a098-73ef39289fc5'::uuid),
 (85, 10, '2df1520e-f441-50e1-ac89-98df0816c7d3'::uuid),
 (86, 7, '29dfeb6a-df92-5fd6-8a84-6110a94aa335'::uuid),
 (1, 10, 'e241c110-ad22-5902-914d-4427645a219d'::uuid),
 (60, 6, '5244b47f-88a3-5e3b-b90a-de4a1abfa501'::uuid),
 (87, 6, 'c5f5cfda-b756-546f-ab6f-9177bb8d332e'::uuid),
 (88, 6, 'cc57c832-c00e-533b-91dd-498a4af862e7'::uuid),
 (5, 8, '93f1f031-b7ec-53e6-beac-36bb4db0da26'::uuid),
 (20, 6, '2ab6c0b7-9d82-5d23-8042-5b7d1319c791'::uuid),
 (11, 6, '252b030c-5d96-52fa-ad52-d46a8811e30a'::uuid),
 (14, 6, 'cb2ad86b-328c-5cfc-af05-ac478b2993d8'::uuid),
 (36, 6, '59495f74-18f1-5dfd-8fef-01bbfbdee7fa'::uuid),
 (2, 10, '5f19b994-f728-586a-a605-4e05e2aa51b4'::uuid),
 (66, 10, '2e997e56-13ce-52df-a905-b4260d0d508a'::uuid),
 (12, 7, '3c0afd03-589e-5281-b54e-854b55244cbb'::uuid),
 (25, 7, 'ce79fd91-6116-509d-a94c-091a9df4d17a'::uuid),
 (3, 11, '850b49f6-a4cd-5e89-a0f7-778a3ea697d3'::uuid),
 (4, 11, 'e2c9a1ae-aabf-59f3-a2a8-cd2b502bfd44'::uuid),
 (8, 10, '0f8b86fe-08f4-550e-9790-bcd693a6f76f'::uuid)
)
UPDATE public.ficha_etiqueta AS dst SET sync_id=v.sid, sync_version=1, sync_deleted_at=NULL FROM v WHERE dst.id_ficha=v.id_ficha AND dst.id_etiqueta=v.id_etiqueta AND dst.sync_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_plantilla_sync_id ON public.plantilla(sync_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_menu_sync_id ON public.menu(sync_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ficha_sync_id ON public.ficha(sync_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_etiqueta_sync_id ON public.etiqueta(sync_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_multimedia_sync_id ON public.multimedia(sync_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_relacion_ficha_sync_id ON public.relacion_ficha(sync_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ficha_etiqueta_sync_id ON public.ficha_etiqueta(sync_id);

DO $$ DECLARE bad bigint; BEGIN
 SELECT COUNT(*) INTO bad FROM public.plantilla WHERE sync_id IS NULL OR sync_version < 1; IF bad <> 0 THEN RAISE EXCEPTION 'Identidades incompletas en plantilla: %', bad; END IF;
 SELECT COUNT(*) INTO bad FROM public.menu WHERE sync_id IS NULL OR sync_version < 1; IF bad <> 0 THEN RAISE EXCEPTION 'Identidades incompletas en menu: %', bad; END IF;
 SELECT COUNT(*) INTO bad FROM public.ficha WHERE sync_id IS NULL OR sync_version < 1; IF bad <> 0 THEN RAISE EXCEPTION 'Identidades incompletas en ficha: %', bad; END IF;
 SELECT COUNT(*) INTO bad FROM public.etiqueta WHERE sync_id IS NULL OR sync_version < 1; IF bad <> 0 THEN RAISE EXCEPTION 'Identidades incompletas en etiqueta: %', bad; END IF;
 SELECT COUNT(*) INTO bad FROM public.multimedia WHERE sync_id IS NULL OR sync_version < 1; IF bad <> 0 THEN RAISE EXCEPTION 'Identidades incompletas en multimedia: %', bad; END IF;
 SELECT COUNT(*) INTO bad FROM public.relacion_ficha WHERE sync_id IS NULL OR sync_version < 1; IF bad <> 0 THEN RAISE EXCEPTION 'Identidades incompletas en relacion_ficha: %', bad; END IF;
 SELECT COUNT(*) INTO bad FROM public.ficha_etiqueta WHERE sync_id IS NULL OR sync_version < 1; IF bad <> 0 THEN RAISE EXCEPTION 'Identidades incompletas en ficha_etiqueta: %', bad; END IF;
END $$;
ROLLBACK;