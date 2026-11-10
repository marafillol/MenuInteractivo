# Base de bandeja de salida de sincronización

## Estado actual de esta rama

La rama incorpora la base transaccional de outbox y una primera integración funcional para plantillas, menús, fichas, etiquetas, asociaciones ficha-etiqueta y multimedia locales. Las operaciones replicables se registran transaccionalmente; las referencias padre deben tener `sync_id` reconciliados.

El protocolo incremental de eventos hacia/desde PostgreSQL ya tiene una primera implementación: intercambio autenticado por lotes, cursor por dispositivo, aplicación idempotente y registro de conflictos. No se ha completado la reconciliación inicial ni la transferencia binaria multimedia. No desplegar ni conectar a datos reales.

## Preparación local acotada

El script `scripts/preparar-outbox-fichas-local.js` prepara las columnas de sincronización de `plantilla`, `menu`, `ficha`, `etiqueta`, `ficha_etiqueta` y `multimedia`, sus índices y la tabla `sync_eventos` en SQLite local. Para multimedia agrega SHA-256, MIME, tamaño, clave lógica de Storage y campos auxiliares de seguimiento; no mueve ni sube archivos durante la preparación. Rechaza el modo Supabase.

Debe ejecutarse explícitamente con `MODO_SERVIDOR=local` y `DATABASE_SQLITE_PATH` apuntando a una copia descartable de la base. No ejecutar sobre la base real del museo sin backup y una decisión explícita de migración. Los `sync_id` existentes quedan NULL: no se inventan identificadores para registros históricos.

## Contrato de escritura

Toda operación que se quiera replicar ejecuta dentro de una misma llamada a `db.withTransaction()`:

1. La escritura del registro de negocio.
2. La actualización de `sync_version` y, cuando corresponda, `sync_deleted_at`.
3. La llamada a `registrarEvento(consultar, ...)` usando exactamente el callback transaccional recibido.

Si cualquiera de esos pasos falla, la transacción debe revertirse. No llamar al helper desde una conexión distinta ni después del COMMIT.

## Integración de fichas

`src/modelos/ficha.js` registra INSERT y UPDATE para fichas nuevas o reconciliadas. El payload referencia al menú mediante `menu_sync_id`, nunca mediante el ID entero local. Si el menú o la ficha histórica no tiene identidad reconciliada, la operación continúa localmente sin emitir un evento inválido.

Para fichas sincronizadas, la eliminación se representa como tombstone: se conserva la fila, se marca `sync_deleted_at`, se incrementa la versión y se registra DELETE en la misma transacción. Las consultas habituales de fichas excluyen tombstones. Las fichas históricas sin identidad mantienen el borrado local anterior.

## Integración de relaciones ficha-etiqueta

`src/modelos/fichaEtiquetaModelo.js` registra altas, bajas lógicas y reactivaciones de asociaciones cuando la ficha y todas las etiquetas involucradas ya tienen identidades reconciliadas. Cada relación recibe un UUID propio y versión. El payload utiliza `ficha_sync_id` y `etiqueta_sync_id`. Si se intenta modificar una relación histórica sin identidad, o asociar una etiqueta no reconciliada a una ficha sincronizada, la transacción se bloquea. Las consultas habituales excluyen relaciones tombstone.

## Integración de etiquetas

`src/modelos/etiquetaModelo.js` registra INSERT y UPDATE para etiquetas locales y DELETE lógico para etiquetas sincronizadas. Si una etiqueta sincronizada todavía está asociada a fichas sin identidad reconciliada, la eliminación se bloquea; de lo contrario, el evento DELETE incluye los `fichas_sync_ids` relacionados. Las asociaciones se conservan localmente mientras la etiqueta queda inactiva y marcada como tombstone, evitando borrar vínculos antes de su futura replicación.

## Integración de plantillas

`src/modelos/plantilla.js` registra INSERT, UPDATE y DELETE lógico en la outbox local. Las plantillas son la raíz de esta jerarquía de contenido, por lo que sus eventos no dependen de una identidad padre. La eliminación conserva la validación de que no existan menús asociados; cuando la plantilla está sincronizada, se marca tombstone en lugar de borrarla físicamente.

## Integración de menús

`src/modelos/menu.js` registra INSERT y UPDATE para menús cuya plantilla ya tiene identidad reconciliada. El payload referencia a la plantilla mediante `plantilla_sync_id`. Si la plantilla no está reconciliada, el alta sigue siendo local y no genera un evento con una referencia local.

Para menús sincronizados, la eliminación se representa como tombstone, incrementa la versión y registra DELETE dentro de la misma transacción. Las consultas habituales excluyen los menús eliminados. Si una modificación o baja de un menú sincronizado apunta a una plantilla sin identidad reconciliada, se bloquea para evitar divergencia silenciosa. La eliminación conserva la validación de que no existan fichas asociadas.

