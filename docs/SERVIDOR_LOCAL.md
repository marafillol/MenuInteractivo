# Servidor local autónomo

Este modo permite que el museo funcione dentro de su red local sin Render, Supabase ni conexión a Internet.

## Qué se guarda en la PC del museo

- Base de datos: `database/museo.db`.
- Imágenes, videos, audios y documentos: `imagenes/`.
- Usuarios y contraseñas cifradas: tabla `usuario` de SQLite.

La opción de copia de seguridad del panel también trabaja solo con esos archivos en este modo; no consulta Storage de Supabase.

## Preparación inicial

1. Instalar Node.js LTS en la PC-servidor.
2. Copiar el proyecto completo, incluyendo `database/` e `imagenes/`.
3. En la carpeta del proyecto, ejecutar `npm.cmd install`.

Ese paso descarga las dependencias una sola vez. Luego el servidor carga los iconos, el editor de imágenes y las pantallas desde sus propios archivos locales.
4. Generar una clave privada para las sesiones:

```powershell
npm.cmd run generar-secreto-local
```

5. Crear un archivo `.env` con el resultado del paso anterior:

```env
MODO_SERVIDOR=local
LOCAL_AUTH_SECRET=reemplazar-por-una-clave-larga-aleatoria-de-al-menos-32-caracteres
```

La clave es exclusiva de la PC-servidor: no se publica en GitHub ni se comparte fuera del equipo responsable.

6. Crear o actualizar el primer administrador local:

```powershell
npm.cmd run crear-admin-local -- "Nombre Administrador" correo@ejemplo.com "UnaClaveSeguraDe8Caracteres"
```

7. Iniciar el servidor:

```powershell
npm.cmd start
```

En Windows también se puede abrir `iniciar-servidor-local.cmd` con doble clic. La ventana debe permanecer abierta mientras el museo usa el sistema.

## Uso en la red del museo

- En la PC-servidor: `http://localhost:3000/`.
- En otros equipos de la misma red: `http://IP-DE-LA-PC:3000/`.
- Vista visitante: `http://IP-DE-LA-PC:3000/visita/`.

La PC-servidor debe tener una IP fija o una reserva de IP en el router para que las direcciones no cambien.

## Copias de seguridad

Copiar diariamente estas dos ubicaciones a un disco externo:

- `database/museo.db`
- `imagenes/`

Probá periódicamente restaurar una copia en otra carpeta antes de depender de ella.

## Render y Supabase

Para la versión online, configurá `MODO_SERVIDOR=supabase` junto con las variables de Supabase actuales. El modo local ignora esas variables y no realiza conexiones externas.
