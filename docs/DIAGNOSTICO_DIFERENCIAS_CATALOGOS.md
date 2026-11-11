# Diagnóstico de diferencias en plantilla y etiqueta

Este diagnóstico compara, por clave primaria, los campos de las tablas `plantilla` y `etiqueta` entre una copia SQLite y la copia PostgreSQL aislada.

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
