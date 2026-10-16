# Migración de usuarios a Supabase Auth

## Estado

El código de la rama ya tiene el middleware y el panel preparados para usar Supabase Auth. Esto todavía no significa que las cuentas actuales hayan sido migradas ni que el cambio esté listo para producción.

La autenticación requiere estas variables de entorno en Render:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (o `SUPABASE_ANON_KEY`), para el navegador
- `SUPABASE_SERVICE_ROLE_KEY` (o `SUPABASE_SECRET_KEY`), exclusivamente para el backend

No publiques ni compartas la clave de servicio/secret. Nunca debe llegar al navegador. Si una clave secreta se expone, debe rotarse y actualizarse en todos los entornos.

## Pasos seguros para las cuentas existentes

1. **No despliegues este cambio todavía.** El login de producción sigue siendo el de la versión desplegada hasta que la rama se integre y Render despliegue deliberadamente la versión nueva.
2. En Supabase Auth, prepara una cuenta para cada usuario definitivo del sistema. Las contraseñas de Firebase no se copian automáticamente; coordina invitaciones, contraseñas temporales o restablecimientos de contraseña. Conserva los perfiles y sus roles en `public.usuario`.
3. Ejecuta primero `scripts/verificar-usuarios-supabase-auth.sql` en el SQL Editor de Supabase. Es un script de solo lectura; indica cuántos perfiles tienen una cuenta Auth con el mismo email y muestra los perfiles que todavía no coinciden.
4. No ejecutes la migración de vinculación hasta que los perfiles que deban acceder tengan una cuenta en Supabase Auth y las coincidencias por email hayan sido revisadas. Las cuentas de prueba no deben convertirse automáticamente en las cuentas definitivas del museo.
5. Antes de la migración, realiza y verifica una copia de seguridad. Revisa `scripts/migrar-usuarios-a-supabase-auth.sql`: agrega `supabase_uid` y lo relaciona por email con `auth.users`; si encuentra perfiles sin cuenta coincidente, aborta la transacción. **Conserva `firebase_uid` en esta primera etapa** para permitir una reversión mientras se valida la nueva autenticación.
6. Después de la vinculación, valida inicio de sesión, cierre de sesión, rutas por rol, usuario desactivado, creación/edición/eliminación de usuarios y protección del último administrador en un entorno controlado antes de desplegar.
7. Solo después de que la nueva autenticación haya sido validada en producción y ya no se necesite la reversión debe prepararse una migración separada para retirar `firebase_uid`.

## Datos existentes de producción

El script `scripts/migrar-supabase.js` es el antiguo importador de datos desde SQLite y exige que las tablas destino estén vacías. **No lo ejecutes contra la base de Supabase que ya contiene datos**, porque está diseñado para una migración inicial, no para actualizar una base ya poblada.

La eliminación de Firebase Auth es un cambio independiente de la migración de menús, fichas y archivos multimedia. No borres usuarios ni ejecutes SQL destructivo solo para probar la aplicación.

## Auditoría de datos y archivos

Antes de declarar completa la migración, ejecuta en un entorno local seguro:

```bash
node scripts/verificar-supabase-completo.js
```

Este informe usa consultas de solo lectura y el listado de Storage. Presenta conteos de tablas, cantidad de archivos en el bucket y categorías de las rutas de imágenes (Supabase Storage, rutas antiguas, URL externas y otras rutas), sin mostrar URLs individuales ni modificar datos. Requiere `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y, opcionalmente, `SUPABASE_BUCKET`. No subas el archivo `.env` ni compartas las credenciales.

La auditoría no demuestra por sí sola que cada archivo se pueda descargar en el navegador; después de revisar sus conteos se debe probar una muestra de URL pública y realizar una carga de prueba controlada. El script no crea, reemplaza ni borra archivos.
