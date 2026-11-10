require("dotenv").config();

const { esModoSupabase, esModoLocal } = require("../src/config/modoServidor");

if (process.env.SYNC_ALLOW_SCHEMA_MIGRATION !== "true" ||
    process.env.SYNC_SCHEMA_CONFIRMATION !== "I_HAVE_A_BACKUP_AND_APPROVE") {
  throw new Error("Migración bloqueada. Requiere SYNC_ALLOW_SCHEMA_MIGRATION=true y SYNC_SCHEMA_CONFIRMATION=I_HAVE_A_BACKUP_AND_APPROVE.");
}
if (esModoLocal && !process.env.DATABASE_SQLITE_PATH) {
  throw new Error("En modo local, DATABASE_SQLITE_PATH debe apuntar a una copia descartable.");
}

const db = require("../src/database");

const entidades = [
  ["plantilla", "id_plantilla"], ["menu", "id_menu"], ["ficha", "id_ficha"],
  ["etiqueta", "id_etiqueta"], ["ficha_etiqueta", null], ["relacion_ficha", "id_relacion"],
  ["multimedia", "id_multi"], ["configuracion", "clave"]
];
const run = (sql, values = []) => new Promise((resolve, reject) =>
  db.run(sql, values, function (error) { error ? reject(error) : resolve(this); }));
const all = (sql, values = []) => new Promise((resolve, reject) =>
  db.all(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
async function hasColumn(table, column) {
  const rows = esModoSupabase
    ? await all("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=? AND column_name=?", [table, column])
    : await all(`PRAGMA table_info("${table}")`);
  return esModoSupabase ? rows.length > 0 : rows.some(row => row.name === column);
}
async function addColumn(table, column, type) {
  if (!await hasColumn(table, column)) await run(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`);
}
async function ensureTable(sqlite, postgres) { await run(esModoSupabase ? postgres : sqlite); }
async function main() {
  console.log(`Preparando metadatos en ${esModoSupabase ? "PostgreSQL" : "SQLite"}; no se sincronizan datos.`);
  for (const [table] of entidades) {
    await addColumn(table, "sync_id", esModoSupabase ? "UUID" : "TEXT");
    await addColumn(table, "sync_version", "INTEGER NOT NULL DEFAULT 1");
    await addColumn(table, "sync_deleted_at", esModoSupabase ? "TIMESTAMPTZ" : "TEXT");
    await run(`CREATE UNIQUE INDEX IF NOT EXISTS "ux_${table}_sync_id" ON "${table}" (sync_id)`);
  }
  await ensureTable(
    "CREATE TABLE IF NOT EXISTS sync_dispositivos (device_id TEXT PRIMARY KEY, nombre TEXT NOT NULL, cursor_ultimo INTEGER NOT NULL DEFAULT 0, activo INTEGER NOT NULL DEFAULT 1, creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, ultimo_contacto TEXT)",
    "CREATE TABLE IF NOT EXISTS sync_dispositivos (device_id UUID PRIMARY KEY, nombre TEXT NOT NULL, cursor_ultimo BIGINT NOT NULL DEFAULT 0, activo BOOLEAN NOT NULL DEFAULT TRUE, creado TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, ultimo_contacto TIMESTAMPTZ)"
  );
  await ensureTable(
    "CREATE TABLE IF NOT EXISTS sync_eventos (id_evento INTEGER PRIMARY KEY AUTOINCREMENT, evento_id TEXT NOT NULL UNIQUE, origen_device_id TEXT NOT NULL, entidad TEXT NOT NULL, operacion TEXT NOT NULL, sync_id TEXT NOT NULL, version_base INTEGER, version_resultado INTEGER NOT NULL, payload_json TEXT, creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, aplicado INTEGER NOT NULL DEFAULT 0)",
    "CREATE TABLE IF NOT EXISTS sync_eventos (id_evento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, evento_id UUID NOT NULL UNIQUE, origen_device_id UUID NOT NULL, entidad TEXT NOT NULL, operacion TEXT NOT NULL, sync_id UUID NOT NULL, version_base INTEGER, version_resultado INTEGER NOT NULL, payload_json JSONB, creado TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, aplicado BOOLEAN NOT NULL DEFAULT FALSE)"
  );
  await ensureTable(
    "CREATE TABLE IF NOT EXISTS sync_conflictos (conflicto_id TEXT PRIMARY KEY, entidad TEXT NOT NULL, sync_id TEXT NOT NULL, version_local_json TEXT NOT NULL, version_remota_json TEXT NOT NULL, detectado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, resuelto INTEGER NOT NULL DEFAULT 0, resolucion TEXT)",
    "CREATE TABLE IF NOT EXISTS sync_conflictos (conflicto_id UUID PRIMARY KEY, entidad TEXT NOT NULL, sync_id UUID NOT NULL, version_local_json JSONB NOT NULL, version_remota_json JSONB NOT NULL, detectado TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, resuelto BOOLEAN NOT NULL DEFAULT FALSE, resolucion TEXT)"
  );
  // Metadatos necesarios para verificar archivos multimedia sin copiar rutas locales.
  await addColumn("multimedia", "checksum_sha256", "TEXT");
  await addColumn("multimedia", "mime_type", "TEXT");
  await addColumn("multimedia", "tamano_bytes", "BIGINT");
  await addColumn("multimedia", "storage_key", "TEXT");
  await addColumn("multimedia", "sync_previous_path", "TEXT");
  await run("CREATE INDEX IF NOT EXISTS ix_sync_eventos_pendientes ON sync_eventos (aplicado, id_evento)");
  await run("CREATE INDEX IF NOT EXISTS ix_sync_conflictos_pendientes ON sync_conflictos (resuelto, detectado)");
  console.log("Esquema preparado. Los sync_id existentes quedan NULL hasta reconciliar ambas bases mediante un manifiesto compartido.");
}
main().catch(error => { console.error("Preparación cancelada:", error.message); process.exitCode = 1; })
  .finally(() => { if (typeof db.close === "function") db.close(); });
