-- SOLO LECTURA. Ejecutar en Supabase SQL Editor antes de vincular los perfiles a Supabase Auth.
-- No crea usuarios, no cambia contraseñas y no modifica tablas.

SELECT
    COUNT(*)::integer AS perfiles_aplicacion,
    COUNT(auth_user.id)::integer AS perfiles_con_cuenta_auth_por_email,
    (COUNT(*) - COUNT(auth_user.id))::integer AS perfiles_sin_cuenta_auth
FROM public.usuario AS perfil
LEFT JOIN auth.users AS auth_user
    ON lower(auth_user.email) = lower(perfil.email);

-- Muestra únicamente perfiles sin una cuenta de autenticación coincidente.
-- Revisar esta lista antes de ejecutar scripts/migrar-usuarios-a-supabase-auth.sql.
SELECT
    perfil.id_usuario,
    perfil.email,
    perfil.rol,
    perfil.activo
FROM public.usuario AS perfil
LEFT JOIN auth.users AS auth_user
    ON lower(auth_user.email) = lower(perfil.email)
WHERE auth_user.id IS NULL
ORDER BY perfil.id_usuario;
