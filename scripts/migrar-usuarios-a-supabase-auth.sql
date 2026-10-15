-- Ejecutar manualmente en Supabase SQL Editor SOLO después de importar las cuentas a Supabase Auth.
-- No crea ni elimina cuentas Auth. No continuar si falta vincular algún perfil.
BEGIN;

ALTER TABLE public.usuario
    ADD COLUMN IF NOT EXISTS supabase_uid UUID;

UPDATE public.usuario AS perfil
SET supabase_uid = cuenta.id
FROM auth.users AS cuenta
WHERE perfil.supabase_uid IS NULL
  AND lower(perfil.email) = lower(cuenta.email);

DO $$
DECLARE
    perfiles_sin_cuenta INTEGER;
BEGIN
    SELECT COUNT(*) INTO perfiles_sin_cuenta
    FROM public.usuario
    WHERE supabase_uid IS NULL;

    IF perfiles_sin_cuenta > 0 THEN
        RAISE EXCEPTION
            'Migración cancelada: quedan % perfiles sin cuenta en Supabase Auth. Importá o creá esas cuentas y volvé a ejecutar.',
            perfiles_sin_cuenta;
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS usuario_supabase_uid_unique
    ON public.usuario (supabase_uid);

-- Solo se elimina el identificador antiguo cuando todos los perfiles ya quedaron asociados.
ALTER TABLE public.usuario
    DROP COLUMN IF EXISTS firebase_uid;

COMMIT;
