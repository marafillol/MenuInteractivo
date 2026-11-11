const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sqlite3 = require("sqlite3");
const { validarDestinoPostgresSeguro, candidatosAprobados } = require("../scripts/aplicar-manifiesto-reconciliacion");

const proyecto = path.resolve(__dirname, "..");
const UUIDS = {
    plantilla: "00000000-0000-5000-8000-000000000001",
    menu: "00000000-0000-5000-8000-000000000002",
    ficha: "00000000-0000-5000-8000-000000000003",
    fichaDestino: "00000000-0000-5000-8000-000000000007",
    etiqueta: "00000000-0000-5000-8000-000000000004",
    ficha_etiqueta: "00000000-0000-5000-8000-000000000005",
    relacion_ficha: "00000000-0000-5000-8000-000000000006"
};

function ejecutar(args, env) {
    return spawnSync(process.execPath, args, {
        cwd: proyecto, env, encoding: "utf8"
    });
}

function consultar(ruta, sql) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(ruta, sqlite3.OPEN_READONLY);
        db.all(sql, [], (error, filas) => {
            db.close(() => error ? reject(error) : resolve(filas));
        });
    });
}

test("aplica solo candidatos aprobados, en orden de dependencias e idempotentemente", async () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-reconciliacion-aplicar-"));
    const rutaDb = path.join(directorio, "copia.db");
    const rutaManifiesto = path.join(directorio, "manifiesto.json");
    const env = {
        ...process.env,
        MODO_SERVIDOR: "local",
        LOCAL_AUTH_SECRET: "clave-temporal-reconciliacion-2026",
        DATABASE_SQLITE_PATH: rutaDb,
        RECONCILIACION_SQLITE_PATH: rutaDb,
        RECONCILIACION_MANIFIESTO_APROBADO: rutaManifiesto,
        RECONCILIACION_TARGET: "sqlite",
        RECONCILIACION_CONFIRMAR_APLICACION: "true",
        RECONCILIACION_DESTINO_ES_COPIA: "true"
    };

    try {
        const esquema = ejecutar(["scripts/preparar-outbox-fichas-local.js"], env);
        assert.equal(esquema.status, 0, esquema.stderr || esquema.stdout);

        const datos = ejecutar(["-e", `
            const db = require("./src/database");
            const run = (sql, values = []) => new Promise((resolve, reject) =>
                db.run(sql, values, error => error ? reject(error) : resolve())
            );
            (async () => {
                await db.preparar();
                await run("INSERT INTO plantilla (nombre, plantilla_json) VALUES (?, ?)", ["Plantilla", "{}"]);
                await run("INSERT INTO menu (nombre, id_plantilla, visible) VALUES (?, ?, ?)", ["Menú", 1, 1]);
                await run("INSERT INTO ficha (id_menu, titulo, visible) VALUES (?, ?, ?)", [1, "Ficha", 1]);
                await run("INSERT INTO ficha (id_menu, titulo, visible) VALUES (?, ?, ?)", [1, "Ficha destino", 1]);
                await run("INSERT INTO etiqueta (nombre, descripcion, activo) VALUES (?, ?, ?)", ["Historia", null, 1]);
                await run("INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES (?, ?)", [1, 1]);
                await run("INSERT INTO relacion_ficha (id_ficha_origen, id_ficha_destino, tipo_relacion) VALUES (?, ?, ?)", [1, 2, "relacionada"]);
                await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
            })().catch(error => { console.error(error); process.exitCode = 1; });
        `], env);
        assert.equal(datos.status, 0, datos.stderr || datos.stdout);

        const candidato = (syncId, local, remoto) => ({
            sync_id_propuesto: syncId,
            aprobado: true,
            claves_sqlite: [local],
            claves_postgres: [remoto]
        });
        fs.writeFileSync(rutaManifiesto, JSON.stringify({
            formato: 2,
            modo: "solo_lectura",
            entidades: {
                plantilla: { candidatos_unicos: [candidato(UUIDS.plantilla, { id_plantilla: 1 }, { id_plantilla: 11 })] },
                etiqueta: { candidatos_unicos: [candidato(UUIDS.etiqueta, { id_etiqueta: 1 }, { id_etiqueta: 14 })] },
                menu: { candidatos_unicos: [{ ...candidato(UUIDS.menu, { id_menu: 1 }, { id_menu: 12 }), portada: { estado: "sin_portada" } }] },
                ficha: { candidatos_unicos: [
                    { ...candidato(UUIDS.ficha, { id_ficha: 1 }, { id_ficha: 13 }), portada: { estado: "sin_portada" } },
                    { ...candidato(UUIDS.fichaDestino, { id_ficha: 2 }, { id_ficha: 16 }), portada: { estado: "sin_portada" } }
                ] },
                ficha_etiqueta: { candidatos_unicos: [candidato(UUIDS.ficha_etiqueta, { id_ficha: 1, id_etiqueta: 1 }, { id_ficha: 13, id_etiqueta: 14 })] },
                relacion_ficha: { candidatos_unicos: [candidato(UUIDS.relacion_ficha, { id_relacion: 1 }, { id_relacion: 15 })] }
            }
        }));

        const primero = ejecutar(["scripts/aplicar-manifiesto-reconciliacion.js"], env);
        assert.equal(primero.status, 0, primero.stderr || primero.stdout);
        const segundo = ejecutar(["scripts/aplicar-manifiesto-reconciliacion.js"], env);
        assert.equal(segundo.status, 0, segundo.stderr || segundo.stdout);

        const [plantilla, etiqueta, menu, ficha, fichaEtiqueta, relacionFicha] = [
            await consultar(rutaDb, "SELECT sync_id FROM plantilla WHERE id_plantilla = 1"),
            await consultar(rutaDb, "SELECT sync_id FROM etiqueta WHERE id_etiqueta = 1"),
            await consultar(rutaDb, "SELECT sync_id FROM menu WHERE id_menu = 1"),
            await consultar(rutaDb, "SELECT sync_id FROM ficha WHERE id_ficha = 1"),
            await consultar(rutaDb, "SELECT sync_id FROM ficha_etiqueta WHERE id_ficha = 1 AND id_etiqueta = 1"),
            await consultar(rutaDb, "SELECT sync_id FROM relacion_ficha WHERE id_relacion = 1")
        ];
        assert.equal(plantilla[0].sync_id, UUIDS.plantilla);
        assert.equal(etiqueta[0].sync_id, UUIDS.etiqueta);
        assert.equal(menu[0].sync_id, UUIDS.menu);
        assert.equal(ficha[0].sync_id, UUIDS.ficha);
        assert.equal(fichaEtiqueta[0].sync_id, UUIDS.ficha_etiqueta);
        assert.equal(relacionFicha[0].sync_id, UUIDS.relacion_ficha);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }
});


