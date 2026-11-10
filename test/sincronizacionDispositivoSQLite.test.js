const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const proyecto = path.resolve(__dirname, "..");
const directorioTemporal = fs.mkdtempSync(path.join(os.tmpdir(), "museo-sync-device-"));
const rutaDb = path.join(directorioTemporal, "museo-prueba.db");

function ejecutarEnProcesoNuevo(codigo) {
    const resultado = spawnSync(process.execPath, ["-e", codigo], {
        cwd: proyecto,
        encoding: "utf8",
        env: {
            ...process.env,
            MODO_SERVIDOR: "local",
            LOCAL_AUTH_SECRET: "clave-temporal-integracion-sqlite-2026",
            DATABASE_SQLITE_PATH: rutaDb
        }
    });

    assert.equal(
        resultado.status,
        0,
        "El proceso hijo falló. stdout:\n" + resultado.stdout + "\nstderr:\n" + resultado.stderr
    );

    const lineas = resultado.stdout.trim().split(/\r?\n/);
    return JSON.parse(lineas[lineas.length - 1]);
}

test("persiste la identidad en SQLite real y la recupera tras reiniciar el proceso", async () => {
    try {
        const primeraEjecucion = ejecutarEnProcesoNuevo(`
            const db = require("./src/database");
            const { crearServicioDispositivo } = require("./src/servicios/sincronizacion/dispositivo");

            (async () => {
                const servicio = crearServicioDispositivo({ db, esModoLocal: true });
                const ids = await Promise.all([
                    servicio.obtenerIdDispositivo(),
                    servicio.obtenerIdDispositivo(),
                    servicio.obtenerIdDispositivo()
                ]);
                await new Promise((resolve, reject) =>
                    db.close(error => error ? reject(error) : resolve())
                );
                process.stdout.write(JSON.stringify({ ids }) + "\\n");
            })().catch(error => {
                console.error(error);
                process.exitCode = 1;
            });
        `);

        assert.equal(primeraEjecucion.ids.length, 3);
        assert.match(primeraEjecucion.ids[0], /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        assert.equal(new Set(primeraEjecucion.ids).size, 1);

        const segundaEjecucion = ejecutarEnProcesoNuevo(`
            const db = require("./src/database");
            const { crearServicioDispositivo } = require("./src/servicios/sincronizacion/dispositivo");

            (async () => {
                const servicio = crearServicioDispositivo({ db, esModoLocal: true });
                const id = await servicio.obtenerIdDispositivo();
                await new Promise((resolve, reject) =>
                    db.close(error => error ? reject(error) : resolve())
                );
                process.stdout.write(JSON.stringify({ id }) + "\\n");
            })().catch(error => {
                console.error(error);
                process.exitCode = 1;
            });
        `);

        assert.equal(segundaEjecucion.id, primeraEjecucion.ids[0]);
    } finally {
        fs.rmSync(directorioTemporal, { recursive: true, force: true });
    }
});
