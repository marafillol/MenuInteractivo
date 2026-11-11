#!/usr/bin/env node
/**
 * Diagnóstico de diferencias por campo entre copias SQLite y PostgreSQL.
 * Solo lectura: SQLite OPEN_READONLY + PostgreSQL BEGIN READ ONLY.
 * No exporta valores: informa únicamente tipo, longitud y SHA-256 por campo.
 *
 * Requiere:
 * RECONCILIACION_SQLITE_PATH
 * RECONCILIACION_POSTGRES_URL
 * Salida opcional: RECONCILIACION_DIAGNOSTICO_SALIDA
 */
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sqlite3 = require("sqlite3");
const { Client } = require("pg");

const SQLITE_PATH = process.env.RECONCILIACION_SQLITE_PATH;
const POSTGRES_URL = process.env.RECONCILIACION_POSTGRES_URL;
const OUTPUT = process.env.RECONCILIACION_DIAGNOSTICO_SALIDA ||
  path.resolve(process.cwd(), "diagnostico-catalogos.json");

const TABLAS = {
  plantilla: { pk: "id_plantilla", ignorar: ["id_plantilla", "creado", "actualizado"], json: ["plantilla_json"], booleanos: ["activo"] },
  etiqueta: { pk: "id_etiqueta", ignorar: ["id_etiqueta"], json: [], booleanos: ["activo"] },
  // id_usuario se excluye expresamente: el diagnóstico no debe exponer
  // asociaciones con cuentas ni comparar datos de usuarios.
  ficha: {
    pk: "id_ficha",
    ignorar: ["id_ficha", "id_menu", "id_usuario", "imagen", "imagen_storage_key", "imagen_checksum_sha256", "imagen_mime_type", "imagen_tamano_bytes", "creado", "actualizado", "sync_id", "sync_version", "sync_deleted_at"],
    json: ["datos_json"],
    booleanos: ["visible"]
  }
};

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
function allSQLite(db, sql) {
  return new Promise((resolve, reject) => db.all(sql, [], (error, rows) => error ? reject(error) : resolve(rows)));
}
function cerrarSQLite(db) {
  return new Promise(resolve => db.close(() => resolve()));
}
function canonico(value) {
  if (Array.isArray(value)) return value.map(canonico);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonico(value[k])]));
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}
function normalizar(tabla, campo, valor) {
  if (TABLAS[tabla].booleanos.includes(campo) && (valor === 0 || valor === 1 || valor === "0" || valor === "1")) return valor === 1 || valor === "1";
  if (TABLAS[tabla].json.includes(campo) && typeof valor === "string") {
    try { return canonico(JSON.parse(valor)); } catch { return valor; }
  }
  if (tabla === "ficha" && ["resumen", "texto"].includes(campo) && valor === "") {
    return null;
  }
  return canonico(valor);
}
function resumen(valor) {
  const tipo = valor === null ? "null" : Array.isArray(valor) ? "array" : valor instanceof Date ? "date" : typeof valor;
  let serializado;
  try { serializado = JSON.stringify(valor); } catch { serializado = String(valor); }
  return {
    tipo,
    longitud: typeof valor === "string" ? valor.length : serializado === undefined ? 0 : Buffer.byteLength(serializado, "utf8"),
    sha256: crypto.createHash("sha256").update(serializado === undefined ? "undefined" : serializado).digest("hex")
  };
}
function resumenCampo(tabla, campo, valor) {
  return {
    original: resumen(valor),
    normalizado: resumen(normalizar(tabla, campo, valor))
  };
}
function normalizarId(valor) {
  if (typeof valor === "number" && Number.isSafeInteger(valor)) return String(valor);
  if (typeof valor === "string" && /^-?(0|[1-9][0-9]*)$/.test(valor)) return valor;
  return String(valor);
}
async function columnasPostgres(client, tabla) {
  const { rows } = await client.query(
    "SELECT column_name, data_type, udt_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
    [tabla]
  );
  return rows;
}

