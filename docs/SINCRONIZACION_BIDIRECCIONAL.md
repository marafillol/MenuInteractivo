# Sincronización bidireccional — estado de desarrollo

## Alcance
Se preparan como entidades sincronizables: plantillas, menús, fichas, etiquetas, relaciones ficha-etiqueta, relaciones entre fichas, multimedia y configuración. Usuarios, credenciales y sesiones no se replican.

## Reglas
- UUID compartido (`sync_id`) independiente de los IDs enteros existentes.
- Versión por registro para detectar cambios concurrentes.
- Tombstones (`sync_deleted_at`) para propagar eliminaciones.
- Eventos idempotentes, identificados por UUID y dispositivo de origen.
- Conflictos: conservar ambas versiones y solicitar resolución manual; nunca sobrescribir automáticamente.
- Archivos: transferencia por checksum en una etapa separada, sin asumir que las rutas locales son URLs de Storage.

## Etapa 1: metadatos
`scripts/preparar-esquema-sincronizacion.js` agrega columnas y tablas auxiliares de manera aditiva. No borra contenido ni cambia las claves primarias. Ejecutar manualmente con `npm run sync:preparar`, por separado contra copias de SQLite y PostgreSQL, después de hacer backups.

## Pendiente antes de sincronizar
1. Registrar altas, modificaciones y eliminaciones dentro de las transacciones de escritura.
2. API de sincronización autenticada entre el equipo local y Render.
3. Intercambio incremental con cursores, idempotencia y validación de versiones.
4. Resolver referencias mediante UUID compartidos.
5. Transferir multimedia con checksum.
6. UI de estado, pendientes y conflictos.
7. Pruebas de ida y vuelta, reintentos, desconexiones, duplicados, borrados y conflictos.

**No ejecutar el script en producción ni habilitar sincronización todavía.** El esquema preparado no replica datos; primero deben completarse y probarse las etapas restantes.
