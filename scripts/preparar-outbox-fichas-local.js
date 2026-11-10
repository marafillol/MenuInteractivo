require("dotenv").config();

const { esModoLocal } = require("../src/config/modoServidor");
const db = require("../src/database");

/**
 * Prepara exclusivamente SQLite local para la primera integración de outbox.
 * No selecciona ni modifica PostgreSQL/Supabase.
 *
 * Ejecutar explícitamente con MODO_SERVIDOR=local y DATABASE_SQLITE_PATH
 * apuntando a una copia descartable de museo.db.
 */
async function preparar() {
    if (!esModoLocal) {
        throw new Error("Esta preparación solo admite MODO_SERVIDOR=local.");
    }

    await db.withTransaction(async (consultar) => {
        const columnas = await consultar('PRAGMA table_info("ficha")');
        const existentes = new Set(columnas.rows.map((columna) => columna.name));

        if (!existentes.has("sync_id")) {
            await consultar('ALTER TABLE "ficha" ADD COLUMN "sync_id" TEXT');
        }
        if (!existentes.has("sync_version")) {
            await consultar('ALTER TABLE "ficha" ADD COLUMN "sync_version" INTEGER NOT NULL DEFAULT 1');
        }
        if (!existentes.has("sync_deleted_at")) {
            await consultar('ALTER TABLE "ficha" ADD COLUMN "sync_deleted_at" TEXT');
        }

        const columnasRelacion = await consultar('PRAGMA table_info("ficha_etiqueta")');
        const existentesRelacion = new Set(columnasRelacion.rows.map((columna) => columna.name));
        if (!existentesRelacion.has("sync_id")) {
            await consultar('ALTER TABLE "ficha_etiqueta" ADD COLUMN "sync_id" TEXT');
        }
        if (!existentesRelacion.has("sync_version")) {
            await consultar('ALTER TABLE "ficha_etiqueta" ADD COLUMN "sync_version" INTEGER NOT NULL DEFAULT 1');
        }
        if (!existentesRelacion.has("sync_deleted_at")) {
            await consultar('ALTER TABLE "ficha_etiqueta" ADD COLUMN "sync_deleted_at" TEXT');
        }
        await consultar(
            'CREATE UNIQUE INDEX IF NOT EXISTS "ux_ficha_etiqueta_sync_id" ON "ficha_etiqueta" (sync_id)'
        );

        const columnasMultimedia = await consultar('PRAGMA table_info("multimedia")');
        const existentesMultimedia = new Set(columnasMultimedia.rows.map((columna) => columna.name));
        const columnasNuevasMultimedia = [
            ["sync_id", 'TEXT'],
            ["sync_version", 'INTEGER NOT NULL DEFAULT 1'],
            ["sync_deleted_at", 'TEXT'],
            ["checksum_sha256", 'TEXT'],
            ["mime_type", 'TEXT'],
            ["tamano_bytes", 'INTEGER'],
            ["storage_key", 'TEXT'],
            ["sync_previous_path", 'TEXT']
        ];
        for (const [nombre, tipo] of columnasNuevasMultimedia) {
            if (!existentesMultimedia.has(nombre)) {
                await consultar(`ALTER TABLE "multimedia" ADD COLUMN "${nombre}" ${tipo}`);
            }
        }
        await consultar(
            'CREATE UNIQUE INDEX IF NOT EXISTS "ux_multimedia_sync_id" ON "multimedia" (sync_id)'
        );

        const columnasEtiqueta = await consultar('PRAGMA table_info("etiqueta")');
        const existentesEtiqueta = new Set(columnasEtiqueta.rows.map((columna) => columna.name));
        if (!existentesEtiqueta.has("sync_id")) {
            await consultar('ALTER TABLE "etiqueta" ADD COLUMN "sync_id" TEXT');
        }
        if (!existentesEtiqueta.has("sync_version")) {
            await consultar('ALTER TABLE "etiqueta" ADD COLUMN "sync_version" INTEGER NOT NULL DEFAULT 1');
        }
        if (!existentesEtiqueta.has("sync_deleted_at")) {
            await consultar('ALTER TABLE "etiqueta" ADD COLUMN "sync_deleted_at" TEXT');
        }
        await consultar(
            'CREATE UNIQUE INDEX IF NOT EXISTS "ux_etiqueta_sync_id" ON "etiqueta" (sync_id)'
        );

        const columnasPlantilla = await consultar('PRAGMA table_info("plantilla")');
        const existentesPlantilla = new Set(columnasPlantilla.rows.map((columna) => columna.name));
        if (!existentesPlantilla.has("sync_id")) {
            await consultar('ALTER TABLE "plantilla" ADD COLUMN "sync_id" TEXT');
        }
        if (!existentesPlantilla.has("sync_version")) {
            await consultar('ALTER TABLE "plantilla" ADD COLUMN "sync_version" INTEGER NOT NULL DEFAULT 1');
        }
        if (!existentesPlantilla.has("sync_deleted_at")) {
            await consultar('ALTER TABLE "plantilla" ADD COLUMN "sync_deleted_at" TEXT');
        }
        await consultar(
            'CREATE UNIQUE INDEX IF NOT EXISTS "ux_plantilla_sync_id" ON "plantilla" (sync_id)'
        );

        const columnasMenu = await consultar('PRAGMA table_info("menu")');
        const existentesMenu = new Set(columnasMenu.rows.map((columna) => columna.name));
        if (!existentesMenu.has("sync_id")) {
            await consultar('ALTER TABLE "menu" ADD COLUMN "sync_id" TEXT');
        }
        if (!existentesMenu.has("sync_version")) {
            await consultar('ALTER TABLE "menu" ADD COLUMN "sync_version" INTEGER NOT NULL DEFAULT 1');
        }
        if (!existentesMenu.has("sync_deleted_at")) {
            await consultar('ALTER TABLE "menu" ADD COLUMN "sync_deleted_at" TEXT');
        }
        await consultar(
            'CREATE UNIQUE INDEX IF NOT EXISTS "ux_menu_sync_id" ON "menu" (sync_id)'
        );

        await consultar(
            'CREATE UNIQUE INDEX IF NOT EXISTS "ux_ficha_sync_id" ON "ficha" (sync_id)'
        );
        await consultar(`
            CREATE TABLE IF NOT EXISTS sync_eventos (
                id_evento INTEGER PRIMARY KEY AUTOINCREMENT,
                evento_id TEXT NOT NULL UNIQUE,
                origen_device_id TEXT NOT NULL,
                entidad TEXT NOT NULL,
                operacion TEXT NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
                sync_id TEXT NOT NULL,
                version_base INTEGER,
                version_resultado INTEGER NOT NULL,
                payload_json TEXT,
                creado TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                aplicado INTEGER NOT NULL DEFAULT 0
            )
        `);
        await consultar(
            'CREATE INDEX IF NOT EXISTS ix_sync_eventos_pendientes ON sync_eventos (aplicado, id_evento)'
        );
    });
}

preparar()
    .then(() => console.log("[sync-local] Esquema inicial de ficha/outbox preparado en SQLite."))
    .catch((error) => {
        console.error("[sync-local] Preparación cancelada:", error.message);
        process.exitCode = 1;
    })
    .finally(() => {
        if (typeof db.close === "function") {
            db.close();
        }
    });
