# Base de bandeja de salida de sincronización

## Estado actual de esta rama

La rama incorpora la base transaccional de outbox y una primera integración funcional, limitada a altas, modificaciones y bajas lógicas de fichas locales cuyo menú ya tiene un `sync_id` reconciliado.

**Todavía no implementa transporte de eventos hacia/desde Supabase, reconciliación inicial ni sincronización completa. No desplegar como sincronización funcional.**

## Preparación local acotada

El script `scripts/preparar-outbox-fichas-local.js` prepara únicamente las columnas de sincronización de `menu` y `ficha`, sus índices y la tabla `sync_eventos` en SQLite local. Rechaza el modo Supabase.

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

## Helper e identidad local

`src/servicios/sincronizacion/outbox.js` inserta un evento con UUID, dispositivo de origen, entidad, operación, UUID compartido, versiones y payload opcional. Propaga los errores para que la transacción exterior haga rollback.

`src/servicios/sincronizacion/dispositivo.js` obtiene un UUID persistente para la instalación SQLite y lo guarda en `configuracion` bajo la clave `sync.device_id`. El servicio rechaza el modo Supabase para evitar que varias instalaciones compartan una identidad global.

## Pruebas y CI

`test/sincronizacionFichaOutboxSQLite.test.js` usa una base temporal y cubre INSERT, UPDATE, rollback ante fallo de outbox, tombstone DELETE y el caso de un menú sin identidad reconciliada. El workflow `.github/workflows/test-sync-ficha.yml` ejecuta `npm ci` y `npm test`.

## Pendiente antes de una sincronización real

- Ejecutar y aprobar la suite de CI.
- Diseñar y ejecutar una reconciliación de identidades compartidas entre SQLite y PostgreSQL.
- Integrar menús, plantillas, etiquetas, relaciones, configuración y multimedia.
- Definir protocolo de envío/recepción idempotente, cursores, confirmaciones y conflictos.
- Añadir pruebas de integración contra PostgreSQL descartable.
- Revisar compatibilidad de controladores y respuestas de eliminación ante tombstones.

No ejecutar scripts de preparación contra producción: seleccionan la base por configuración y alteran el esquema de la base seleccionada. No ejecutar scripts de sincronización de contenido para este propósito.
