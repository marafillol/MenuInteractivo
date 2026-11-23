# Manifiesto de reconciliación inicial SQLite ↔ PostgreSQL

**Estado:** herramientas de generación y aplicación manual disponibles; todavía no ejecutadas sobre datos reales  
**Rama de referencia:** `fix/sqlite-integrity-hardening`  
**Objetivo:** identificar correspondencias entre los datos existentes en SQLite y PostgreSQL antes de asignar UUID compartidos (`sync_id`).

> Este documento no autoriza ni realiza cambios en ninguna base. No ejecutar scripts de migración ni sincronización durante esta etapa. La inspección de PostgreSQL en producción todavía está pendiente; las estructuras descritas abajo se derivan del esquema SQLite del repositorio y deben contrastarse con una copia aislada de PostgreSQL.

## 1. Reglas no negociables

1. No generar UUID independientes en cada base para registros que ya existen en ambas.
2. No usar el ID entero como identidad global: solo es una clave local y puede coincidir por casualidad.
3. No emparejar registros únicamente por nombre o título.
4. No actualizar, insertar, borrar ni subir archivos durante la generación del manifiesto.
5. No asignar ningún `sync_id` hasta que todas las correspondencias estén clasificadas y aprobadas.
6. Conservar filas sin pareja, duplicados y ambigüedades como incidencias; nunca resolverlas automáticamente.
7. Excluir usuarios, credenciales, hashes, sesiones y tokens de la replicación inicial.
8. Trabajar con copias consistentes y respaldadas de ambas bases. La copia PostgreSQL debe obtenerse mediante backup/export autorizado, no conectando este proceso a producción.

## 2. Inventario de entidades y claves

| Entidad | Clave local observada en SQLite | Identidad lógica / dependencias | Tratamiento inicial |
|---|---|---|---|
| `plantilla` | `id_plantilla` | nombre, descripción, `plantilla_json` | Comparar contenido normalizado y referencias; revisión de candidatos |
| `menu` | `id_menu` | depende de `id_plantilla`; nombre, descripción, imagen, visibilidad | Comparar atributos y plantilla ya reconciliada |
| `ficha` | `id_ficha` | depende de `id_menu`; título, resumen, texto, datos JSON, imagen, visibilidad | Comparar atributos y menú ya reconciliado |
| `etiqueta` | `id_etiqueta` | nombre, descripción, activo | Comparar nombre normalizado y descripción; revisar duplicados |
| `ficha_etiqueta` | clave compuesta `(id_ficha, id_etiqueta)` | relación entre ficha y etiqueta | Reconciliar después de ambas entidades; no tratar como entidad independiente con ID entero |
| `relacion_ficha` | `id_relacion` | ficha origen, ficha destino, tipo de relación | Comparar extremos ya reconciliados y tipo; revisar duplicados |
| `multimedia` | `id_multi` | depende de ficha; ruta, tipo, descripción, miniatura, activo | Comparar metadatos y checksum del archivo; no equiparar rutas con URLs |
| `configuracion` | clave natural `clave` | valor y fecha de actualización | Emparejar por clave exacta; revisar diferencias de valor |
| `usuario` | `id_usuario` | identidad y permisos de acceso | Excluida de la sincronización de contenido |

### Observaciones del esquema

- En SQLite, `ficha_etiqueta` no tiene una columna ID propia: su clave primaria es compuesta.
- `configuracion` usa `clave` como clave primaria natural.
- `menu` referencia a `plantilla`; `ficha` referencia a `menu`; `multimedia` referencia a `ficha`.
- `relacion_ficha` contiene dos referencias a `ficha`.
- Los archivos multimedia pueden estar en el sistema de archivos local o representados por una URL remota. La igualdad de cadenas de ruta no demuestra igualdad de contenido.
- El script actual de preparación agrega `sync_id` también a `ficha_etiqueta` y `configuracion`. Antes de usarlo debe revisarse esa decisión: para la tabla intermedia la identidad natural es el par de extremos reconciliados; para configuración es `clave`. No se debe ejecutar el script hasta resolver y probar este diseño en copias.

## 3. Formato del manifiesto

El proceso de análisis debe producir un archivo JSON/CSV de solo lectura con una fila por registro o relación. Campos mínimos:

