const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("SQLite prepara integridad referencial, WAL, busy_timeout y migraciones", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-sqlite-"));
    const archivoDb = path.join(directorio, "prueba.db");
    const codigo = `
        const db = require("./src/database");
        const consultar = (sql) => new Promise((resolve, reject) => {
            db.get(sql, [], (error, fila) => error ? reject(error) : resolve(fila));
        });
        const ejecutar = (sql, valores = []) => new Promise((resolve, reject) => {
            db.run(sql, valores, function(error) {
                if (error) reject(error);
                else resolve({ changes: this.changes });
            });
        });
        (async () => {
            await db.preparar();
            const fk = await consultar("PRAGMA foreign_keys");
            const wal = await consultar("PRAGMA journal_mode");
            const timeout = await consultar("PRAGMA busy_timeout");
            if (fk.foreign_keys !== 1) throw new Error("foreign_keys no está activo");
            if (String(wal.journal_mode).toLowerCase() !== "wal") throw new Error("WAL no está activo");
            if (timeout.timeout !== 5000) throw new Error("busy_timeout incorrecto");
            const columnas = await consultar("SELECT COUNT(*) AS cantidad FROM pragma_table_info('usuario') WHERE name = 'password_hash'");
            if (columnas.cantidad !== 1) throw new Error("No se aplicó la migración password_hash");
            let rechazoReferencial = false;
            try {
                await ejecutar("INSERT INTO menu (nombre, id_plantilla) VALUES (?, ?)", ["invalido", 987654321]);
            } catch (error) {
                rechazoReferencial = error.code === "SQLITE_CONSTRAINT";
            }
            if (!rechazoReferencial) throw new Error("SQLite aceptó una referencia inexistente");
            await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
        })().catch(error => {
            console.error(error);
            process.exitCode = 1;
        });
    `;

    try {
        execFileSync(process.execPath, ["-e", codigo], {
            cwd: path.resolve(__dirname, ".."),
            env: {
                ...process.env,
                MODO_SERVIDOR: "local",
                LOCAL_AUTH_SECRET: "test-secret-0123456789-0123456789",
                DATABASE_SQLITE_PATH: archivoDb
            },
            stdio: "pipe"
        });
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }

    assert.ok(true);
});
