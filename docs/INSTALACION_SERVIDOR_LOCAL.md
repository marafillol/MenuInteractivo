# Instalación de una réplica local del Museo

> **Estado: procedimiento técnico en preparación.** Esta guía describe cómo aislar una SQLite nueva y arrancar la aplicación local. No autoriza conectar el museo a Supabase ni habilitar sincronización con datos reales. El esquema vivo de Supabase todavía no está preparado y el bootstrap debe permanecer bloqueado hasta completar la reconciliación, el backfill de Storage y una migración revisada.

## 1. Requisitos del equipo servidor

- Windows 10/11 de 64 bits (o un entorno compatible con Node.js).
- Node.js 22 LTS y npm.
- Acceso de administrador para instalar dependencias y configurar el Firewall de Windows.
- Una carpeta de instalación con el código del proyecto.
- Espacio suficiente para la SQLite y la carpeta `imagenes/`.
- Dirección IP fija o reserva DHCP en la LAN del museo.

Los tótems y puestos de consulta deben acceder al equipo servidor por la red local. No se debe exponer el puerto de la aplicación a Internet.

## 2. Preparar la carpeta de instalación

1. Obtener una copia del código de la rama que haya sido aprobada para instalar (no usar una rama de pruebas como si fuera producción).
2. Abrir PowerShell en la carpeta del proyecto.
3. Instalar dependencias:

```powershell
npm ci
```

4. Crear una carpeta de datos fuera del repositorio, por ejemplo:

```powershell
New-Item -ItemType Directory -Force "C:\MuseoDatos"
```

No copiar `database/museo.db` ni usarlo como punto de partida. La réplica nueva debe crearse vacía; tampoco copiar respaldos o archivos personales dentro del repositorio.

## 3. Configuración local

Crear un archivo `.env` en la carpeta del proyecto (no subirlo a Git). Para una instalación local nueva, configurar:

```dotenv
MODO_SERVIDOR=local
LOCAL_AUTH_SECRET=REEMPLAZAR_POR_UN_SECRETO_ALEATORIO_DE_32_CARACTERES_O_MAS
DATABASE_SQLITE_PATH=C:\\MuseoDatos\\museo-local.db
PORT=3000
```

Generar un secreto aleatorio propio para esa instalación. No reutilizar el secreto de otro equipo ni compartirlo en mensajes, capturas o commits. El modo local requiere al menos 32 caracteres.

La aplicación usa la ruta indicada por `DATABASE_SQLITE_PATH`. Si se omite, el adaptador SQLite usa la ruta histórica del proyecto; por eso **no iniciar el servidor en el equipo del museo sin configurar explícitamente esta variable**.

## 4. Crear y preparar la SQLite vacía

Primero crear el archivo vacío de destino (si no existe):

```powershell
$env:DATABASE_SQLITE_PATH = "C:\MuseoDatos\museo-local.db"
node -e "require('dotenv').config(); const db=require('./src/database'); db.preparar().then(()=>db.close()).catch(e=>{console.error(e);process.exitCode=1;});"
```

En la misma sesión de PowerShell, cargar las variables de autorización de esquema solo para esta preparación local:

```powershell
$env:SYNC_ALLOW_SCHEMA_MIGRATION = "true"
$env:SYNC_SCHEMA_CONFIRMATION = "I_HAVE_A_BACKUP_AND_APPROVE"
npm run sync:preparar
Remove-Item Env:SYNC_ALLOW_SCHEMA_MIGRATION
Remove-Item Env:SYNC_SCHEMA_CONFIRMATION
```

El comando prepara metadatos y tablas auxiliares en la ruta explícita. No asigna identidades compartidas a registros históricos y no copia contenido de Supabase. La ruta debe seguir siendo la SQLite nueva de `C:\MuseoDatos`; nunca apuntar a `database/museo.db`.

Si el comando falla, detenerse y conservar el error completo. No probar rutas alternativas ni quitar las protecciones del script.

## 5. Verificación local antes de habilitar la LAN

Con la configuración anterior, iniciar:

```powershell
npm start
```

El servidor escucha en `0.0.0.0` y en el puerto configurado. Desde el propio equipo verificar:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

La respuesta esperada debe indicar `servidor: true`, `baseDeDatos: true` y `modo: local`. Si no se obtiene ese resultado, no habilitar los tótems.

Para que otro equipo de la LAN acceda, permitir TCP entrante únicamente en el perfil de red privada y en el puerto elegido. Usar la IP LAN del servidor, por ejemplo `http://IP-DEL-SERVIDOR:3000/visita/`. No crear reglas de exposición pública ni redirecciones en el router.

## 6. Inicialización del contenido y sincronización

El comando disponible para importar una instantánea es:

```powershell
npm run sync:inicializar-offline
```

**No ejecutarlo todavía en el museo.** Solo debe usarse sobre una SQLite nueva y descartable, después de que el servidor remoto haya sido preparado y aprobado. Requiere `SYNC_REMOTE_URL` y `SYNC_SHARED_SECRET`; el servidor remoto debe disponer de todas las identidades compartidas y metadatos binarios verificables.

La auditoría de solo lectura del 11/11/2026 detectó que el Supabase vivo aún no tenía las columnas/tablas de sincronización ni los metadatos requeridos de Storage. El bootstrap falla de forma cerrada en ese estado. No se debe asignar UUID por separado en cada nodo, saltar la validación, copiar la SQLite antigua ni activar el envío de la outbox antes de completar la instantánea.

Antes de habilitar sincronización real quedan obligatorios:
- reconciliar identidades históricas y las altas posteriores al backup;
- preparar y revisar una migración PostgreSQL específica para producción, con backup y rollback;
- verificar hashes y claves de Storage para todas las portadas y archivos activos;
- validar el intercambio con un entorno de staging controlado;
- aprobar expresamente cualquier cambio sobre Supabase o el despliegue.

## 7. Operación y recuperación

- Mantener la SQLite, multimedia y respaldos fuera del repositorio.
- Hacer copias consistentes de la base y de las carpetas de imágenes; no copiar solo el archivo SQLite mientras la aplicación escribe.
- No borrar `database/.sync-pending` ni `database/.sync-pending-covers` mientras existan eventos pendientes.
- Si hay conflictos o errores de sincronización, mantener el equipo funcionando localmente y conservar logs; no borrar la outbox ni reiniciar cursores manualmente.
- No reemplazar una SQLite existente con otra instantánea. El bootstrap rechaza bases que ya contienen contenido.
- Mantener los equipos de visitantes en la LAN privada y sin acceso directo a la base de datos.

## 8. Estado de validación

Las pruebas automatizadas actuales se ejecutan con SQLite temporal y PostgreSQL descartable. La integración HTTP bidireccional valida eventos, reintentos, conflictos y transferencia con un adaptador de Storage simulado. **No equivale a una prueba contra el proyecto Supabase ni contra Storage de producción.**

Esta guía no declara la instalación de museo terminada. El despliegue local y la sincronización real deben habilitarse después de completar los bloqueos del apartado 6 y obtener aprobación.
