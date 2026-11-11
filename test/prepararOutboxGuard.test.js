const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const proyecto = path.resolve(__dirname, "..");

test("el preparador outbox de pruebas bloquea la SQLite activa del museo", () => {
    const resultado = spawnSync(process.execPath, ["scripts/preparar-outbox-fichas-local.js"], {
        cwd: proyecto,
        encoding: "utf8",
        env: {
            ...process.env,
            MODO_SERVIDOR: "local",
            LOCAL_AUTH_SECRET: "clave-temporal-guard-preparador-2026",
            DATABASE_SQLITE_PATH: path.join(proyecto, "database", "museo.db")
        }
    });
    assert.notEqual(resultado.status, 0);
    assert.match(resultado.stderr, /Preparación bloqueada/);
});