test("no aplica identidades de menú o ficha con portadas sin verificar", () => {
    const manifiesto = {
        formato: 2,
        modo: "solo_lectura",
        entidades: {
            menu: {
                candidatos_unicos: [{
                    aprobado: true,
                    sync_id_propuesto: UUIDS.menu,
                    claves_sqlite: [{ id_menu: 1 }],
                    claves_postgres: [{ id_menu: 11 }],
                    portada: { estado: "conflicto_checksum_portada" }
                }]
            }
        }
    };
    assert.throws(() => candidatosAprobados(manifiesto, "sqlite"), /portada.*verificarse/i);
});

test("rechaza aplicar un manifiesto sin doble confirmación de copia", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-reconciliacion-bloqueo-"));
    const rutaDb = path.join(directorio, "copia.db");
    const rutaManifiesto = path.join(directorio, "manifiesto.json");
    fs.writeFileSync(rutaManifiesto, JSON.stringify({
        formato: 2, modo: "solo_lectura",
        entidades: { plantilla: { candidatos_unicos: [{
            aprobado: true, sync_id_propuesto: UUIDS.plantilla,
            claves_sqlite: [{ id_plantilla: 1 }], claves_postgres: [{ id_plantilla: 11 }]
        }] } }
    }));
    try {
        const resultado = ejecutar(["scripts/aplicar-manifiesto-reconciliacion.js"], {
            ...process.env,
            RECONCILIACION_MANIFIESTO_APROBADO: rutaManifiesto,
            RECONCILIACION_TARGET: "sqlite",
            RECONCILIACION_SQLITE_PATH: rutaDb
        });
        assert.notEqual(resultado.status, 0);
        assert.match(resultado.stderr, /Aplicación bloqueada/);
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }
});


test("el aplicador PostgreSQL solo admite la copia local de reconciliación", () => {
    assert.doesNotThrow(() => validarDestinoPostgresSeguro(
        "postgresql://usuario:clave@127.0.0.1:5432/museo_reconciliacion_prueba"
    ));
    for (const url of [
        "postgresql://usuario:clave@db.example.com:5432/postgres",
        "postgresql://usuario:clave@127.0.0.1:5432/postgres",
        "postgresql://usuario:clave@127.0.0.1:5433/postgres",
        "https://example.com"
    ]) {
        assert.throws(() => validarDestinoPostgresSeguro(url), /Aplicación bloqueada|URL de PostgreSQL inválida/);
    }
});
