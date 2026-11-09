#!/usr/bin/env node
/**
 * Genera un manifiesto preliminar SQLite ↔ PostgreSQL.
 *
 * SOLO LECTURA: SQLite se abre con OPEN_READONLY y PostgreSQL ejecuta
 * BEGIN READ ONLY. No asigna sync_id ni modifica tablas.
 *
 * Requiere:
 *   RECONCILIACION_SQLITE_PATH=/ruta/a/copia.sqlite
 *   RECONCILIACION_POSTGRES_URL=postgresql://... (copia descartable)
 * Opcional:
 *   RECONCILIACION_SALIDA=/ruta/manifiesto.json
 */
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sqlite3 = require("sqlite3");
const { Client } = require("pg");

const SQLITE_PATH = process.env.RECONCILIACION_SQLITE_PATH;
const POSTGRES_URL = process.env.RECONCILIACION_POSTGRES_URL;
const OUTPUT = process.env.RECONCILIACION_SALIDA ||
  path.resolve(process.cwd(), "manifiesto-reconciliacion.json");

const ENTIDADES = [
  { tabla: "plantilla", pk: ["id_plantilla"] },
  { tabla: "menu", pk: ["id_menu"] },
  { tabla: "ficha", pk: ["id_ficha"] },
  { tabla: "etiqueta", pk: ["id_etiqueta"] },
  { tabla: "ficha_etiqueta", pk: ["id_ficha", "id_etiqueta"], relacion: true },
  { tabla: "relacion_ficha", pk: ["id_relacion"], relacion: true },
  { tabla: "multimedia", pk: ["id_multi"], multimedia: true },
  { tabla: "configuracion", pk: ["clave"], configuracion: true }
];

