[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$BackupPath)
$ErrorActionPreference = 'Stop'
$ExpectedSha256 = 'f5817b9bf741f121fe816c8756091b99a14698c7c6187a68742c709031e49cce'
$DbHost = '127.0.0.1'; $DbPort = '5432'; $DbName = 'museo_reconciliacion_prueba'; $DbUser = 'postgres'
$PsqlExe = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $PsqlExe) {
    $candidatePsql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
    if (Test-Path -LiteralPath $candidatePsql) { $PsqlExe = $candidatePsql }
}
function Invoke-Psql { param([string[]]$Arguments); & $PsqlExe @Arguments; if ($LASTEXITCODE -ne 0) { throw "psql terminó con código $LASTEXITCODE. No se continúa." } }
if (-not (Test-Path -LiteralPath $BackupPath -PathType Leaf)) { throw "No existe el archivo SQL indicado: $BackupPath" }
$BackupPath = (Resolve-Path -LiteralPath $BackupPath).Path
$actualHash = (Get-FileHash -LiteralPath $BackupPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $ExpectedSha256) { throw "SHA-256 inesperado. Esperado $ExpectedSha256; recibido $actualHash. No se restaura." }
if (-not $PsqlExe) { throw "No se encontró psql en PATH ni en PostgreSQL 18 instalado en C:\Program Files\PostgreSQL\18\bin." }
Write-Host ("Destino permitido: {0}:{1}/{2}" -f $DbHost,$DbPort,$DbName)
$existing = & $PsqlExe -X -h $DbHost -p $DbPort -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public';"
if ($LASTEXITCODE -ne 0) { throw "No se pudo consultar la base local autorizada." }
if ([int]$existing -ne 0) { throw "La base $DbName ya contiene tablas públicas ($existing). No se borra ni sobrescribe nada." }
Write-Host "Restaurando el SQL completo (solo en la base local vacía)..."
Invoke-Psql @('-X','-h',$DbHost,'-p',$DbPort,'-U',$DbUser,'-d',$DbName,'-v','ON_ERROR_STOP=1','-f',$BackupPath)
$check = @'
DO $$
DECLARE
 expected jsonb := '{"configuracion":2,"configuracion_backup_tilde":1,"etiqueta":5,"ficha":55,"ficha_etiqueta":34,"menu":3,"multimedia":21,"plantilla":3,"relacion_ficha":1}'::jsonb;
 item record; actual bigint; fk_count integer;
BEGIN
 FOR item IN SELECT key, value::text::bigint AS n FROM jsonb_each(expected) LOOP
  EXECUTE format('SELECT count(*) FROM public.%I', item.key) INTO actual;
  IF actual <> item.n THEN RAISE EXCEPTION 'Conteo incorrecto en %: esperado %, obtenido %', item.key, item.n, actual; END IF;
 END LOOP;
 SELECT count(*) INTO fk_count FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND contype = 'f';
 IF fk_count <> 7 THEN RAISE EXCEPTION 'Se esperaban 7 FK; se encontraron %', fk_count; END IF;
END $$;
'@
$tempCheck = Join-Path ([System.IO.Path]::GetTempPath()) ("museo-backup-check-" + [guid]::NewGuid().ToString('N') + ".sql")
try { [System.IO.File]::WriteAllText($tempCheck, $check, [System.Text.UTF8Encoding]::new($false)); Invoke-Psql @('-X','-h',$DbHost,'-p',$DbPort,'-U',$DbUser,'-d',$DbName,'-v','ON_ERROR_STOP=1','-f',$tempCheck) } finally { Remove-Item -LiteralPath $tempCheck -Force -ErrorAction SilentlyContinue }
# El backfill se prueba contra las filas restauradas dentro de una transacción que se revierte.
$candidatePath = Join-Path $PSScriptRoot '..\migraciones\migracion-identidades-supabase-candidata.sql'
$candidate = Get-Content -LiteralPath $candidatePath -Raw
$candidate = $candidate -replace '(?m)^BEGIN;\s*', ''
$candidate = $candidate -replace '(?m)^ROLLBACK;\s*$', ''
$assertions = @'
DO $$
DECLARE item record; total bigint; with_ids bigint; unique_ids bigint;
BEGIN
 FOR item IN SELECT * FROM (VALUES ('plantilla',3),('menu',3),('ficha',55),('etiqueta',5),('multimedia',21),('relacion_ficha',1),('ficha_etiqueta',34)) AS expected(table_name, expected_count) LOOP
  EXECUTE format('SELECT count(*), count(sync_id), count(DISTINCT sync_id) FROM public.%I', item.table_name) INTO total, with_ids, unique_ids;
  IF total <> item.expected_count OR with_ids <> total OR unique_ids <> total THEN RAISE EXCEPTION 'Backfill incorrecto en %: total %, con UUID %, UUID distintos %', item.table_name, total, with_ids, unique_ids; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT sync_id) FROM (SELECT sync_id FROM public.plantilla UNION ALL SELECT sync_id FROM public.menu UNION ALL SELECT sync_id FROM public.ficha UNION ALL SELECT sync_id FROM public.etiqueta UNION ALL SELECT sync_id FROM public.multimedia UNION ALL SELECT sync_id FROM public.relacion_ficha UNION ALL SELECT sync_id FROM public.ficha_etiqueta) all_ids) <> 122 THEN RAISE EXCEPTION 'No se obtuvieron exactamente 122 UUID globales distintos'; END IF;
END $$;
ROLLBACK;
'@
$tempMigration = Join-Path ([System.IO.Path]::GetTempPath()) ("museo-backfill-check-" + [guid]::NewGuid().ToString('N') + ".sql")
try { [System.IO.File]::WriteAllText($tempMigration, ('BEGIN;' + [Environment]::NewLine + $candidate + [Environment]::NewLine + $assertions), [System.Text.UTF8Encoding]::new($false)); Invoke-Psql @('-X','-h',$DbHost,'-p',$DbPort,'-U',$DbUser,'-d',$DbName,'-v','ON_ERROR_STOP=1','-f',$tempMigration) } finally { Remove-Item -LiteralPath $tempMigration -Force -ErrorAction SilentlyContinue }
Write-Host 'VALIDACIÓN COMPLETA APROBADA.'
Write-Host 'El dump completo quedó restaurado en la base local de pruebas.'
Write-Host 'El backfill candidato se ejecutó contra todas las filas y se revirtió.'
Write-Host 'No se conectó a Supabase ni se modificó Render.'
