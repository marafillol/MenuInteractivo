#!/usr/bin/env node
/**
 * Reparación puntual de tres diferencias históricas de ficha.
 *
 * SEGURIDAD:
 * - Solo acepta PostgreSQL localhost:5432/museo_reconciliacion_prueba.
 * - Solo acepta la copia SQLite museo_reconciliacion_prueba.sqlite.
 * - Genera un backup custom-format con pg_dump ANTES de cualquier UPDATE.
 * - Si el backup falla, no conecta para escribir.
 * - Verifica los valores actuales de destino bajo FOR UPDATE.
 * - Solo modifica ficha 10.texto, ficha 28.datos_json y ficha 30.datos_json.
 * - Una sola transacción; ante cualquier diferencia inesperada hace ROLLBACK.
 * - No accede a Render, Supabase remoto ni archivos multimedia.
 *
 * Requiere:
 *   RECONCILIACION_SQLITE_PATH
 *   RECONCILIACION_POSTGRES_URL
 * Opcionales:
 *   RECONCILIACION_PG_DUMP (ruta a pg_dump.exe)
 *   RECONCILIACION_BACKUP_DIR (directorio de backups; default: ./backups-reconciliacion)
 *
 * Ejecutar manualmente después de revisar el backup y confirmar el destino.
 */
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const sqlite3 = require("sqlite3");
const { Client } = require("pg");

const SQLITE_PATH = process.env.RECONCILIACION_SQLITE_PATH;
const POSTGRES_URL = process.env.RECONCILIACION_POSTGRES_URL;
const BACKUP_DIR = path.resolve(process.env.RECONCILIACION_BACKUP_DIR || "backups-reconciliacion");
const PG_DUMP = process.env.RECONCILIACION_PG_DUMP ||
  "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe";

function validarDestino(connectionString) {
  let url;
  try { url = new URL(String(connectionString || "")); }
  catch { throw new Error("RECONCILIACION_POSTGRES_URL no es válida."); }
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.port !== "5432" ||
    url.pathname.replace(/^\/+/, "") !== "museo_reconciliacion_prueba" ||
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    decodeURIComponent(url.username) !== "postgres"
  ) {
    throw new Error("BLOQUEADO: solo se permite postgres@localhost:5432/museo_reconciliacion_prueba.");
  }
  return { host: url.hostname, port: "5432", database: "museo_reconciliacion_prueba", user: "postgres" };
}

