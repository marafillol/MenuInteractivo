#!/usr/bin/env node
/**
 * Exporta únicamente los tres campos de ficha que el diagnóstico marcó distintos.
 * SOLO LECTURA: SQLite OPEN_READONLY + PostgreSQL BEGIN READ ONLY.
 * Destino PostgreSQL estrictamente limitado a localhost:5432/museo_reconciliacion_prueba.
 * No accede a Render, Supabase remoto, archivos multimedia ni datos de usuarios.
 *
 * Requiere:
 *   RECONCILIACION_SQLITE_PATH (copia aislada museo_reconciliacion_prueba.sqlite)
 *   RECONCILIACION_POSTGRES_URL
 * Salida opcional:
 *   RECONCILIACION_FICHAS_SALIDA
 */
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sqlite3 = require("sqlite3");
const { Client } = require("pg");

const SQLITE_PATH = process.env.RECONCILIACION_SQLITE_PATH;
const POSTGRES_URL = process.env.RECONCILIACION_POSTGRES_URL;
const OUTPUT = process.env.RECONCILIACION_FICHAS_SALIDA ||
  path.resolve(process.cwd(), "fichas-diferencias-lectura.json");
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
function allSQLite(db, sql, params) {
  return new Promise((resolve, reject) =>
    db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows))
  );
}
function cerrarSQLite(db) {
  return new Promise(resolve => db.close(() => resolve()));
}
function normalizarJson(valor) {
  if (typeof valor !== "string") return valor;
  try { return JSON.parse(valor); } catch { return valor; }
}
function canonico(valor) {
  if (Array.isArray(valor)) return valor.map(canonico);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.keys(valor).sort().map(k => [k, canonico(valor[k])]));
  }
  return valor;
}
function resumen(valor) {
  const serializado = JSON.stringify(valor);
  return {
    tipo: valor === null ? "null" : Array.isArray(valor) ? "array" : typeof valor,
    longitud: typeof valor === "string" ? valor.length : Buffer.byteLength(serializado ?? "null", "utf8"),
    sha256: crypto.createHash("sha256").update(serializado ?? "null").digest("hex")
  };
}

async function main() {
  if (!SQLITE_PATH || !fs.existsSync(SQLITE_PATH)) {
    throw new Error("RECONCILIACION_SQLITE_PATH debe apuntar a una copia SQLite existente.");
  }
  if (path.basename(SQLITE_PATH).toLowerCase() !== "museo_reconciliacion_prueba.sqlite") {
    throw new Error("Por seguridad, solo se admite la copia museo_reconciliacion_prueba.sqlite.");
  }
  if (path.resolve(SQLITE_PATH) === path.resolve("database/museo.db")) {
    throw new Error("Se bloqueó el acceso a la base del proyecto.");
  }
  validarDestinoSeguro(POSTGRES_URL);
  if (fs.existsSync(OUTPUT)) throw new Error("El archivo de salida ya existe; elegí otro nombre para no sobrescribirlo.");

  const sqlite = await abrirSQLite(SQLITE_PATH);
  const pg = new Client({ connectionString: POSTGRES_URL, ssl: false });
  let transaccion = false;
  try {
    await pg.connect();
    await pg.query("BEGIN READ ONLY");
    transaccion = true;

    const sqliteRows = await allSQLite(
      sqlite,
      'SELECT id_ficha, titulo, texto, datos_json FROM ficha WHERE id_ficha IN (?, ?, ?) ORDER BY id_ficha',
      IDS
    );
    const { rows: pgRows } = await pg.query(
      'SELECT id_ficha, titulo, texto, datos_json FROM public.ficha WHERE id_ficha = ANY($1::bigint[]) ORDER BY id_ficha',
      [IDS]
    );
    const byId = rows => new Map(rows.map(row => [String(row.id_ficha), row]));
    const a = byId(sqliteRows);
    const b = byId(pgRows);
    const fichas = IDS.map(id => {
      const sqliteRow = a.get(String(id)) || null;
      const postgresRow = b.get(String(id)) || null;
      const proyectar = row => row ? {
        titulo: row.titulo ?? null,
        texto: row.texto ?? null,
        datos_json: canonico(normalizarJson(row.datos_json ?? null))
      } : null;
      const sqliteValue = proyectar(sqliteRow);
      const postgresValue = proyectar(postgresRow);
      return {
        id_ficha: id,
        sqlite: sqliteValue,
        postgres: postgresValue,
        resumen: {
          sqlite: sqliteValue ? {
            texto: resumen(sqliteValue.texto),
            datos_json: resumen(sqliteValue.datos_json)
          } : null,
          postgres: postgresValue ? {
            texto: resumen(postgresValue.texto),
            datos_json: resumen(postgresValue.datos_json)
          } : null
        }
      };
    });

    await pg.query("COMMIT");
    transaccion = false;
    const informe = {
      formato: 1,
      modo: "solo_lectura",
      sqlite: path.basename(SQLITE_PATH),
      postgres: "museo_reconciliacion_prueba",
      fichas,
      aviso: "Exportación limitada a id_ficha, titulo, texto y datos_json para las fichas 10, 28 y 30. No modifica ninguna base."
    };
    fs.writeFileSync(OUTPUT, JSON.stringify(informe, null, 2), { flag: "wx" });
    console.log("Comparación de solo lectura generada:", OUTPUT);
    for (const ficha of fichas) {
      console.log(`Ficha ${ficha.id_ficha}: SQLite=${ficha.sqlite ? "presente" : "ausente"}; PostgreSQL=${ficha.postgres ? "presente" : "ausente"}`);
    }
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