| Campo | Significado |
|---|---|
| `entidad` | Nombre lógico de la entidad |
| `clave_local` | Clave primaria o natural en SQLite |
| `clave_remota` | Clave primaria o natural en PostgreSQL; nula si no hay candidato |
| `sync_id_propuesto` | UUID propuesto, aún no aplicado |
| `estado` | `coincidencia_segura`, `candidato_revision`, `solo_local`, `solo_remoto`, `ambiguo`, `diferencia_contenido` |
| `criterio` | Evidencia usada para proponer la correspondencia |
| `hash_local` / `hash_remoto` | Hash de representación canónica, cuando corresponda |
| `dependencias` | Referencias lógicas ya reconciliadas |
| `aprobado_por` / `aprobado_en` | Auditoría de aprobación manual |

El manifiesto debe incluir un resumen por entidad: cantidad local, cantidad remota, coincidencias seguras, pendientes de revisión, solo local, solo remota y ambiguas.

## 4. Estrategia de correspondencia

La comparación se realiza por niveles, respetando el orden de dependencias:

1. **Plantillas:** canonizar JSON (orden estable de claves, sin cambiar valores), normalizar texto de forma conservadora y comparar nombre, descripción y estructura. Una similitud no constituye aprobación automática.
2. **Etiquetas:** comparar nombre normalizado y descripción. Si hay nombres repetidos o diferencias significativas, marcar ambiguo.
3. **Menús:** solo proponer pareja si sus plantillas ya tienen correspondencia aprobada. Comparar nombre, descripción, visibilidad e imagen mediante metadatos/hash cuando sea posible.
4. **Fichas:** solo proponer pareja si los menús están reconciliados. Comparar título, resumen, texto y JSON canónico; las imágenes se comparan por checksum, no por URL.
5. **Relaciones ficha-etiqueta:** derivar correspondencia usando los UUID aprobados de ficha y etiqueta.
6. **Relaciones entre fichas:** comparar ficha origen, ficha destino y tipo de relación después de reconciliar las fichas.
7. **Multimedia:** comparar ficha propietaria, tipo, descripción y checksum del archivo. Si no se puede obtener el archivo para calcular hash, marcar pendiente.
8. **Configuración:** comparar por clave exacta y registrar diferencias de valor; no asumir que el valor más reciente es correcto sin una política acordada.

### Normalización permitida para comparar

- Texto: normalizar Unicode a NFC y quitar espacios externos. No eliminar tildes ni cambiar mayúsculas/minúsculas para declarar igualdad exacta; pueden usarse solo para generar candidatos.
- JSON: parsear y serializar con claves ordenadas recursivamente, conservando tipos, arrays y valores.
- Multimedia: SHA-256 del contenido binario, tamaño y MIME. No usar nombre de archivo como prueba de identidad.
- Fechas: conservar valor original y zona/semántica; no convertir fechas ambiguas silenciosamente.

## 5. Asignación de UUID

- Cada pareja aprobada recibe un único UUID propuesto.
- Si una de las dos filas ya tiene un `sync_id` válido, conservarlo solo después de comprobar que no está asignado a otro registro en ninguna base.
- Si ambas filas tienen `sync_id` distintos, bloquear y registrar conflicto de identidad; no elegir uno automáticamente.
- Si una fila solo existe en una base, el manifiesto puede proponer UUID para ella, pero la asignación queda pendiente de aprobación y de la política de alta inicial.
- UUID v4 generado una sola vez en el manifiesto es aceptable para nuevas identidades; no regenerarlo en ejecuciones posteriores.
- Nunca asignar UUID a relaciones antes de que sus extremos estén aprobados.

## 6. Controles antes de aprobar

El manifiesto se rechaza si se cumple cualquiera de estas condiciones:

- UUID propuesto repetido dentro de una entidad o entre registros que deberían ser distintos.
- Una clave local o remota aparece en más de una correspondencia.
- Una relación apunta a una entidad no reconciliada.
- Una coincidencia depende únicamente de nombre/título.
- Hay diferencias no explicadas en JSON o checksum.
- El conteo de registros de origen cambió entre la captura y la revisión.
- La copia de cualquiera de las bases no tiene fecha, origen y checksum registrados.

