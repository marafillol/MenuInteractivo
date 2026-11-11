# Inicialización segura de una réplica offline desde Supabase

## Objetivo

Una instalación SQLite nueva debe recibir una instantánea consistente de Supabase PostgreSQL antes de intercambiar eventos. Supabase es la fuente de verdad. La SQLite antigua no participa en la selección, corrección ni reconstrucción del contenido.

Este flujo no migra SQLite a Supabase y no modifica filas de PostgreSQL. El endpoint remoto solo lee datos y metadatos.

## Qué copia

La instantánea incluye, en orden de dependencia:

1. `plantilla`
2. `menu`
3. `ficha`
4. `etiqueta`
5. `ficha_etiqueta`
6. `relacion_ficha`
7. `multimedia`

Se conservan las claves enteras de origen, `sync_id`, `sync_version` y `sync_deleted_at`. Las relaciones se importan con los mismos extremos. `id_usuario` se establece en NULL en la réplica: usuarios, contraseñas, sesiones y credenciales no se replican. Las preferencias de `configuracion` locales se conservan; solo se escriben las claves de estado y cursor de sincronización.

## Consistencia del snapshot

El endpoint `POST /api/sync/v1/bootstrap/snapshot`:

- exige la misma credencial compartida del protocolo;
- solo funciona en el servidor PostgreSQL;
- exige que el esquema de sincronización esté preparado;
- inicia una transacción `REPEATABLE READ, READ ONLY`;
- bloquea en modo SHARE las tablas de contenido y `sync_eventos` durante la captura, evitando que una escritura de contenido/outbox quede a medio camino entre el snapshot y su cursor;
- devuelve el cursor máximo de `sync_eventos` junto con las filas observadas en ese punto consistente;
- valida identidades, versiones, referencias y metadatos multimedia antes de responder.

No crea UUID, no asigna identidades, no corrige relaciones ni escribe en PostgreSQL.

## Requisitos que bloquean la inicialización

La réplica no se inicializa si:

- falta algún `sync_id` o `sync_version` válido;
- hay referencias a padres inexistentes;
- hay multimedia activa sin `storage_key` y SHA-256;
- hay portadas activas sin clave de Storage y checksum;
- la SQLite local ya contiene filas de contenido, eventos o conflictos;
- no está preparado el esquema local.

Estos bloqueos son intencionales. No se completa una inicialización parcial ni se usa la base local antigua como fuente alternativa. Los registros históricos que todavía no tengan metadatos deberán resolverse en una etapa separada, revisada y autorizada, con Supabase como autoridad.

## Importación local

La inicialización se ejecuta de forma explícita, no automáticamente al iniciar el servidor. El cliente:

1. comprueba que la base local de destino esté vacía;
2. solicita y valida la instantánea;
3. descarga cada archivo activo desde Storage usando las claves y checksums recibidos;
4. rechaza archivos locales existentes si su contenido no coincide;
5. inserta todas las filas en una única transacción SQLite;
6. guarda el cursor del snapshot y marca `sync.bootstrap.estado=completo` en la misma transacción.

Si la importación falla, la transacción se revierte y se eliminan las descargas creadas durante ese intento. Una segunda ejecución sobre una base que ya contiene contenido se rechaza, no sobrescribe.

## Comando

Usar solamente en una instalación SQLite nueva o descartable. No apuntar a `database/museo.db` ni a una base que contenga información local que deba conservarse.

Variables necesarias:

- `MODO_SERVIDOR=local`
- `LOCAL_AUTH_SECRET` válido para la instalación
- `DATABASE_SQLITE_PATH` con la ruta explícita de la SQLite nueva
- `SYNC_REMOTE_URL` con la URL del servidor PostgreSQL
- `SYNC_SHARED_SECRET` compartido con el servidor

Preparar primero el esquema local en esa copia, con el procedimiento de preparación aprobado para instalaciones locales. Luego ejecutar:

```powershell
npm run sync:inicializar-offline
```

El comando no prepara ni migra Supabase. Si el servidor todavía no tiene el esquema, las identidades o los metadatos multimedia completos, la operación falla de forma cerrada.

## Barrera contra sincronización prematura

`sincronizarUnaVez()` no envía outbox ni solicita eventos entrantes mientras `sync.bootstrap.estado` no sea `completo`. El inicio automático puede ejecutarse, pero solo informa que la inicialización está pendiente y no transmite cambios de una SQLite vacía o antigua.

La inicialización es explícita para que una SQLite histórica no se confunda con una instalación nueva. No hay una acción de "vaciar y volver a copiar".

## Alcance y límites

- Este flujo prepara una réplica inicial de contenido; no sustituye el trabajo pendiente de verificación de archivos históricos.
- La captura remota requiere que todos los registros de contenido tengan identidades compartidas y que los archivos activos tengan metadatos binarios verificables.
- No se probó contra Supabase real ni contra Storage de producción.
- Las pruebas deben usar SQLite temporal y PostgreSQL descartable.
- No fusionar ni desplegar hasta completar pruebas de integración y revisar el procedimiento operativo del servidor del museo.
