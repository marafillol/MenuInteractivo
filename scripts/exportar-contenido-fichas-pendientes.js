#!/usr/bin/env node
/**
 * Exporta únicamente el contenido de los tres campos pendientes de fichas
 * para revisión manual. SQLite OPEN_READONLY + PostgreSQL BEGIN READ ONLY.
 * No escribe en ninguna base, no accede a Supabase/Render y no exporta IDs de usuario.
 *
 * Requiere:
 * RECONCILIACION_SQLITE_PATH
 * RECONCILIACION_POSTGRES_URL (solo localhost:5432/museo_reconciliacion_prueba)
 * Salida opcional: RECONCILIACION_CONTENIDO_SALIDA
 */
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sqlite3 = require("sqlite3");
const { Client } = require("pg");

const SQLITE_PATH = process.env.RECONCILIACION_SQLITE_PATH;
const POSTGRES_URL = process.env.RECONCILIACION_POSTGRES_URL;
const OUTPUT = process.env.RECONCILIACION_CONTENIDO_SALIDA ||
  path.resolve(process.cwd(), "contenido-fichas-pendientes.json");
const IDS = [10, 28, 30];

function validarDestinoSeguro(connectionString) {
  let destino;
  try { destino = new URL(String(connectionString || "")); }
  catch { throw new Error("URL de PostgreSQL inválida."); }
  if (
    !["127.0.0.1", "localhost"].includes(destino.hostname) ||
    destino.port !== "5432" ||
    destino.pathname.replace(/^\/+/, "") !== "museo_reconciliacion_prueba" ||
    !["postgres:", "postgresql:"].includes(destino.protocol)
  ) {
    throw new Error("Conexión bloqueada: solo se permite museo_reconciliacion_prueba en localhost:5432.");
  }
}

function abrirSQLite(ruta) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(ruta, sqlite3.OPEN_READONLY, error => {
      if (error) return reject(error);
      resolve(db);
    });
  });
}
function allSQLite(db, sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
}
function cerrarSQLite(db) {
  return new Promise(resolve => db.close(() => resolve()));
}
function parsearJson(value) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}
function huella(value) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return crypto.createHash("sha256").update(serialized === undefined ? "undefined" : serialized).digest("hex");
}
function prepararFila(row) {
  return {
    id_ficha: String(row.id_ficha),
    titulo: row.titulo ?? null,
    texto: row.texto ?? null,
    datos_json: parsearJson(row.datos_json),
    huellas: {
      texto: huella(row.texto ?? null),
      datos_json: huella(parsearJson(row.datos_json))
    }
  };
}

async function main() {
  if (!SQLITE_PATH || !fs.existsSync(SQLITE_PATH)) {
    throw new Error("RECONCILIACION_SQLITE_PATH debe apuntar a una copia SQLite existente.");
  }
  validarDestinoSeguro(POSTGRES_URL);
  if (fs.existsSync(OUTPUT)) {
    throw new Error("El archivo de salida ya existe; elegí otro nombre para no sobrescribirlo.");
  }

  const sqlite = await abrirSQLite(SQLITE_PATH);
  const pg = new Client({ connectionString: POSTGRES_URL, ssl: false });
  let transaccion = false;
  try {
    await pg.connect();
    await pg.query("BEGIN READ ONLY");
    transaccion = true;

    const placeholders = IDS.map(() => "?").join(",");
    const filasSqlite = await allSQLite(
      sqlite,
      `SELECT id_ficha, titulo, texto, datos_json FROM ficha WHERE id_ficha IN (${placeholders}) ORDER BY id_ficha`,
      IDS
    );
    const { rows: filasPg } = await pg.query(
      "SELECT id_ficha, titulo, texto, datos_json FROM public.ficha WHERE id_ficha = ANY($1::bigint[]) ORDER BY id_ficha",
      [IDS]
    );

    const informe = {
      formato: 1,
      modo: "solo_lectura",
      sqlite: path.basename(SQLITE_PATH),
      postgres: "museo_reconciliacion_prueba",
      ids_revisados: IDS,
      aviso: "Contiene solo titulo, texto y datos_json de las fichas 10, 28 y 30. No incluye IDs de usuario, rutas ni credenciales. No modifica ninguna base.",
      sqlite_fichas: filasSqlite.map(prepararFila),
      postgres_fichas: filasPg.map(prepararFila)
    };

    await pg.query("COMMIT");
    transaccion = false;
    const temporal = OUTPUT + ".tmp";
    fs.writeFileSync(temporal, JSON.stringify(informe, null, 2), { flag: "wx" });
    fs.renameSync(temporal, OUTPUT);
    console.log("Exportación de solo lectura generada:", OUTPUT);
    console.log(`Filas: SQLite=${filasSqlite.length}; PostgreSQL=${filasPg.length}`);
  } finally {
    if (transaccion) await pg.query("ROLLBACK").catch(() => {});
    await pg.end().catch(() => {});
    await cerrarSQLite(sqlite);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error("Exportación detenida:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { parsearJson, huella, prepararFila, validarDestinoSeguro };
