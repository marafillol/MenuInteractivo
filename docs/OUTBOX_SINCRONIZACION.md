# Base de bandeja de salida de sincronización

## Estado

Esta rama agrega una función auxiliar y pruebas unitarias para construir una bandeja de salida transaccional. **No activa sincronización, no modifica bases de datos y no debe desplegarse como una sincronización funcional.**

## Contrato

Toda operación de contenido que se quiera replicar deberá ejecutar, dentro de una misma llamada a `db.withTransaction()`:

1. La escritura del registro de negocio.
2. La actualización de su `sync_version` y, cuando corresponda, `sync_deleted_at`.
3. La llamada a `registrarEvento(consultar, ...)` usando exactamente el callback transaccional recibido.

Si cualquiera de esos pasos falla, la transacción debe revertirse. No llamar al helper desde una conexión distinta ni después del COMMIT.

## Helper

`src/servicios/sincronizacion/outbox.js` inserta un evento con UUID, dispositivo de origen, entidad, operación, UUID compartido, versiones y payload opcional. Propaga los errores para que la transacción exterior haga rollback.

El esquema esperado corresponde al script de preparación existente:
- `evento_id`
- `origen_device_id`
- `entidad`
- `operacion`
- `sync_id`
- `version_base`
- `version_resultado`
- `payload_json`
- `creado`
- `aplicado`

## Identidad local del dispositivo

`src/servicios/sincronizacion/dispositivo.js` obtiene un UUID persistente para la instalación SQLite y lo guarda en `configuracion` bajo la clave `sync.device_id`. La lectura y creación ocurren dentro de `db.withTransaction()`, que en SQLite utiliza `BEGIN IMMEDIATE`; así las solicitudes concurrentes reutilizan el mismo UUID.

El servicio rechaza el modo Supabase para evitar que varias instalaciones compartan una identidad global. Si encuentra un valor existente inválido, falla sin reemplazarlo, para no desvincular eventos históricos.

## Lo que falta antes de usarlo

- Migración aditiva del esquema, con validaciones y rollback.
- Generación/reconciliación de `sync_id` para las entidades existentes.
- Integrar escritura + versión + evento en cada modelo y sus operaciones especiales.
- Definir eventos para relaciones y configuración.
- Protocolo de envío/recepción idempotente, cursores, confirmaciones y conflictos.
- Sincronización y verificación de archivos multimedia.
- Pruebas de integración con SQLite y PostgreSQL descartables.

No ejecutar el script de preparación existente contra producción: selecciona la base por configuración y altera el esquema de la base seleccionada. No ejecutar scripts de sincronización de contenido existentes para este propósito.