## Integración de multimedia y archivos

`src/modelos/multimedia.js` registra INSERT, UPDATE y DELETE lógico cuando la ficha asociada tiene identidad reconciliada. El payload referencia la ficha mediante `ficha_sync_id` y transporta descripción, tipo, miniatura, estado, `storage_key`, `checksum_sha256`, `mime_type` y `tamano_bytes`. Nunca incluye `ruta_archivo` local.

Para archivos locales dentro de `imagenes/multimedia`, el modelo calcula SHA-256 leyendo los bytes del archivo y genera una clave lógica estable a partir del UUID de multimedia. Las consultas habituales excluyen tombstones. Los archivos y registros históricos bajo fichas sin identidad continúan siendo locales y no generan eventos incompletos.

La carga real del archivo a Supabase, la verificación del checksum remoto, la confirmación de eventos y la limpieza segura de objetos reemplazados quedan para la capa de transporte; esta integración todavía no sube archivos ni ejecuta operaciones remotas.

## Protocolo incremental

`src/servicios/sincronizacion/protocolo.js` aplica eventos por UUID, resuelve relaciones mediante UUID del padre, evita duplicados y registra conflictos de versión en `sync_conflictos`. El protocolo habilita por ahora `plantilla`, `menu`, `ficha`, `etiqueta` y `ficha_etiqueta`.

`src/rutas/sincronizacion.js` expone `POST /api/sync/v1/exchange` únicamente en el nodo PostgreSQL. Requiere `SYNC_SHARED_SECRET` (mínimo 32 caracteres), valida que los eventos pertenezcan al dispositivo autenticado y limita los lotes. No utiliza ni expone la clave service-role.

`src/servicios/sincronizacion/cliente.js` permite al nodo SQLite enviar eventos pendientes, recibir eventos posteriores al cursor y reintentar periódicamente cada 30 segundos cuando existen `SYNC_REMOTE_URL` y `SYNC_SHARED_SECRET`. El inicio automático no prepara ni altera el esquema: si falta la migración, no realiza intercambios.

El script `scripts/preparar-esquema-sincronizacion.js` prepara metadatos, outbox, dispositivos y conflictos en la base seleccionada; además agrega campos de integridad multimedia. Debe ejecutarse explícitamente y solo contra copias descartables durante esta etapa.

**Límites actuales:** multimedia no se envía/descarga como archivo binario; sus eventos quedan pendientes fuera del lote. La reconciliación inicial de registros históricos con `sync_id` nulo no está automatizada. `relacion_ficha` y `configuracion` no están incluidas en el protocolo. La resolución de conflictos todavía no tiene interfaz administrativa.

## Helper e identidad local

`src/servicios/sincronizacion/outbox.js` inserta un evento con UUID, dispositivo de origen, entidad, operación, UUID compartido, versiones y payload opcional. Propaga los errores para que la transacción exterior haga rollback.

`src/servicios/sincronizacion/dispositivo.js` obtiene un UUID persistente para la instalación SQLite y lo guarda en `configuracion` bajo la clave `sync.device_id`. El servicio rechaza el modo Supabase para evitar que varias instalaciones compartan una identidad global.

## Pruebas y CI

`test/sincronizacionFichaOutboxSQLite.test.js`, `test/sincronizacionMenuOutboxSQLite.test.js`, `test/sincronizacionPlantillaOutboxSQLite.test.js`, `test/sincronizacionEtiquetaOutboxSQLite.test.js`, `test/sincronizacionFichaEtiquetaOutboxSQLite.test.js` y `test/sincronizacionMultimediaOutboxSQLite.test.js` usan bases SQLite temporales y cubren INSERT, UPDATE, rollback ante fallos de outbox, tombstones, reactivación de asociaciones, checksum SHA-256 y referencias sin identidad reconciliada. El workflow `.github/workflows/test-sync-ficha.yml` ejecuta `npm ci` y `npm test`.

## Pendiente antes de una sincronización real

- Ejecutar y aprobar la suite de CI.
- Diseñar y ejecutar una reconciliación de identidades compartidas entre SQLite y PostgreSQL.
- Implementar carga/descarga binaria a Supabase Storage, verificación remota de checksum y limpieza segura de objetos.
- Incorporar `relacion_ficha` y `configuracion` al protocolo incremental.
- Agregar interfaz y operación explícita de resolución de conflictos.
- Añadir pruebas de integración contra PostgreSQL descartable.
- Revisar compatibilidad de controladores y respuestas de eliminación ante tombstones.

No ejecutar scripts de preparación contra producción: seleccionan la base por configuración y alteran el esquema de la base seleccionada. No ejecutar scripts de sincronización de contenido para este propósito.
