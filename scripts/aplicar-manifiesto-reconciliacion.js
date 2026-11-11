#!/usr/bin/env node
/**
 * Aplica únicamente correspondencias aprobadas manualmente del manifiesto.
 * Ejecutar por separado sobre una copia SQLite y una copia PostgreSQL.
 * No genera eventos: ambas filas ya representan el mismo contenido inicial.
 */
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const sqlite3 = require("sqlite3");
const { Client } = require("pg");

function validarDestinoPostgresSeguro(connectionString) {
    let destino;
    try { destino = new URL(String(connectionString || "")); }
    catch { throw new Error("URL de PostgreSQL inválida."); }
    const hostPermitido = ["127.0.0.1", "localhost"].includes(destino.hostname);
    const puertoPermitido = destino.port === "5432";
    const basePermitida = destino.pathname.replace(/^\/+/, "") === "museo_reconciliacion_prueba";
    if (!["postgres:", "postgresql:"].includes(destino.protocol) ||
        !hostPermitido || !puertoPermitido || !basePermitida) {
        throw new Error("Aplicación bloqueada: solo se permite la copia local museo_reconciliacion_prueba en localhost:5432.");
    }
}
function validarDestinoSqliteSeguro(ruta) {
    if (!ruta || !fs.existsSync(ruta)) throw new Error("Indicá una copia SQLite existente.");
    const real = fs.realpathSync(ruta);
    const activa = path.resolve(__dirname, "../database/museo.db");
    if (real === activa || (fs.existsSync(activa) && real === fs.realpathSync(activa))) {
        throw new Error("Aplicación bloqueada: no se permite modificar la SQLite activa del proyecto.");
    }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENTIDADES = {
    plantilla: { pk: ["id_plantilla"] },
    etiqueta: { pk: ["id_etiqueta"] },
    menu: { pk: ["id_menu"], padre: { tabla: "plantilla", pk: "id_plantilla", fk: "id_plantilla" } },
    ficha: { pk: ["id_ficha"], padre: { tabla: "menu", pk: "id_menu", fk: "id_menu" } },
    multimedia: { pk: ["id_multi"], padre: { tabla: "ficha", pk: "id_ficha", fk: "id_ficha" }, requiereChecksum: true }
};
const ORDEN = ["plantilla", "etiqueta", "menu", "ficha", "multimedia"];

function leerManifiesto(ruta) {
    if (!ruta || !fs.existsSync(ruta)) throw new Error("Indicá RECONCILIACION_MANIFIESTO_APROBADO con un archivo existente.");
    const manifiesto = JSON.parse(fs.readFileSync(ruta, "utf8"));
    if (manifiesto.formato !== 2 || manifiesto.modo !== "solo_lectura" || !manifiesto.entidades) {
        throw new Error("El archivo no es un manifiesto preliminar compatible.");
    }
    return manifiesto;
}

function candidatosAprobados(manifiesto, target) {
    const aprobados = [];
    for (const entidad of ORDEN) {
        const datos = manifiesto.entidades[entidad];
        for (const candidato of datos?.candidatos_unicos || []) {
            if (candidato.aprobado !== true) continue;
            if (!UUID_RE.test(String(candidato.sync_id_propuesto || ""))) {
                throw new Error("El candidato aprobado de " + entidad + " no tiene un UUID v5 válido.");
            }
            const claves = target === "sqlite" ? candidato.claves_sqlite : candidato.claves_postgres;
            if (!Array.isArray(claves) || claves.length !== 1) {
                throw new Error("El candidato aprobado de " + entidad + " no es unívoco.");
            }
            aprobados.push({ entidad, syncId: candidato.sync_id_propuesto, clave: claves[0] });
        }
    }
    if (!aprobados.length) throw new Error("El manifiesto no contiene candidatos aprobados manualmente.");
    const ids = new Set();
    for (const candidato of aprobados) {
        if (ids.has(candidato.syncId)) throw new Error("El manifiesto repite un sync_id propuesto.");
        ids.add(candidato.syncId);
    }
    return aprobados;
}

function wherePk(config, clave, tabla) {
    if (!clave || config.pk.some((campo) => !Object.prototype.hasOwnProperty.call(clave, campo))) {
        throw new Error("La clave primaria del manifiesto no coincide con el esquema de " + tabla + ".");
    }
    return {
        sql: config.pk.map((campo) => campo + " = ?").join(" AND "),
        valores: config.pk.map((campo) => clave[campo])
    };
}

function crearSqlite(ruta) {
    const db = new sqlite3.Database(ruta);
    const all = (sql, valores = []) => new Promise((resolve, reject) =>
        db.all(sql, valores, (error, filas) => error ? reject(error) : resolve(filas || []))
    );
    const run = (sql, valores = []) => new Promise((resolve, reject) =>
        db.run(sql, valores, function (error) { error ? reject(error) : resolve(this); })
    );
    const consultar = async (sql, valores = []) => {
        if (/^\s*SELECT\b/i.test(sql)) return { rows: await all(sql, valores) };
        const resultado = await run(sql, valores);
        return { rows: [], rowCount: resultado.changes || 0 };
    };
    const close = () => new Promise((resolve, reject) =>
        db.close((error) => error ? reject(error) : resolve())
    );
    return { consultar, run, close };
}

async function aplicar(consultar, candidato) {
    const definicion = ENTIDADES[candidato.entidad];
    if (!definicion) throw new Error("Entidad no permitida: " + candidato.entidad);
    const tabla = candidato.entidad;
    const clave = wherePk(definicion, candidato.clave, tabla);
    const filas = await consultar("SELECT * FROM " + tabla + " WHERE " + clave.sql, clave.valores);
    const fila = filas.rows ? filas.rows[0] : filas[0];
    if (!fila) throw new Error("No existe la fila " + tabla + " indicada en el manifiesto.");

    if (definicion.padre) {
        const padre = definicion.padre;
        const padres = await consultar(
            "SELECT sync_id FROM " + padre.tabla + " WHERE " + padre.pk + " = ?",
            [fila[padre.fk]]
        );
        const filaPadre = padres.rows ? padres.rows[0] : padres[0];
        if (!filaPadre?.sync_id) {
            throw new Error("Debe aprobar y aplicar primero la identidad padre de " + tabla + ".");
        }
    }
    if (definicion.requiereChecksum && !fila.checksum_sha256) {
        throw new Error("La multimedia debe tener checksum SHA-256 verificado antes de reconciliarse.");
    }

    const existentes = await consultar(
        "SELECT " + definicion.pk.join(", ") + " FROM " + tabla + " WHERE sync_id = ?",
        [candidato.syncId]
    );
    const otraFila = existentes.rows ? existentes.rows[0] : existentes[0];
    if (otraFila && definicion.pk.some((campo) => String(otraFila[campo]) !== String(fila[campo]))) {
        throw new Error("El UUID propuesto ya está asignado a otra fila de " + tabla + ".");
    }
    if (fila.sync_id && fila.sync_id !== candidato.syncId) {
        throw new Error("La fila " + tabla + " ya tiene otro sync_id; requiere revisión manual.");
    }

    if (!fila.sync_id) {
        await consultar(
            "UPDATE " + tabla + " SET sync_id = ?, sync_version = COALESCE(sync_version, 1) WHERE " + clave.sql + " AND sync_id IS NULL",
            [candidato.syncId, ...clave.valores]
        );
    }
    return { entidad: tabla, sync_id: candidato.syncId, clave_local: candidato.clave };
}

async function main() {
    if (process.env.RECONCILIACION_CONFIRMAR_APLICACION !== "true" ||
        process.env.RECONCILIACION_DESTINO_ES_COPIA !== "true") {
        throw new Error("Aplicación bloqueada: exige confirmar que el destino es una copia respaldada.");
    }
    const target = process.env.RECONCILIACION_TARGET;
    if (!["sqlite", "postgres"].includes(target)) {
        throw new Error("RECONCILIACION_TARGET debe ser sqlite o postgres.");
    }
    const manifiesto = leerManifiesto(process.env.RECONCILIACION_MANIFIESTO_APROBADO);
    const candidatos = candidatosAprobados(manifiesto, target);

    if (target === "sqlite") {
        const ruta = process.env.RECONCILIACION_SQLITE_PATH;
        validarDestinoSqliteSeguro(ruta);
        const db = crearSqlite(ruta);
        let transaccion = false;
        try {
            await db.run("BEGIN IMMEDIATE");
            transaccion = true;
            const aplicados = [];
            for (const candidato of candidatos) aplicados.push(await aplicar(db.consultar, candidato));
            await db.run("COMMIT");
            transaccion = false;
            console.log(JSON.stringify({ target, aplicados }, null, 2));
        } finally {
            if (transaccion) await db.run("ROLLBACK").catch(() => {});
            await db.close();
        }
        return;
    }

    const connectionString = process.env.RECONCILIACION_POSTGRES_URL;
    if (!connectionString) throw new Error("Indicá RECONCILIACION_POSTGRES_URL con una copia PostgreSQL.");
    validarDestinoPostgresSeguro(connectionString);
    const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });
    await client.connect();
    let transaccion = false;
    try {
        await client.query("BEGIN");
        transaccion = true;
        await client.query("SET LOCAL statement_timeout = '30s'");
        const consultar = async (sql, valores = []) => {
            let indice = 0;
            const sqlPostgres = sql.replace(/\?/g, () => "$" + (++indice));
            return client.query(sqlPostgres, valores);
        };
        const aplicados = [];
        for (const candidato of candidatos) aplicados.push(await aplicar(consultar, candidato));
        await client.query("COMMIT");
        transaccion = false;
        console.log(JSON.stringify({ target, aplicados }, null, 2));
    } finally {
        if (transaccion) await client.query("ROLLBACK").catch(() => {});
        await client.end();
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error("No se aplicó el manifiesto:", error.message);
        process.exitCode = 1;
    });
}

module.exports = { leerManifiesto, candidatosAprobados, wherePk, aplicar, validarDestinoPostgresSeguro, validarDestinoSqliteSeguro };
