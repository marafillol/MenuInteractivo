# Plan de preparación histórica de Supabase para sincronización offline

**Estado:** auditoría de solo lectura y migración candidata; no aplicada.

## Fuente y límites

La auditoría se generó a partir de `supabase_backup.sql` y `multimedia.zip` disponibles en los archivos de trabajo. No se consultó Supabase en vivo, no se usó SQLite como fuente de datos y no se escribió en Supabase, Storage ni Render.

- SHA-256 de `supabase_backup.sql`: `f5817b9bf741f121fe816c8756091b99a14698c7c6187a68742c709031e49cce`.
- `supabase_backup_2.sql` es byte por byte idéntico al SQL anterior.
- El SQL declara PostgreSQL 17.6 y fue generado por pg_dump 18.6.
- También existe un custom dump `supabase_backup_20261110.dump`, que la usuaria restauró en `museo_reconciliacion_prueba` (localhost:5433). No se pudo inspeccionar su contenido desde este entorno ni se recibió la consulta final de conteos; por eso todavía no se afirma que coincida con el SQL plano. El script de preparación del repositorio permite únicamente `localhost:5432`; no se debe intentar ejecutarlo contra la copia del puerto 5433.
- SHA-256 de `multimedia.zip`: `4c4c8e29a11c9baea3339ed527e3b4fd779a1ab0f96277fbf327f55407f1562a`.

## Conteos del SQL plano

| Tabla | Filas |
|---|---:|
| plantilla | 3 |
| menu | 3 |
| ficha | 55 |
| etiqueta | 5 |
| ficha_etiqueta | 34 |
| relacion_ficha | 1 |
| multimedia | 21 |
| configuracion | 2 |
| configuracion_backup_tilde | 1 |

El dump contiene la estructura de `usuario`, pero no contiene un bloque `COPY public.usuario`; por lo tanto, este respaldo SQL no acredita que incluya las filas de usuarios. `configuracion` y `configuracion_backup_tilde` no se incluyen en el protocolo de sincronización. Las cuentas de usuario tampoco se replican en el bootstrap de contenido.

## Integridad de registros

Se revisaron claves primarias y referencias entre las tablas del protocolo:

- No hay claves primarias duplicadas en las siete tablas.
- No hay referencias huérfanas en menú→plantilla, ficha→menú, multimedia→ficha, ficha-etiqueta→ficha/etiqueta ni relación-ficha→ficha.
- Las 34 asociaciones ficha-etiqueta son distintas.
- Se conserva la relación entre fichas existente.

No se eliminaron registros que parecen pruebas o que están inactivos. El dump contiene el menú 23 y fichas asociadas a ese menú; siguen siendo datos de la fuente Supabase y se preservan hasta que la responsable confirme otra cosa.

## Inventario de Storage

`multimedia.zip` contiene 22 archivos reales (37.493.640 bytes), no contiene `manifiesto.json` y no tiene la estructura `almacenamiento/<bucket>/...` que genera `src/controladores/respaldo.js`. Por eso no se puede certificar automáticamente la clave de objeto de cada archivo.

Cruce por tabla:

| Entidad / campo | Encontrado y hash calculado | No está en el ZIP | Sin archivo asociado |
|---|---:|---:|---:|
| multimedia (21 filas) | 16 archivos, clave de Storage pendiente de confirmar | 5 URLs remotas | 0 |
| ficha (55 filas) | 0 | 34 portadas referenciadas por URL | 21 |
| menu (3 filas) | 0 | 2 rutas locales | 1 |

Además, hay 6 archivos del ZIP que no coinciden con ninguna ruta de multimedia del SQL. No se los asignó a fichas ni a menús por similitud de nombre.

Los 16 archivos que sí coinciden con rutas locales de multimedia tienen SHA-256 y tamaño calculados desde sus bytes. Esos hashes verifican los archivos dentro del ZIP, pero no demuestran que la ruta `multimedia/...` sea la clave exacta del objeto en Supabase Storage. No se escribió ningún `storage_key` ni checksum en una base.

Las cinco filas multimedia con URLs públicas contienen claves extraíbles de la URL, pero sus bytes no están en el ZIP; no se puede calcular ni certificar su checksum. Las 34 portadas de ficha por URL tampoco están en el ZIP. Las dos portadas de menú son rutas locales y tampoco aparecen en el ZIP.

Se generó un inventario detallado por registro con ruta, estado, hash y tamaño. Se entrega como adjunto de auditoría para no incorporar al repositorio rutas históricas de archivos ni información innecesaria.

## Herramienta para completar la auditoría de Storage

Se agregó `scripts/auditar-storage-supabase-readonly.js` para ejecutar desde la máquina que ya tiene el `.env` local. La herramienta consulta únicamente `storage.from(bucket).list()` y `download()`: no hace upload, update, remove ni consulta/modifica PostgreSQL. Descarga los objetos de forma secuencial, calcula SHA-256 y tamaño desde los bytes, guarda un manifiesto y genera un ZIP con la estructura `almacenamiento/<bucket>/<clave>`. Si algún objeto falla, deja el error en el manifiesto y termina con código distinto de cero.

Ejecución desde la raíz del proyecto, donde está el `.env` con las variables existentes (no compartir ese archivo ni sus valores):

```powershell
node .\scripts\auditar-storage-supabase-readonly.js
```

El resultado queda en una carpeta nueva `backups\supabase-storage-audit-*` y en un ZIP hermano. El bucket se toma de `SUPABASE_BUCKET` o, si falta, usa `multimedia`.

## Identidades compartidas candidatas

Se prepararon 122 identidades UUIDv5 deterministas para las siete entidades del protocolo:

