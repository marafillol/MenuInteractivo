# Reconciliación de Supabase Storage — 11/11/2026

**Estado:** completada en modo de solo lectura. Este documento registra el cruce de la exportación de Storage obtenida desde el entorno local de la responsable con el respaldo SQL y el ZIP histórico. No se aplicaron cambios.

## Evidencia de la exportación actual

- Bucket: `multimedia`.
- Objetos listados y descargados: **113/113**.
- Errores de descarga: **0**.
- Bytes descargados: **55.096.780**.
- SHA-256 calculado desde cada descarga.
- Contenidos únicos: **68**; grupos con contenido duplicado: **40**; objetos adicionales dentro de esos grupos: **45**.

## Multimedia del respaldo SQL

Las **21 filas** de `public.multimedia` quedan resueltas contra objetos actuales de Storage:

- **16/16 rutas locales:** bytes idénticos por SHA-256 a los archivos correspondientes del ZIP histórico y un objeto actual con el mismo hash. En 14 rutas hay diferencias de escritura (espacios/paréntesis frente a guiones bajos) entre la ruta guardada y la clave actual; dos claves coinciden literalmente.
- **5/5 URLs públicas:** se extrajo la clave de la URL del proyecto y se encontró el objeto exacto en Storage. Los cinco archivos no estaban incluidos en el ZIP histórico, pero sí en la exportación actual.

La correspondencia completa por `id_multi`, ruta original, clave actual y SHA-256 está en el informe Excel adjunto a la conversación. No se cambió ninguna ruta de la base.

## Portadas

- Fichas: **34 de 55** tienen una referencia de portada cuya clave existe exactamente bajo `migracion/fichas/`. Las 34 tienen una copia binaria idéntica en `imagenes/fichas/` (SHA-256 igual). Las otras 21 fichas no tienen imagen en el campo del SQL.
- Menús: **2 de 3** tienen una ruta exacta en Storage. El menú 23 no tiene imagen en el SQL.

Las dos ubicaciones de cada portada se conservan. No se eligió una como canónica ni se borró la otra.

## Seis archivos históricos pendientes

Los seis archivos que están en `multimedia.zip` pero no tienen coincidencia SHA-256 en los 113 objetos actuales son:

| Archivo | Bytes |
|---|---:|
| `1783644446564-WhatsApp Image 2026-07-09 at 21.45.23.jpeg` | 63.686 |
| `1783646960697-Captura de pantalla 2026-07-09 222907.png` | 90.255 |
| `1786975654972-download.jpg` | 8.418 |
| `1788676379779-4d21b35c-c357-405c-b3eb-b29b0dee88f2.png` | 3.468.889 |
| `1788676407475-fondomapamalvinas.png` | 3.590.006 |
| `1788676414309-fondoazulmalvinas.png` | 1.762.839 |

No aparecen referenciados por nombre en el `supabase_backup.sql` examinado ni en los respaldos SQLite locales examinados. Una búsqueda perceptual exploratoria arrojó vecinos con distancia pHash de 18–26 bits; eso no permite afirmar identidad. Por lo tanto quedan como **activos históricos sin asignar**. No se propone volver a subirlos ni asociarlos a fichas/menús sin revisión humana.

## Metadata MIME

**94 de 113 objetos** tienen un MIME declarado distinto del tipo detectado por firma binaria. El desglose incluye 87 objetos declarados como `text/plain` y 7 discrepancias adicionales entre tipos declarados y firmas reales. Hay imágenes WebP y videos MP4 con metadata/extensiones heredadas que no representan su contenido real.

Regla propuesta para cargas futuras: detectar el tipo por firma binaria (magic bytes), no confiar solo en extensión ni en metadata heredada, y rechazar tipos desconocidos hasta revisión. Para objetos existentes, cualquier eventual corrección debe ser metadata-only, ensayada primero en un proyecto/bucket aislado y verificada descargando de nuevo y comparando SHA-256. No reemplazar bytes ni renombrar claves.

## Propuesta segura de normalización de rutas

1. Mantener las claves actuales de Storage como identificadores físicos; no mover ni renombrar objetos.
2. Incorporar un mapa explícito de alias entre `ruta_archivo` histórica y `storage_key` actual. Para las 14 rutas locales con diferencias de espacios/paréntesis, la asociación se acepta solo porque el SHA-256 del archivo histórico coincide exactamente con el objeto actual.
3. Para las cinco URLs, extraer bucket y clave únicamente si el host coincide con el proyecto esperado; comprobar existencia y guardar la clave relativa, no una URL absoluta, en el mapa candidato.
4. Para las 34 portadas, preservar las referencias actuales a `migracion/fichas/` y registrar la copia idéntica de `imagenes/fichas/` como alias, sin elegir ni borrar una ubicación en esta etapa.
5. Resolver las referencias en la aplicación mediante el mapa explícito antes de cambiar cualquier dato persistido. Evitar una normalización global de espacios/guiones, porque puede producir colisiones.
6. Mantener los seis archivos históricos pendientes sin asignar.

## Condiciones antes de cualquier escritura

- Revisar el mapa de correspondencias y aprobarlo.
- Probar el resolver de alias con las rutas existentes y los 113 objetos descargados.
- Probar corrección MIME metadata-only en un entorno no productivo, verificando que SHA-256 no cambie.
- Preparar respaldo y rollback verificables.
- Solicitar aprobación explícita separada antes de cualquier cambio real en Supabase Storage o PostgreSQL.

**Alcance:** análisis local de archivos recibidos, exportación de Storage, SQL plano y respaldos SQLite. No se hizo upload, update, delete, rename, movimiento de objetos ni escritura en bases.