function canonicalizar(valor) {
  if (Array.isArray(valor)) return valor.map(canonicalizar);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.keys(valor).sort().map(k => [k, canonicalizar(valor[k])]));
  }
  return valor;
}
function hashRegistro(registro, clavesExcluir) {
  const contenido = Object.fromEntries(
    Object.entries(registro).filter(([k]) => !clavesExcluir.includes(k))
  );
  return crypto.createHash("sha256")
    .update(JSON.stringify(canonicalizar(contenido)))
    .digest("hex");
}
function consultaSQLite(db, sql, params = []) {
  return new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows))
  );
}
function consultaPostgres(client, sql) {
  return client.query(sql).then(r => r.rows);
}
function comprobarIdentificadores(registro, claves) {
  return claves.every(k => Object.prototype.hasOwnProperty.call(registro, k));
}
async function main() {
  if (!SQLITE_PATH || !POSTGRES_URL) {
    throw new Error("Configurá RECONCILIACION_SQLITE_PATH y RECONCILIACION_POSTGRES_URL con rutas/credenciales de COPIAS, nunca de producción.");
  }
  if (!fs.existsSync(SQLITE_PATH)) throw new Error("No existe la copia SQLite indicada.");
  if (fs.existsSync(OUTPUT)) throw new Error(`El archivo de salida ya existe; no se sobrescribe: ${OUTPUT}`);

  const sqlite = new sqlite3.Database(SQLITE_PATH, sqlite3.OPEN_READONLY);
  const pg = new Client({
    connectionString: POSTGRES_URL,
    application_name: "menuinteractivo-manifiesto-readonly",
    connectionTimeoutMillis: 10000,
    ssl: process.env.RECONCILIACION_PG_SSL === "true" ? { rejectUnauthorized: true } : undefined
  });

  let transaccionPg = false;
  try {
    await pg.connect();
    await pg.query("BEGIN READ ONLY");
    transaccionPg = true;
    await pg.query("SET LOCAL statement_timeout = '30s'");
    await pg.query("SET LOCAL lock_timeout = '5s'");

    const sqliteInfo = await consultaSQLite(sqlite, "PRAGMA database_list");
    const sqliteVersion = await consultaSQLite(sqlite, "SELECT sqlite_version() AS version");
    const pgInfo = await consultaPostgres(pg, "SELECT current_database() AS database, current_schema() AS schema, version() AS version");

    const manifiesto = {
      formato: 1,
      generado_en: new Date().toISOString(),
      modo: "solo_lectura_sin_asignacion_de_sync_id",
      fuentes: {
        sqlite: { archivo: path.basename(SQLITE_PATH), version: sqliteVersion[0]?.version },
        postgres: { database: pgInfo[0]?.database, schema: pgInfo[0]?.schema }
      },
      advertencias: [
        "Este informe no aprueba correspondencias ni asigna sync_id.",
        "Los hashes son huellas preliminares; diferencias de IDs foráneos pueden producir hashes distintos.",
        "Las coincidencias de hash requieren revisión de dependencias y contenido antes de aprobarse.",
        "No se inspecciona el contenido binario de multimedia ni se equiparan rutas con URLs.",
        "No se incluyen usuarios ni datos de autenticación."
      ],
      entidades: {}
    };

    for (const entidad of ENTIDADES) {
      const { tabla, pk } = entidad;
      const local = await consultaSQLite(sqlite, `SELECT * FROM "${tabla}"`);
      const remotas = await consultaPostgres(pg,
        "SELECT * FROM public." + '"' + tabla + '"'
      );

      for (const [lado, filas] of [["SQLite", local], ["PostgreSQL", remotas]]) {
        for (const fila of filas) {
          if (!comprobarIdentificadores(fila, pk)) {
            throw new Error(`Falta una clave esperada en ${lado}.${tabla}: ${pk.join(", ")}`);
          }
        }
      }

      const preparar = filas => filas.map(fila => ({
        clave: Object.fromEntries(pk.map(k => [k, fila[k]])),
        huella_sha256: hashRegistro(fila, pk),
        campos: Object.keys(fila).sort(),
        // Los valores se conservan para revisión; no contienen tabla usuario.
        valores: canonicalizar(fila)
      }));
      const filasLocal = preparar(local);
      const filasRemotas = preparar(remotas);
      const contar = filas => {
        const mapa = new Map();
        for (const fila of filas) mapa.set(fila.huella_sha256, (mapa.get(fila.huella_sha256) || 0) + 1);
        return mapa;
      };
      const conteoLocal = contar(filasLocal);
      const conteoRemoto = contar(filasRemotas);
      const hashesCompartidos = [...conteoLocal.keys()].filter(h => conteoRemoto.has(h));
      const duplicadosLocal = [...conteoLocal].filter(([, n]) => n > 1).map(([hash, cantidad]) => ({ hash, cantidad }));
      const duplicadosRemotos = [...conteoRemoto].filter(([, n]) => n > 1).map(([hash, cantidad]) => ({ hash, cantidad }));

      manifiesto.entidades[tabla] = {
        clave_primaria: pk,
        tipo: entidad.relacion ? "relacion_requiere_revision" : entidad.configuracion ? "clave_natural" : "registro",
        conteos: {
          sqlite: filasLocal.length,
          postgres: filasRemotas.length,
          huellas_compartidas: hashesCompartidos.length,
          duplicados_sqlite: duplicadosLocal.length,
          duplicados_postgres: duplicadosRemotos.length
        },
        huellas_compartidas: hashesCompartidos.map(hash => ({
          hash,
          cantidad_sqlite: conteoLocal.get(hash),
          cantidad_postgres: conteoRemoto.get(hash),
          estado: "candidato_revision_manual"
        })),
        duplicados: { sqlite: duplicadosLocal, postgres: duplicadosRemotos },
        solo_sqlite: filasLocal.filter(f => !conteoRemoto.has(f.huella_sha256)),
        solo_postgres: filasRemotas.filter(f => !conteoLocal.has(f.huella_sha256)),
        filas_sqlite: filasLocal,
        filas_postgres: filasRemotas
      };
    }

    await pg.query("ROLLBACK");
    transaccionPg = false;
    await new Promise((resolve, reject) => sqlite.close(err => err ? reject(err) : resolve()));

    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify(manifiesto, null, 2), { flag: "wx" });
    console.log("Manifiesto generado en modo solo lectura:");
    console.log(OUTPUT);
    for (const [tabla, datos] of Object.entries(manifiesto.entidades)) {
      console.log(`- ${tabla}: SQLite ${datos.conteos.sqlite}, PostgreSQL ${datos.conteos.postgres}, huellas compartidas ${datos.conteos.huellas_compartidas}`);
    }
    console.log("No se modificaron las bases ni se asignaron sync_id.");
  } finally {
    if (transaccionPg) await pg.query("ROLLBACK").catch(() => {});
    await pg.end().catch(() => {});
    await new Promise(resolve => sqlite.close(() => resolve())).catch(() => {});
  }
}

main().catch(error => {
  console.error("No se pudo generar el manifiesto:", error.message);
  process.exitCode = 1;
});
