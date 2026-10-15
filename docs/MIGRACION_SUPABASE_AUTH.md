# Migración de usuarios a Supabase Auth

## Estado

El código de la rama ya tiene el middleware y el panel preparados para usar Supabase Auth. Esto todavía no significa que las cuentas actuales hayan sido migradas ni que el cambio esté listo para producción.

La autenticación requiere estas variables de entorno en Render:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (o `SUPABASE_PUBLISHABLE_KEY`), para el navegador
- `SUPABASE_SERVICE_ROLE_KEY`, exclusivamente para el backend

No publiques ni compartas la clave de servicio. Nunca debe llegar al navegador.

## Pasos seguros para las cuentas existentes

1. **No despliegues este cambio todavía.** El login actual de producción sigue siendo Firebase hasta que la rama se integre y Render despliegue deliberadamente la versión nueva.
2. En Supabase Auth, prepara una cuenta para cada usuario existente del sistema. Las contraseñas de Firebase no se copian automáticamente: coordina invitaciones, contraseñas temporales o restablecimientos de contraseña. Conserva los perfiles y sus roles en `public.usuario`.
3. Ejecuta primero `scripts/verificar-usuarios-supabase-auth.sql` en el SQL Editor de Supabase. Es un script de solo lectura; indica cuántos perfiles tienen una cuenta Auth con el mismo email y muestra los perfiles que todavía no coinciden.
4. No ejecutes la migración de vinculación hasta que los perfiles que deban acceder tengan una cuenta en Supabase Auth y las coincidencias por email hayan sido revisadas.
5. Solo entonces revisa `scripts/migrar-usuarios-a-supabase-auth.sql`. Este script agrega `supabase_uid`, lo relaciona por email con `auth.users` y elimina `firebase_uid`; si encuentra perfiles sin cuenta coincidente, aborta la transacción. No lo ejecutes como prueba y no lo ejecutes antes de tener una copia de seguridad.
6. Tras la vinculación, valida inicio de sesión, cierre de sesión, rutas por rol, usuario desactivado, creación/edición de usuarios y protección del último administrador en un entorno controlado antes de desplegar.

## Datos existentes de producción

El script `scripts/migrar-supabase.js` es el antiguo importador de datos desde SQLite y exige que las tablas destino estén vacías. **No lo ejecutes contra la base de Supabase que ya contiene datos**, porque está diseñado para una migración inicial, no para actualizar una base ya poblada.

La eliminación de Firebase Auth es un cambio independiente de la migración de menús, fichas y archivos multimedia. No borres usuarios ni ejecutes SQL destructivo solo para probar la aplicación.
