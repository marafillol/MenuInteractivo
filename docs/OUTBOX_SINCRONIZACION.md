# Base de bandeja de salida de sincronización

## Estado actual de esta rama

La rama incorpora la base transaccional de outbox y una primera integración funcional para plantillas, menús y fichas locales. Las operaciones se registran transaccionalmente; las referencias padre deben tener `sync_id` reconciliados.

**Todavía no implementa transporte de eventos hacia/desde Supabase, reconciliación inicial ni sincronización completa. No desplegar como sincronización funcional.**

## Preparación local acotada

El script `scripts/preparar-outbox-fichas-local.js` prepara las columnas de sincronización de `plantilla`, `menu`, `ficha` y `etiqueta`, sus índices y la tabla `sync_eventos` en SQLite local. Rechaza el modo Supabase.

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

## Integración de etiquetas

`src/modelos/etiquetaModelo.js` registra INSERT y UPDATE para etiquetas locales y DELETE lógico para etiquetas sincronizadas. Si una etiqueta sincronizada todavía está asociada a fichas sin identidad reconciliada, la eliminación se bloquea; de lo contrario, el evento DELETE incluye los `fichas_sync_ids` relacionados. Las asociaciones se conservan localmente mientras la etiqueta queda inactiva y marcada como tombstone, evitando borrar vínculos antes de su futura replicación.

## Integración de plantillas

`src/modelos/plantilla.js` registra INSERT, UPDATE y DELETE lógico en la outbox local. Las plantillas son la raíz de esta jerarquía de contenido, por lo que sus eventos no dependen de una identidad padre. La eliminación conserva la validación de que no existan menús asociados; cuando la plantilla está sincronizada, se marca tombstone en lugar de borrarla físicamente.

## Integración de menús

`src/modelos/menu.js` registra INSERT y UPDATE para menús cuya plantilla ya tiene identidad reconciliada. El payload referencia a la plantilla mediante `plantilla_sync_id`. Si la plantilla no está reconciliada, el alta sigue siendo local y no genera un evento con una referencia local.

Para menús sincronizados, la eliminación se representa como tombstone, incrementa la versión y registra DELETE dentro de la misma transacción. Las consultas habituales excluyen los menús eliminados. Si una modificación o baja de un menú sincronizado apunta a una plantilla sin identidad reconciliada, se bloquea para evitar divergencia silenciosa. La eliminación conserva la validación de que no existan fichas asociadas.

## Helper e identidad local

`src/servicios/sincronizacion/outbox.js` inserta un evento con UUID, dispositivo de origen, entidad, operación, UUID compartido, versiones y payload opcional. Propaga los errores para que la transacción exterior haga rollback.

`src/servicios/sincronizacion/dispositivo.js` obtiene un UUID persistente para la instalación SQLite y lo guarda en `configuracion` bajo la clave `sync.device_id`. El servicio rechaza el modo Supabase para evitar que varias instalaciones compartan una identidad global.

## Pruebas y CI

`test/sincronizacionFichaOutboxSQLite.test.js`, `test/sincronizacionMenuOutboxSQLite.test.js`, `test/sincronizacionPlantillaOutboxSQLite.test.js` y `test/sincronizacionEtiquetaOutboxSQLite.test.js` usan bases temporales y cubren INSERT, UPDATE, rollback ante fallo de outbox, tombstone DELETE y referencias padre sin identidad reconciliada. El workflow `.github/workflows/test-sync-ficha.yml` ejecuta `npm ci` y `npm test`.

## Pendiente antes de una sincronización real

- Ejecutar y aprobar la suite de CI.
- Diseñar y ejecutar una reconciliación de identidades compartidas entre SQLite y PostgreSQL.
- Integrar menús, plantillas, etiquetas, relaciones, configuración y multimedia.
- Definir protocolo de envío/recepción idempotente, cursores, confirmaciones y conflictos.
- Añadir pruebas de integración contra PostgreSQL descartable.
- Revisar compatibilidad de controladores y respuestas de eliminación ante tombstones.

No ejecutar scripts de preparación contra producción: seleccionan la base por configuración y alteran el esquema de la base seleccionada. No ejecutar scripts de sincronización de contenido para este propósito.
