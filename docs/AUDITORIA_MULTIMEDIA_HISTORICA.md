# Auditoría de multimedia histórica

Esta auditoría prepara la revisión de multimedia antes de la reconciliación inicial. Es **solo lectura**: no actualiza filas, no carga ni elimina objetos y no se conecta a Supabase o Render.

## Requisitos

- Una copia PostgreSQL restaurada en `museo_reconciliacion_prueba`, accesible únicamente por `127.0.0.1:5432`.
- Una carpeta local que contenga los archivos que se quieren verificar.
- Dependencias del proyecto instaladas (`npm install`).

La carpeta de archivos puede contener ambas estructuras:

- `imagenes/multimedia/...` para rutas históricas locales.
- `multimedia/...` para objetos de Storage descargados y colocados localmente, conservando su clave de objeto.

Las URL públicas del bucket `multimedia` se convierten en claves locales. La herramienta no descarga esas URL ni realiza solicitudes HTTP.

## Ejecución en PowerShell

Desde la raíz del proyecto:

```powershell
$env:RECONCILIACION_POSTGRES_URL = "postgresql://postgres:TU_PASSWORD@127.0.0.1:5432/museo_reconciliacion_prueba"
$env:RECONCILIACION_ARCHIVOS_ROOT = "C:\ruta\a\la\carpeta\que\contiene\imagenes-y-multimedia"
$env:RECONCILIACION_MULTIMEDIA_AUDITORIA = "$PWD\auditoria-multimedia-historica.json"
node .\scripts\auditar-multimedia-historica.js
```

Reemplazá `TU_PASSWORD` por la contraseña local de PostgreSQL y la ruta por la carpeta real. No uses el `.env` de producción ni pegues credenciales en GitHub.

El archivo de salida no se sobrescribe. Si ya existe, elegí otro nombre o mové el informe anterior.

## Estados del informe

- `verificado`: el archivo existe y coincide con checksum y tamaño guardados.
- `checksum_pendiente`: se encontró el archivo, pero la fila no tiene un checksum válido.
- `checksum_no_coincide`: el SHA-256 guardado no coincide con los bytes del archivo.
- `tamano_no_coincide`: el tamaño guardado no coincide.
- `archivo_no_encontrado`: no se encontró el archivo en la carpeta indicada.

Un checksum pendiente no se completa automáticamente. El informe sirve para revisar las coincidencias antes de preparar cualquier cambio manual en la copia de prueba.

## Protección del destino

La herramienta rechaza cualquier destino distinto de `museo_reconciliacion_prueba` en `localhost:5432`, abre una transacción `READ ONLY` y comprueba la identidad efectiva de la conexión. También rechaza rutas absolutas, traversal y enlaces simbólicos que salgan de la carpeta permitida.
