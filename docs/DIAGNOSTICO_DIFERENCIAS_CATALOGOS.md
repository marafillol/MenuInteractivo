# Diagnóstico de diferencias entre SQLite y PostgreSQL

Este diagnóstico compara campos de `plantilla`, `etiqueta`, `ficha` y `multimedia` entre una copia SQLite y la copia PostgreSQL aislada. La clave primaria se usa para localizar filas dentro de cada copia; por sí sola no demuestra que ambas filas tengan una identidad de sincronización compartida.

## Garantías

- SQLite se abre con `OPEN_READONLY`.
- PostgreSQL se limita a `localhost` o `127.0.0.1`, puerto `5432`, base `museo_reconciliacion_prueba`.
- PostgreSQL inicia una transacción `BEGIN READ ONLY`.
- No modifica datos, no asigna identificadores y no contacta Supabase ni Render.
- El informe no contiene valores de los registros: únicamente nombres de campos, claves primarias, tipos, longitudes y SHA-256.
- Para `activo` normaliza 0/1 a booleano; para `plantilla_json` y `datos_json` compara JSON con claves ordenadas.
- En `plantilla`, `etiqueta` y `multimedia`, las descripciones vacías (`""`) se consideran equivalentes a `NULL`; en `ficha`, se aplica lo mismo a `resumen` y `texto`. Los textos con contenido real siguen comparándose por separado.

## Ejecución en PowerShell

Desde la raíz del repositorio, usando la copia SQLite de pruebas (no `database/museo.db`):

```powershell
$env:RECONCILIACION_SQLITE_PATH = "$HOME\Downloads\museo_reconciliacion_prueba.sqlite"
$env:RECONCILIACION_DIAGNOSTICO_SALIDA = "$PWD\diagnostico-catalogos-20261111.json"
node .\scripts\diagnosticar-diferencias-catalogos.js
```

La variable `RECONCILIACION_POSTGRES_URL` debe apuntar a la base local aislada `museo_reconciliacion_prueba` en el puerto 5432. No usar la URL de Supabase, Render ni credenciales de producción.

Al terminar, compartir el archivo `diagnostico-catalogos-20261111.json`. No compartir el archivo `.env` ni cadenas de conexión.

## Interpretación

- `coincide_normalizado`: los valores comparados son iguales tras las normalizaciones explícitas.
- `difiere`: las huellas normalizadas son distintas; revisar tipo, longitud y hash antes de proponer cambios.
- `solo_sqlite` / `solo_postgres`: el campo solo existe en una de las dos copias.
- `solo_sqlite` / `solo_postgres` como estado de registro: esa clave primaria no aparece en la otra copia.

Una diferencia de hash no demuestra por sí sola pérdida de datos. No aplicar cambios ni reconciliar automáticamente a partir de este informe.


## Hallazgos del diagnóstico del 11/11/2026

En el informe ampliado de esa fecha, las diferencias de contenido detectadas en fichas fueron:

| Clave local | Campo | SQLite | PostgreSQL | Estado |
|---|---|---:|---:|---|
| ficha 10 | `texto` | 1414 caracteres | cadena vacía | Diferencia real |
| ficha 28 | `datos_json` | JSON de 33 bytes | objeto vacío `{}` | Diferencia real |
| ficha 30 | `datos_json` | JSON de 63 bytes | objeto vacío `{}` | Diferencia real |

Los títulos comparados en esas filas tienen huellas coincidentes. Esto ayuda a orientar la revisión, pero los IDs numéricos no reemplazan la aprobación de una identidad compartida. El informe no exporta el contenido de esos campos; conserva únicamente tipos, longitudes y huellas SHA-256.

Las demás diferencias de `resumen` en fichas incluidas en ese diagnóstico eran cadenas vacías frente a `NULL`, que la normalización documentada considera equivalentes. Las diferencias reales de los tres campos de la tabla anterior no se normalizan ni se descartan.

## Precaución sobre la migración histórica

El importador histórico `scripts/migrar-supabase.js` inserta filas y usa `ON CONFLICT (...) DO NOTHING`. Por lo tanto, volver a ejecutar ese importador no actualiza una fila que ya existe en PostgreSQL. Esto es un posible motivo por el que una copia PostgreSQL conserve contenido anterior, pero el código por sí solo no demuestra que esa sea la causa de estas tres diferencias.

No corregirlas con una importación masiva ni con un `UPDATE` automático. Primero hay que revisar el contenido original y establecer qué copia es la fuente aprobada para cada campo. Hasta entonces, las tres diferencias deben permanecer como pendientes de revisión manual.