async function main() {
  if (!SQLITE_PATH || !fs.existsSync(SQLITE_PATH)) {
    throw new Error("RECONCILIACION_SQLITE_PATH debe apuntar a una copia SQLite existente.");
  }
  validarDestinoSeguro(POSTGRES_URL);

  const sqlite = await abrirSQLite(SQLITE_PATH);
  const pg = new Client({ connectionString: POSTGRES_URL, ssl: false });
  let transaccion = false;
  try {
    await pg.connect();
    await pg.query("BEGIN READ ONLY");
    transaccion = true;
    const informe = {
      formato: 1,
      modo: "solo_lectura",
      sqlite: path.basename(SQLITE_PATH),
      postgres: "museo_reconciliacion_prueba",
      aviso: "No contiene valores de registros; solo tipos, longitudes y huellas SHA-256. Excluye IDs de usuario, dependencias y rutas físicas. Normaliza JSON y booleanos 0/1.",
      tablas: {}
    };

    for (const [tabla, config] of Object.entries(TABLAS)) {
      const filasSqlite = await allSQLite(sqlite, `SELECT * FROM "${tabla}" ORDER BY "${config.pk}"`);
      const { rows: filasPg } = await pg.query(`SELECT * FROM public."${tabla}" ORDER BY "${config.pk}"`);
      const columnasSqlite = await allSQLite(sqlite, `PRAGMA table_info("${tabla}")`);
      const columnas = [...new Set([
        ...columnasSqlite.map(c => c.name),
        ...(await columnasPostgres(pg, tabla)).map(c => c.column_name)
      ])];
      const mapaSqlite = new Map(filasSqlite.map(f => [normalizarId(f[config.pk]), f]));
      const mapaPg = new Map(filasPg.map(f => [normalizarId(f[config.pk]), f]));
      const ids = [...new Set([...mapaSqlite.keys(), ...mapaPg.keys()])].sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
      const registros = [];

      for (const id of ids) {
        const a = mapaSqlite.get(id);
        const b = mapaPg.get(id);
        const campos = {};
        for (const campo of columnas) {
          if (config.ignorar.includes(campo)) continue;
          const existeA = a && Object.prototype.hasOwnProperty.call(a, campo);
          const existeB = b && Object.prototype.hasOwnProperty.call(b, campo);
          if (!existeA && !existeB) continue;
          const sa = existeA ? resumenCampo(tabla, campo, a[campo]) : null;
          const sb = existeB ? resumenCampo(tabla, campo, b[campo]) : null;
          const coincideNormalizado = Boolean(sa && sb && sa.normalizado.sha256 === sb.normalizado.sha256);
          campos[campo] = {
            estado: !sa ? "solo_postgres" : !sb ? "solo_sqlite" :
              coincideNormalizado ? "coincide_normalizado" : "difiere",
            sqlite: sa,
            postgres: sb
          };
        }
        registros.push({ clave: { [config.pk]: id }, estado: !a ? "solo_postgres" : !b ? "solo_sqlite" : "presente_en_ambas", campos });
      }

      const resumenCampos = {};
      for (const campo of columnas.filter(c => !config.ignorar.includes(c))) {
        const estados = registros.flatMap(r => r.campos[campo] ? [r.campos[campo].estado] : []);
        resumenCampos[campo] = {
          coincide_normalizado: estados.filter(e => e === "coincide_normalizado").length,
          difiere: estados.filter(e => e === "difiere").length,
          solo_sqlite: estados.filter(e => e === "solo_sqlite").length,
          solo_postgres: estados.filter(e => e === "solo_postgres").length
        };
      }
      informe.tablas[tabla] = {
        cantidad_sqlite: filasSqlite.length,
        cantidad_postgres: filasPg.length,
        columnas_sqlite: columnasSqlite.map(c => c.name),
        columnas_postgres: await columnasPostgres(pg, tabla),
        tipos_sqlite: columnasSqlite.map(c => ({ columna: c.name, tipo: c.type, notnull: c.notnull, default: c.dflt_value })),
        resumen_campos: resumenCampos,
        registros
      };
    }

    await pg.query("COMMIT");
    transaccion = false;
    const temporal = OUTPUT + ".tmp";
    fs.writeFileSync(temporal, JSON.stringify(informe, null, 2), { flag: "wx" });
    fs.renameSync(temporal, OUTPUT);
    console.log("Diagnóstico de solo lectura generado:", OUTPUT);
    for (const [tabla, datos] of Object.entries(informe.tablas)) {
      console.log(`${tabla}: SQLite=${datos.cantidad_sqlite}; PostgreSQL=${datos.cantidad_postgres}`);
      for (const [campo, cuenta] of Object.entries(datos.resumen_campos)) {
        if (cuenta.difiere || cuenta.solo_sqlite || cuenta.solo_postgres) {
          console.log(`  ${campo}: difiere=${cuenta.difiere}; solo SQLite=${cuenta.solo_sqlite}; solo PostgreSQL=${cuenta.solo_postgres}`);
        }
      }
    }
  } finally {
    if (transaccion) await pg.query("ROLLBACK").catch(() => {});
    await pg.end().catch(() => {});
    await cerrarSQLite(sqlite);
  }
}

main().catch(error => {
  console.error("Diagnóstico detenido:", error.message);
  process.exitCode = 1;
});