- Plantilla: clave `id_plantilla`.
- Menú: clave `id_menu`.
- Ficha: clave `id_ficha`.
- Etiqueta: clave `id_etiqueta`.
- Multimedia: clave `id_multi`.
- Relación entre fichas: clave `id_relacion`.
- Asociación ficha-etiqueta: clave compuesta `id_ficha:id_etiqueta`.

El espacio de nombres y la lista completa están en `plan-identidades-supabase-candidato.json`. Se comprobaron 122 UUID distintos. La misma fila obtiene la misma identidad si se vuelve a generar el plan con el mismo algoritmo y espacio de nombres.

Estos UUID son candidatos; todavía no están persistidos. La migración SQL agrega metadatos de sincronización, comprueba conteos y evita pisar identidades preexistentes. Termina deliberadamente en `ROLLBACK`: sirve para validar precondiciones en una copia aislada, no para modificar producción.

## Orden de trabajo propuesto

1. Comparar los conteos de `museo_reconciliacion_prueba` (restauración custom del 10/11) con el SQL plano. Si difieren, no usar este plan hasta identificar cuál respaldo es el vigente.
2. La exportación completa de Storage ya fue obtenida el 11/11: 113/113 objetos, SHA-256 y tamaños. Usar esa evidencia para probar un resolver de alias explícito; mantener los seis archivos históricos sin asignar hasta revisión.
3. En una copia aislada del dump vigente, ejecutar `scripts/preparar-esquema-sincronizacion.js` con su protección de destino local y probar la migración candidata en modo rollback.
4. Verificar que el snapshot generado desde esa copia pase `validarSnapshot` y que el bootstrap SQLite restaure filas, relaciones, cursor y archivos.
5. Revisar el diff final de migración y obtener aprobación expresa antes de cualquier escritura real en Supabase.

## Archivos

- `plan-identidades-supabase-candidato.json`: conteos, integridad, UUIDv5 y resumen de Storage.
- Inventario detallado de archivos: adjunto de auditoría separado.
- `migracion-identidades-supabase-candidata.sql`: migración candidata que termina en `ROLLBACK`.

**No ejecutar contra Supabase de producción. No cambiar el `ROLLBACK` a `COMMIT` sin revisión y autorización separadas.**

## Addendum — auditoría real de Storage (11/11/2026)

Se incorporó una exportación de solo lectura ejecutada desde el entorno local autorizado contra el bucket `multimedia` del proyecto esperado. La exportación contiene 113/113 objetos descargados, 0 errores y 55.096.780 bytes. El manifiesto incluye SHA-256 calculado desde los bytes descargados.

### Reconciliación de las 21 filas multimedia

Las 21 filas de `public.multimedia` del SQL plano se resolvieron contra objetos actuales:

- 16 rutas locales tienen igualdad binaria SHA-256 con los archivos correspondientes del ZIP histórico y con un objeto actual de Storage. En 14 casos el nombre histórico y la clave actual difieren por espacios/paréntesis convertidos en guiones bajos; la correspondencia se acepta por hash, no por normalización textual sola.
- 5 URLs públicas tenían sus claves extraíbles de la URL y los objetos existen exactamente en Storage. Esos bytes no estaban en el ZIP histórico, pero sí en la exportación actual.

Esto reemplaza el estado preliminar anterior que dejaba las claves de los 16 objetos pendientes de confirmar. No se modificaron las rutas almacenadas en PostgreSQL.

### Portadas

- 34/55 fichas tienen una referencia exacta a un objeto bajo `migracion/fichas/`; cada una tiene una contraparte de contenido idéntico bajo `imagenes/fichas/`.
- 2/3 menús tienen una ruta de imagen exacta en Storage. El menú 23 no tiene imagen en el campo del SQL.
- Se conservan ambas copias de las portadas; no se eligió una ubicación canónica ni se eliminó nada.

### Seis archivos del ZIP histórico sin correspondencia

Los seis archivos históricos sin coincidencia SHA-256 en la exportación actual no aparecen referenciados por nombre en el SQL plano ni en los respaldos SQLite examinados. Una búsqueda perceptual exploratoria no dio evidencia suficientemente fuerte para asignarlos a objetos actuales. Se mantienen como activos históricos sin asignar; no se recomienda volver a subirlos ni asociarlos a registros sin revisión humana.

### Metadata MIME

94/113 objetos tienen MIME declarado distinto del tipo detectado por firma binaria. El grupo mayoritario son 87 objetos declarados `text/plain`; hay siete discrepancias adicionales entre tipos declarados y firmas reales. Se propone para cargas futuras detectar el tipo por magic bytes. Para objetos existentes, cualquier corrección deberá ser metadata-only, ensayada en entorno no productivo y validada con un nuevo SHA-256. No se deben reemplazar bytes ni renombrar claves.

### Política de normalización

- Mantener las claves actuales de Storage como identificadores físicos.
- Resolver rutas antiguas mediante un mapa explícito de alias, respaldado por hash cuando corresponda.
- No aplicar normalización genérica de espacios/guiones que pueda producir colisiones.
- Preservar las referencias de portadas y las copias duplicadas hasta una migración coordinada.
- Mantener los seis archivos históricos sin asignar.
- No hacer escrituras en Supabase Storage ni PostgreSQL sin aprobación expresa y un plan de rollback.

El informe detallado de correspondencias, inventario, duplicados, MIME y pendientes se adjunta en la conversación como `reconciliacion_storage_supabase_2026-11-11.xlsx`. El documento `docs/RECONCILIACION_STORAGE_SUPABASE_20261111.md` contiene el resumen técnico de esta reconciliación.

**Esta auditoría es de solo lectura. No se modificaron Supabase, Storage, SQLite ni Render.**
