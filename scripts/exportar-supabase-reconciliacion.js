require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const sqlite3 = require("sqlite3");
const { Client } = require("pg");

const salida = path.resolve("backups-local/supabase-reconciliacion.db");
const url = process.env.DATABASE_URL;

const tablas = {
  plantilla: ["id_plantilla", "nombre", "descripcion", "plantilla_json", "activo", "creado", "actualizado"],
  menu: ["id_menu", "nombre", "descripcion", "imagen", "id_plantilla", "visible", "creado", "actualizado"],
  ficha: ["id_ficha", "id_menu", "titulo", "resumen", "texto", "imagen", "datos_json", "visible", "id_usuario", "creado", "actualizado"],
  etiqueta: ["id_etiqueta", "nombre", "descripcion", "activo"],
  ficha_etiqueta: ["id_ficha", "id_etiqueta", "creado"],
  relacion_ficha: ["id_relacion", "id_ficha_origen", "id_ficha_destino", "tipo_relacion"],
  multimedia: ["id_multi", "id_ficha", "descripcion", "ruta_archivo", "tipo_multi", "miniatura", "activo", "creado", "actualizado"]
};

function ejecutar(db, sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (err) {
    if (err) reject(err); else resolve(this);
  }));
}
function cerrar(db) {
  return new Promise((resolve, reject) => db.close(err => err ? reject(err) : resolve()));
}
function valorSQLite(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? 1 : 0;
  return v;
}

async function main() {
  if (!url) throw new Error("No está definida DATABASE_URL en .env.");
  if (fs.existsSync(salida)) throw new Error("El archivo de salida ya existe; no se sobrescribe: " + salida);

  const pg = new Client({
    connectionString: url,
    application_name: "menuinteractivo-exportacion-reconciliacion",
    connectionTimeoutMillis: 10000
  });
  let sqlite;
  let conectado = false;
  let transaccion = false;

  try {
    await pg.connect();
    conectado = true;
    await pg.query("BEGIN READ ONLY");
    transaccion = true;
    await pg.query("SET LOCAL statement_timeout = '30s'");
    await pg.query("SET LOCAL lock_timeout = '5s'");

    fs.mkdirSync(path.dirname(salida), { recursive: true });
    sqlite = new sqlite3.Database(salida);

    for (const [tabla, columnas] of Object.entries(tablas)) {
      const definiciones = columnas.map(c => `"${c}"`);
      await ejecutar(sqlite, `CREATE TABLE "${tabla}" (${definiciones.join(", ")})`);

      const consulta = `SELECT ${columnas.map(c => `"${c}"`).join(", ")} FROM public."${tabla}"`;
      const resultado = await pg.query(consulta);
      const placeholders = columnas.map(() => "?").join(", ");
      const insert = `INSERT INTO "${tabla}" (${columnas.map(c => `"${c}"`).join(", ")}) VALUES (${placeholders})`;

      for (const fila of resultado.rows) {
        await ejecutar(sqlite, insert, columnas.map(c => valorSQLite(fila[c])));
      }
      console.log(`${tabla}: ${resultado.rowCount} registros exportados`);
    }

    // Solo conserva el conteo de configuración; no lee ni exporta claves ni valores.
    const conteo = await pg.query('SELECT COUNT(*)::integer AS cantidad FROM public."configuracion"');
    await ejecutar(sqlite, 'CREATE TABLE "configuracion" ("clave" TEXT PRIMARY KEY, "valor" TEXT NOT NULL)');
    for (let i = 0; i < Number(conteo.rows[0].cantidad); i++) {
      await ejecutar(sqlite, 'INSERT INTO "configuracion" ("clave", "valor") VALUES (?, ?)', [`__conteo_${i + 1}`, ""]);
    }
    console.log(`configuracion: solo conteo (${conteo.rows[0].cantidad})`);

    await pg.query("ROLLBACK");
    transaccion = false;
    await cerrar(sqlite);
    sqlite = null;
    console.log("Exportación terminada:", salida);
    console.log("PostgreSQL se consultó en READ ONLY; no se modificaron las bases originales.");
  } catch (err) {
    if (sqlite) await cerrar(sqlite).catch(() => {});
    if (fs.existsSync(salida)) fs.unlinkSync(salida);
    throw err;
  } finally {
    if (transaccion && conectado) await pg.query("ROLLBACK").catch(() => {});
    if (conectado) await pg.end().catch(() => {});
  }
}

main().catch(err => {
  console.error("No se pudo exportar:", err.message);
  process.exitCode = 1;
});