La aprobación debe ser explícita y versionada. Se recomienda guardar el manifiesto original, el manifiesto aprobado y un reporte de diferencias como artefactos separados.

## 7. Procedimiento seguro de la etapa 3.1

1. Crear backups consistentes de SQLite y PostgreSQL, sin modificar las bases originales.
2. Restaurar ambos backups en entornos descartables y aislados.
3. Verificar el esquema real de PostgreSQL contra el inventario de este documento.
4. Exportar filas y metadatos de las entidades incluidas, sin usuarios.
5. Generar candidatos y hashes de forma offline, en modo solo lectura.
6. Revisar ambigüedades, filas solo locales/remotas y diferencias de contenido.
7. Aprobar manualmente las correspondencias.
8. Validar unicidad y dependencias del manifiesto aprobado.
9. Recién en una etapa posterior, diseñar un aplicador transaccional que escriba los UUID compartidos en ambas copias y pueda revertirse mediante backup.

## 8. Pendientes que requieren evidencia

- Confirmar columnas, tipos, restricciones, índices, secuencias y datos reales del esquema PostgreSQL mediante un backup de prueba.
- Confirmar si los IDs enteros se conservaron durante la migración histórica; no asumir que coinciden.
- Definir cómo identificar archivos locales que ya fueron cargados a Supabase Storage.
- Definir política para configuraciones divergentes.
- Revisar si las tablas puente y configuración deben tener `sync_id` o usar sus claves naturales.
- Definir el origen de autoridad para cada entidad durante el primer intercambio.
- Definir retención de tombstones y eventos para instalaciones que permanezcan offline por períodos largos.

## 9. Estado

**Diseño propuesto; no implementado.** Este documento no agrega columnas, no genera UUID, no lee ni escribe Supabase y no realiza sincronización. La siguiente tarea técnica será construir un generador de manifiesto en modo solo lectura que opere exclusivamente sobre copias locales de ambas bases.


## 6. Herramientas implementadas (solo copias)

### Generación de candidatos, solo lectura

`scripts/generar-manifiesto-reconciliacion.js` abre SQLite en modo `OPEN_READONLY` y PostgreSQL dentro de una transacción `READ ONLY`. Produce candidatos únicos, ambiguos y registros sin pareja. Cada candidato único recibe un `sync_id_propuesto` determinista basado en entidad y huella, pero siempre con `aprobado: false`.

Variables:
- `RECONCILIACION_SQLITE_PATH`: archivo de una copia SQLite.
- `RECONCILIACION_POSTGRES_URL`: conexión a una copia PostgreSQL.
- `RECONCILIACION_SALIDA`: archivo de salida opcional; no sobrescribe un manifiesto existente.

### Aplicación de candidatos aprobados

`scripts/aplicar-manifiesto-reconciliacion.js` aplica solo los candidatos cuyo campo `aprobado` haya sido cambiado manualmente a `true`. Debe ejecutarse dos veces, con el mismo manifiesto aprobado: una vez sobre la copia SQLite y otra sobre la copia PostgreSQL.

Requiere:
- `RECONCILIACION_MANIFIESTO_APROBADO`: ruta al manifiesto revisado.
- `RECONCILIACION_TARGET=sqlite` o `postgres`.
- `RECONCILIACION_CONFIRMAR_APLICACION=true`.
- `RECONCILIACION_DESTINO_ES_COPIA=true`.
- `RECONCILIACION_SQLITE_PATH` o `RECONCILIACION_POSTGRES_URL`, según el destino.

El aplicador:
- Rechaza candidatos ambiguos o no aprobados.
- Comprueba UUID, claves locales, colisiones y dependencias padre.
- Procesa primero plantillas y etiquetas, después menús, fichas y multimedia.
- Es idempotente: permite repetir el mismo manifiesto en cada copia.
- No emite eventos outbox porque las filas emparejadas representan el mismo contenido inicial.
- No aplica relaciones, configuración, registros solo-locales o solo-remotos; esos casos requieren un plan específico.

**No ejecutar estas herramientas contra producción ni contra Supabase real.** Todavía se necesita obtener copias consistentes, comparar los resultados, revisar manualmente cada candidato y conservar los manifiestos y backups usados.
