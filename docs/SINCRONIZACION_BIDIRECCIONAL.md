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
`scripts/preparar-esquema-sincronizacion.js` agrega columnas y tablas auxiliares de manera aditiva. No borra contenido ni cambia claves primarias. Ejecutar manualmente con `npm run sync:preparar`, por separado contra copias de SQLite y PostgreSQL, después de hacer backups.

**Importante sobre la identidad inicial:** el script NO asigna UUID aleatorios a los registros existentes. Hacerlo de manera independiente en cada base rompería la correspondencia entre el registro local y el remoto. Los `sync_id` existentes quedan NULL hasta completar una reconciliación explícita de ambas bases (manifiesto, comparación y aprobación de coincidencias). No ejecutar aún el comando en producción.

## Pendiente antes de sincronizar
1. Reconciliar el contenido existente y asignar los mismos UUID a registros equivalentes, con reporte de coincidencias ambiguas.
2. Registrar altas, modificaciones y eliminaciones dentro de las transacciones de escritura.
3. API de sincronización autenticada entre el equipo local y Render.
4. Intercambio incremental con cursores, idempotencia y validación de versiones.
5. Resolver referencias mediante UUID compartidos.
6. Transferir multimedia con checksum.
7. UI de estado, pendientes y conflictos.
8. Pruebas de ida y vuelta, reintentos, desconexiones, duplicados, borrados y conflictos.

**No ejecutar el script en producción ni habilitar sincronización todavía.** El esquema preparado no replica datos; primero deben completarse y probarse las etapas restantes.
