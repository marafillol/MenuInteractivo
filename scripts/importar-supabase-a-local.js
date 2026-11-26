require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
const sqlite3 = require("sqlite3").verbose();
const { createClient } = require("@supabase/supabase-js");

const raiz = path.resolve(__dirname, "..");
const rutaSQLite = path.join(raiz, "database", "museo.db");
const carpetaRespaldo = path.join(raiz, "backups-local");
const bucket = process.env.SUPABASE_BUCKET || "multimedia";
const tablas = [
    "usuario", "plantilla", "menu", "ficha", "etiqueta",
    "ficha_etiqueta", "relacion_ficha", "multimedia", "configuracion"
];
const ordenBorrado = [
    "ficha_etiqueta", "relacion_ficha", "multimedia", "ficha", "menu",
    "etiqueta", "plantilla", "configuracion", "usuario"
];

if (process.env.IMPORTAR_SUPABASE_A_LOCAL !== "true") {
    throw new Error("Importación bloqueada. Ejecutá con IMPORTAR_SUPABASE_A_LOCAL=true después de confirmar el respaldo.");
}

if (!process.env.DATABASE_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Faltan las credenciales de Supabase requeridas para importar el contenido.");
}

function abrirSQLite(ruta) {
    return new sqlite3.Database(ruta);
}

function all(db, sql, valores = []) {
    return new Promise((resolve, reject) => db.all(sql, valores, (error, filas) => error ? reject(error) : resolve(filas || [])));
}

function run(db, sql, valores = []) {
    return new Promise((resolve, reject) => db.run(sql, valores, (error) => error ? reject(error) : resolve()));
}

function cerrar(db) {
    return new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
}

function normalizar(valor) {
    if (valor === undefined) return null;
    if (valor instanceof Date) return valor.toISOString();
    if (typeof valor === "boolean") return valor ? 1 : 0;
    if (valor && typeof valor === "object" && !Buffer.isBuffer(valor)) return JSON.stringify(valor);
    return valor;
}

