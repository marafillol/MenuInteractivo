require("dotenv").config();
const crypto = require("node:crypto");
const sqlite3 = require("sqlite3").verbose();
const { Client } = require("pg");

if (process.env.SYNC_CONFIRMAR_IDENTIDADES_INICIALES !== "true") {
    throw new Error("Operación bloqueada. Requiere SYNC_CONFIRMAR_IDENTIDADES_INICIALES=true.");
}

const ruta = process.env.DATABASE_SQLITE_PATH;
const remoto = process.env.SYNC_POSTGRES_URL;
if (!ruta || !remoto) throw new Error("Indicá DATABASE_SQLITE_PATH y SYNC_POSTGRES_URL.");

const entidades = [
    ["plantilla", ["id_plantilla"]], ["menu", ["id_menu"]], ["ficha", ["id_ficha"]],
    ["etiqueta", ["id_etiqueta"]], ["ficha_etiqueta", ["id_ficha", "id_etiqueta"]],
    ["relacion_ficha", ["id_relacion"]], ["multimedia", ["id_multi"]]
];
const uuid = (tabla, clave) => {
    const bytes = crypto.createHash("sha1").update(`museo-malvinas-inicial:${tabla}:${clave}`).digest().subarray(0, 16);
    bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
    const hex = bytes.toString("hex");
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
const all = (db, sql, args=[]) => new Promise((ok, no) => db.all(sql, args, (e, r) => e ? no(e) : ok(r)));
const run = (db, sql, args=[]) => new Promise((ok, no) => db.run(sql, args, e => e ? no(e) : ok()));

(async () => {
    const local = new sqlite3.Database(ruta);
    const pg = new Client({ connectionString: remoto });
    await pg.connect();
    try {
        await run(local, "BEGIN IMMEDIATE"); await pg.query("BEGIN");
        for (const [tabla, claves] of entidades) {
            const locales = await all(local, `SELECT ${claves.join(",")} FROM ${tabla}`);
            const remotos = (await pg.query(`SELECT ${claves.join(",")} FROM ${tabla}`)).rows;
            const key = fila => claves.map(c => fila[c]).join(":");
            const localesPorClave = new Set(locales.map(key));
            if (remotos.some(fila => !localesPorClave.has(key(fila)))) throw new Error(`${tabla} no coincide entre ambas bases.`);
            for (const fila of locales) {
                const condiciones = claves.map(c => `${c} = ?`).join(" AND ");
                await run(local, `UPDATE ${tabla} SET sync_id=?, sync_version=COALESCE(sync_version,1) WHERE ${condiciones} AND sync_id IS NULL`, [uuid(tabla,key(fila)), ...claves.map(c=>fila[c])]);
            }
            for (const fila of remotos) {
                const condiciones = claves.map((c,i) => `${c} = $${i+2}`).join(" AND ");
                await pg.query(`UPDATE ${tabla} SET sync_id=$1, sync_version=COALESCE(sync_version,1) WHERE ${condiciones} AND sync_id IS NULL`, [uuid(tabla,key(fila)), ...claves.map(c=>fila[c])]);
            }
        }
        await run(local, "COMMIT"); await pg.query("COMMIT");
        console.log("Identidades iniciales asignadas en SQLite y PostgreSQL.");
    } catch (e) { await run(local,"ROLLBACK").catch(()=>{}); await pg.query("ROLLBACK").catch(()=>{}); throw e; }
    finally { await new Promise(ok=>local.close(ok)); await pg.end(); }
})().catch(e=>{ console.error("No se asignaron identidades:",e.message); process.exitCode=1; });