function abrirSQLite(file) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, error => error ? reject(error) : resolve(db));
  });
}
function allSQLite(db, sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
}
function cerrarSQLite(db) {
  return new Promise(resolve => db.close(() => resolve()));
}
function parseJson(value) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}
function igualJson(a, b) {
  return JSON.stringify(canon(parseJson(a))) === JSON.stringify(canon(parseJson(b)));
}
function canon(value) {
  if (Array.isArray(value)) return value.map(canon);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canon(value[key])]));
  }
  return value;
}
function crearBackup(destino) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = path.join(BACKUP_DIR, `museo_reconciliacion_prueba-antes-reparacion-${stamp}.dump`);
  if (fs.existsSync(backup)) throw new Error("El archivo de backup ya existe; no se sobrescribirá.");
  if (!fs.existsSync(PG_DUMP)) throw new Error(`No se encontró pg_dump en: ${PG_DUMP}. Configurá RECONCILIACION_PG_DUMP.`);

  console.log("Generando backup PostgreSQL antes de cualquier escritura...");
  console.log(`Destino validado: ${destino.user}@${destino.host}:${destino.port}/${destino.database}`);
  const result = spawnSync(PG_DUMP, [
    "-h", destino.host, "-p", destino.port, "-U", destino.user,
    "-d", destino.database, "-F", "c", "-f", backup, "-W"
  ], { stdio: "inherit", windowsHide: true });
  if (result.error) throw new Error(`No se pudo ejecutar pg_dump: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`pg_dump terminó con código ${result.status}; no se modificó la base.`);
  const stat = fs.statSync(backup);
  if (!stat.isFile() || stat.size < 1024) throw new Error("El backup generado no supera la validación mínima; no se modificó la base.");
  console.log(`Backup creado: ${backup} (${stat.size} bytes)`);
  return backup;
}

async function main() {
  if (!SQLITE_PATH || !fs.existsSync(SQLITE_PATH)) {
    throw new Error("RECONCILIACION_SQLITE_PATH debe apuntar a la copia SQLite de pruebas.");
  }
  if (path.basename(SQLITE_PATH).toLowerCase() !== "museo_reconciliacion_prueba.sqlite") {
    throw new Error("BLOQUEADO: solo se admite museo_reconciliacion_prueba.sqlite.");
  }
  if (path.resolve(SQLITE_PATH) === path.resolve("database/museo.db")) {
    throw new Error("BLOQUEADO: no se permite usar la base del proyecto.");
  }
  const destino = validarDestino(POSTGRES_URL);

  const sqlite = await abrirSQLite(SQLITE_PATH);
  let origen;
  try {
    const rows = await allSQLite(
      sqlite,
      "SELECT id_ficha, texto, datos_json FROM ficha WHERE id_ficha IN (10, 28, 30) ORDER BY id_ficha"
    );
    origen = new Map(rows.map(row => [Number(row.id_ficha), row]));
  } finally {
    await cerrarSQLite(sqlite);
  }

  const f10 = origen.get(10);
  const f28 = origen.get(28);
  const f30 = origen.get(30);
  if (!f10 || typeof f10.texto !== "string" || f10.texto.length !== 1414) {
    throw new Error("La fuente SQLite no coincide con la evidencia revisada para ficha 10; abortado.");
  }
  const json28 = parseJson(f28?.datos_json);
  const json30 = parseJson(f30?.datos_json);
  if (!f28 || json28?.["Lugar de nacimiento"] !== "Tucumán") {
    throw new Error("La fuente SQLite no coincide con la evidencia revisada para ficha 28; abortado.");
  }
  if (!f30 || json30?.["Edad en 1982"] !== "20 Años" || json30?.["Lugar de nacimiento"] !== "Cinco Saltos") {
    throw new Error("La fuente SQLite no coincide con la evidencia revisada para ficha 30; abortado.");
  }

  // Por defecto solo prepara el plan. La escritura exige --apply explícito.
  if (!process.argv.includes("--apply")) {
    console.log("PLAN VALIDADO; no se modificó ninguna base.");
    console.log("- Ficha 10: se restauraría únicamente texto (1414 caracteres).");
    console.log("- Ficha 28: se restauraría únicamente datos_json (lugar de nacimiento: Tucumán).");
    console.log("- Ficha 30: se restauraría únicamente datos_json (edad y lugar de nacimiento).");
    console.log("Para aplicar: volver a ejecutar agregando --apply. Se exigirá un pg_dump previo.");
    return;
  }

  // Backup completo obligatorio. pg_dump solicita la contraseña si no hay .pgpass.
  const backup = crearBackup(destino);

  const pg = new Client({ connectionString: POSTGRES_URL, ssl: false });
  let inTransaction = false;
  try {
    await pg.connect();
    await pg.query("BEGIN");
    inTransaction = true;
    await pg.query("SET LOCAL lock_timeout = '5s'");
    await pg.query("SET LOCAL statement_timeout = '30s'");

    const { rows } = await pg.query(
      "SELECT id_ficha, texto, datos_json FROM public.ficha WHERE id_ficha = ANY($1::bigint[]) ORDER BY id_ficha FOR UPDATE",
      [[10, 28, 30]]
    );
    const destinoRows = new Map(rows.map(row => [Number(row.id_ficha), row]));
    if (rows.length !== 3) throw new Error("No están las tres fichas en PostgreSQL; ROLLBACK.");

    const pg10 = destinoRows.get(10);
    const pg28 = destinoRows.get(28);
    const pg30 = destinoRows.get(30);
    if (pg10.texto !== "") throw new Error("Ficha 10 ya no tiene texto vacío; cambió desde el diagnóstico. ROLLBACK.");
    if (pg28.texto !== "" || !igualJson(pg28.datos_json, {})) {
      throw new Error("Ficha 28 cambió desde el diagnóstico. ROLLBACK.");
    }
    if (!igualJson(pg30.datos_json, {})) {
      throw new Error("Ficha 30 cambió desde el diagnóstico. ROLLBACK.");
    }

    const u10 = await pg.query(
      "UPDATE public.ficha SET texto = $1 WHERE id_ficha = 10 AND texto = ''",
      [f10.texto]
    );
    if (u10.rowCount !== 1) throw new Error("No se pudo actualizar exactamente ficha 10; ROLLBACK.");

    const u28 = await pg.query(
      "UPDATE public.ficha SET datos_json = $1 WHERE id_ficha = 28 AND datos_json::text = '{}'",
      [JSON.stringify(json28)]
    );
    if (u28.rowCount !== 1) throw new Error("No se pudo actualizar exactamente ficha 28; ROLLBACK.");

    const u30 = await pg.query(
      "UPDATE public.ficha SET datos_json = $1 WHERE id_ficha = 30 AND datos_json::text = '{}'",
      [JSON.stringify(json30)]
    );
    if (u30.rowCount !== 1) throw new Error("No se pudo actualizar exactamente ficha 30; ROLLBACK.");

    const { rows: verificacion } = await pg.query(
      "SELECT id_ficha, texto, datos_json FROM public.ficha WHERE id_ficha = ANY($1::bigint[]) ORDER BY id_ficha",
      [[10, 28, 30]]
    );
    const check = new Map(verificacion.map(row => [Number(row.id_ficha), row]));
    if (
      check.get(10)?.texto !== f10.texto ||
      !igualJson(check.get(28)?.datos_json, json28) ||
      !igualJson(check.get(30)?.datos_json, json30)
    ) {
      throw new Error("La verificación posterior a los UPDATE no coincide; ROLLBACK.");
    }

    await pg.query("COMMIT");
    inTransaction = false;
    console.log("REPARACIÓN COMPLETADA en la base local de pruebas.");
    console.log("- Ficha 10: texto restaurado (1414 caracteres).");
    console.log("- Ficha 28: datos_json restaurado (lugar de nacimiento: Tucumán).");
    console.log("- Ficha 30: datos_json restaurado (edad y lugar de nacimiento).");
    console.log(`Backup previo: ${backup}`);
    console.log("No se modificó ningún otro campo ni registro.");
  } finally {
    if (inTransaction) await pg.query("ROLLBACK").catch(() => {});
    await pg.end().catch(() => {});
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error("REPARACIÓN DETENIDA:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { validarDestino, parseJson, igualJson, canon };