function obtenerRutaStorage(valor) {
    if (typeof valor !== "string" || !/^https?:\/\//i.test(valor)) return null;
    try {
        const pathname = new URL(valor).pathname;
        const marcador = `/storage/v1/object/public/${bucket}/`;
        const indice = pathname.indexOf(marcador);
        if (indice === -1) return null;
        return decodeURIComponent(pathname.slice(indice + marcador.length));
    } catch {
        return null;
    }
}

function destinoLocal(rutaStorage) {
    const relativa = rutaStorage.split("/").filter(Boolean).map((parte) => partSeguro(parte)).join(path.sep);
    const base = path.join(raiz, "imagenes", "importadas-supabase");
    const destino = path.resolve(base, relativa);
    if (!destino.startsWith(base + path.sep)) throw new Error("Ruta multimedia remota inválida.");
    return destino;
}

function partSeguro(parte) {
    const limpio = String(parte).replace(/[^a-zA-Z0-9._-]/g, "_");
    if (!limpio || limpio === "." || limpio === "..") throw new Error("Nombre multimedia remoto inválido.");
    return limpio;
}

async function descargarArchivos(filas, supabase) {
    const referencias = new Map();
    for (const fila of filas.ficha) {
        const ruta = obtenerRutaStorage(fila.imagen);
        if (ruta) referencias.set(ruta, true);
    }
    for (const fila of filas.multimedia) {
        for (const campo of ["ruta_archivo", "miniatura"]) {
            const ruta = obtenerRutaStorage(fila[campo]);
            if (ruta) referencias.set(ruta, true);
        }
    }

    const reescrituras = new Map();
    for (const rutaStorage of referencias.keys()) {
        const { data, error } = await supabase.storage.from(bucket).download(rutaStorage);
        if (error || !data) throw new Error(`No se pudo descargar ${rutaStorage}: ${error?.message || "sin datos"}`);
        const destino = destinoLocal(rutaStorage);
        await fs.promises.mkdir(path.dirname(destino), { recursive: true });
        await fs.promises.writeFile(destino, Buffer.from(await data.arrayBuffer()));
        reescrituras.set(rutaStorage, path.relative(raiz, destino).split(path.sep).join("/"));
    }

    for (const fila of filas.ficha) {
        const ruta = obtenerRutaStorage(fila.imagen);
        if (ruta) fila.imagen = reescrituras.get(ruta);
    }
    for (const fila of filas.multimedia) {
        for (const campo of ["ruta_archivo", "miniatura"]) {
            const ruta = obtenerRutaStorage(fila[campo]);
            if (ruta) fila[campo] = reescrituras.get(ruta);
        }
    }
    return reescrituras.size;
}

async function importar() {
    if (!fs.existsSync(rutaSQLite)) throw new Error("No se encontró database/museo.db.");

    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const sqlite = abrirSQLite(rutaSQLite);

    try {
        // El servidor debe estar detenido; SQLite puede conservar un WAL vacío
        // aun así. Consolidarlo permite que el respaldo sea una copia completa.
        const checkpoint = await all(sqlite, "PRAGMA wal_checkpoint(TRUNCATE)");
        if (Number(checkpoint[0]?.busy || 0) !== 0) {
            throw new Error("La base está siendo usada por otro proceso. Cerrá el servidor local e intentá nuevamente.");
        }

        const filas = {};
        for (const tabla of tablas) {
            filas[tabla] = (await pool.query(`SELECT * FROM "${tabla}"`)).rows;
        }
        const archivos = await descargarArchivos(filas, supabase);

        const credencialesLocales = await all(sqlite, `
            SELECT nombre, email, rol, activo, password_hash
            FROM usuario
            WHERE password_hash IS NOT NULL AND password_hash <> ''
        `);

        fs.mkdirSync(carpetaRespaldo, { recursive: true });
        const fecha = new Date().toISOString().replace(/[:.]/g, "-");
        const respaldo = path.join(carpetaRespaldo, `museo-antes-importacion-${fecha}.db`);
        fs.copyFileSync(rutaSQLite, respaldo);

        const columnasLocales = {};
        for (const tabla of tablas) {
            columnasLocales[tabla] = new Set((await all(sqlite, `PRAGMA table_info("${tabla}")`)).map((columna) => columna.name));
        }

        await run(sqlite, "PRAGMA foreign_keys = OFF");
        await run(sqlite, "BEGIN IMMEDIATE");
        try {
            for (const tabla of ordenBorrado) await run(sqlite, `DELETE FROM "${tabla}"`);

            for (const tabla of tablas) {
                for (const fila of filas[tabla]) {
                    const columnas = Object.keys(fila).filter((columna) => columnasLocales[tabla].has(columna));
                    const valores = columnas.map((columna) => normalizar(fila[columna]));
                    const nombres = columnas.map((columna) => `"${columna}"`).join(", ");
                    await run(sqlite, `INSERT INTO "${tabla}" (${nombres}) VALUES (${columnas.map(() => "?").join(", ")})`, valores);
                }
            }

            for (const cuenta of credencialesLocales) {
                const existente = await all(sqlite, "SELECT id_usuario FROM usuario WHERE lower(email) = lower(?)", [cuenta.email]);
                if (existente[0]) {
                    await run(sqlite, "UPDATE usuario SET password_hash = ? WHERE id_usuario = ?", [cuenta.password_hash, existente[0].id_usuario]);
                } else {
                    await run(sqlite, `
                        INSERT INTO usuario (nombre, email, rol, activo, password_hash)
                        VALUES (?, ?, ?, ?, ?)
                    `, [cuenta.nombre, cuenta.email, cuenta.rol, cuenta.activo, cuenta.password_hash]);
                }
            }

            const errores = await all(sqlite, "PRAGMA foreign_key_check");
            if (errores.length) throw new Error("La importación produjo referencias inválidas; se restaurará el contenido anterior.");
            await run(sqlite, "COMMIT");
        } catch (error) {
            await run(sqlite, "ROLLBACK").catch(() => {});
            throw error;
        } finally {
            await run(sqlite, "PRAGMA foreign_keys = ON");
        }

        console.log(`Importación completada: ${filas.ficha.length} fichas y ${archivos} archivos descargados.`);
        console.log(`Respaldo local creado en: ${path.relative(raiz, respaldo)}`);
    } finally {
        await cerrar(sqlite);
        await pool.end();
    }
}

importar().catch((error) => {
    console.error("No se pudo importar Supabase a SQLite:", error.message);
    process.exitCode = 1;
});
