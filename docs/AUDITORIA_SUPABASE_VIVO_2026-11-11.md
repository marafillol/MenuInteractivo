# Auditoría de solo lectura de Supabase — 2026-11-11

## Alcance y seguridad

Auditoría ejecutada mediante la conexión autorizada de Supabase sobre el proyecto de la organización **Menu Interactivo**. Todas las consultas fueron `SELECT` / lectura de metadatos. No se ejecutaron DDL, DML, migraciones, cambios de Storage ni acciones sobre Render.

Referencia histórica: backup SQL del 2026-11-10, SHA-256
`f5817b9bf741f121fe816c8756091b99a14698c7c6187a68742c709031e49cce`.

Esta auditoría describe el estado observado el 2026-11-11; no debe interpretarse como una garantía sobre cambios posteriores.

## Conteos comparados

| Tabla | Backup 10/11 | Supabase observado 11/11 | Diferencia |
|---|---:|---:|---:|
| plantilla | 3 | 3 | 0 |
| menu | 3 | 3 | 0 |
| ficha | 55 | 59 | +4 |
| etiqueta | 5 | 5 | 0 |
| multimedia | 21 | 21 | 0 |
| relacion_ficha | 1 | 1 | 0 |
| ficha_etiqueta | 34 | 39 | +5 |

La comparación de claves primarias y relaciones del backup encontró que todas las claves históricas esperadas siguen presentes. Las diferencias son aditivas: cuatro fichas nuevas (IDs 89, 90, 91 y 92) y cinco asociaciones ficha-etiqueta adicionales. Las fichas nuevas pertenecen al menú 1, están visibles y tienen fechas de creación del 11/11/2026. No se asignaron identidades UUID a estos registros.

## Integridad referencial observada

Consultas de huérfanos sobre las relaciones actuales:

| Control | Filas huérfanas |
|---|---:|
| ficha sin menú | 0 |
| menú sin plantilla | 0 |
| multimedia sin ficha | 0 |
| ficha_etiqueta sin ficha | 0 |
| ficha_etiqueta sin etiqueta | 0 |
| relacion_ficha con extremos inexistentes | 0 |

La tabla usuario tiene 7 filas y las 7 tienen `supabase_uid` no nulo. Esto no valida por sí solo que cada identidad Auth corresponda al usuario funcional correcto.

## Esquema real vs. esquema que espera la sincronización

El esquema actual de las tablas de contenido no contiene:

- `sync_id`
- `sync_version`
- `sync_deleted_at`

Tampoco existen todavía las tablas auxiliares `sync_eventos`, `sync_dispositivos` y `sync_conflictos` (la comprobación de preparación del protocolo las requiere).

Tampoco están presentes los metadatos de Storage requeridos por el protocolo:
- multimedia: `storage_key`, `checksum_sha256`, `mime_type`, `tamano_bytes`
- menu/ficha: `imagen_storage_key`, `imagen_checksum_sha256`, `imagen_mime_type`, `imagen_tamano_bytes`

Las columnas actuales incluyen diferencias de tipos que deben contemplarse al preparar migraciones (por ejemplo, IDs de `relacion_ficha` son integer mientras que otras claves principales son bigint; columnas de fecha tienen combinaciones de timestamp/timestamptz/text). No se debe asumir que el fixture aproximado de CI representa exactamente el DDL actual.

## Bloqueos técnicos y próximos trabajos

1. **No activar el protocolo todavía.** `estaPreparado()` debe seguir devolviendo falso mientras falten las columnas/tablas auxiliares.
2. **Identidades compartidas:** el manifiesto histórico de 122 identidades cubre las claves del backup, pero no las cuatro fichas nuevas ni las cinco asociaciones nuevas. Es necesario diseñar una extensión determinista que conserve las identidades ya propuestas y resuelva los registros posteriores sin colisiones.
3. **Relaciones nuevas:** identificar las cinco asociaciones adicionales con su contenido y confirmar que no cambian durante la preparación; no inferir ni regenerar relaciones.
4. **Storage:** los 21 registros multimedia y portadas deben conservar sus claves actuales; no renombrar objetos. Los metadatos deben derivarse de los objetos ya auditados y verificarse por hash.
5. **Migración PostgreSQL:** el script `scripts/preparar-esquema-sincronizacion.js` está deliberadamente restringido a la base local `museo_reconciliacion_prueba` en localhost. No debe reutilizarse contra producción ni eliminarse esa protección para “hacerlo funcionar”. Hace falta una migración de producción separada, revisable, idempotente, con backup, validaciones previas y procedimiento de rollback.
6. **Pruebas:** ampliar fixtures y CI para incluir los registros posteriores al backup, los tipos reales del esquema y casos de conflicto/reintento/orden de eventos, además de multimedia.
7. **Seguridad:** los asesores informaron RLS habilitado sin políticas en 10 tablas (incluida usuario) y protección de contraseñas filtradas desactivada. Son hallazgos preexistentes que requieren revisión independiente; no se modificaron políticas ni Auth.

## Decisión

La auditoría de datos es favorable en cuanto a preservación de las claves históricas y consistencia referencial observada. La sincronización bidireccional **todavía no está lista para activarse**: faltan identidades para los registros posteriores al backup, metadatos de Storage, esquema auxiliar, migración revisable y validación integral contra el DDL real.

No se debe aplicar ninguna migración en producción hasta completar esos puntos y obtener aprobación explícita.
