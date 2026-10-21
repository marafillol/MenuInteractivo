require("dotenv").config();

const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const raizProyecto = path.resolve(__dirname, "..");
const rutaSQLite = path.join(raizProyecto, "database", "museo.db");
const bucket = process.env.SUPABASE_BUCKET || "multimedia";

if (!process.env.DATABASE_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Faltan credenciales de Supabase en el archivo .env.");
}

const sqlite = new sqlite3.Database(rutaSQLite);
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const leerTabla = (tabla) => new Promise((resolve, reject) => {
    sqlite.all(`SELECT * FROM ${tabla}`, (error, filas) => {
        if (error) {
            reject(error);
            return;
        }

        resolve(filas);
    });
});

const rutaArchivo = (ruta) => {
    if (!ruta || /^https?:\/\//i.test(ruta)) {
        return null;
    }

    const absoluta = path.resolve(raizProyecto, ruta.replace(/^[\\/]+/, ""));
    return absoluta.startsWith(raizProyecto) && fs.existsSync(absoluta) ? absoluta : null;
};

const nombreSeguro = (nombre) => nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

async function subirImagen(ficha) {
    const archivo = rutaArchivo(ficha.imagen);

    if (!archivo) {
        return ficha.imagen;
    }

    const destino = `migracion/fichas/${ficha.id_ficha}-${nombreSeguro(path.basename(archivo))}`;
    const contenido = fs.readFileSync(archivo);
    const { error } = await supabase.storage
        .from(bucket)
        .upload(destino, contenido, { upsert: true });

    if (error) {
        throw new Error(`No se pudo subir la imagen de la ficha ${ficha.id_ficha}: ${error.message}`);
    }

    return supabase.storage.from(bucket).getPublicUrl(destino).data.publicUrl;
}

async function asegurarTablasFaltantes() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS relacion_ficha (
            id_relacion SERIAL PRIMARY KEY,
            id_ficha_origen INTEGER NOT NULL,
            id_ficha_destino INTEGER NOT NULL,
            tipo_relacion TEXT
        );

        CREATE TABLE IF NOT EXISTS configuracion (
            clave TEXT PRIMARY KEY,
            valor TEXT NOT NULL,
            actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

async function sincronizarConfiguracion() {
    const configuraciones = await leerTabla("configuracion");

    for (const configuracion of configuraciones) {
        await pool.query(`
            INSERT INTO configuracion (clave, valor, actualizado)
            VALUES ($1, $2, $3)
            ON CONFLICT (clave) DO UPDATE SET
                valor = EXCLUDED.valor,
                actualizado = EXCLUDED.actualizado;
        `, [configuracion.clave, configuracion.valor, configuracion.actualizado]);
    }

    return configuraciones.length;
}

async function sincronizarRelaciones() {
    const relaciones = await leerTabla("relacion_ficha");

    for (const relacion of relaciones) {
        await pool.query(`
            INSERT INTO relacion_ficha (id_relacion, id_ficha_origen, id_ficha_destino, tipo_relacion)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id_relacion) DO UPDATE SET
                id_ficha_origen = EXCLUDED.id_ficha_origen,
                id_ficha_destino = EXCLUDED.id_ficha_destino,
                tipo_relacion = EXCLUDED.tipo_relacion;
        `, [
            relacion.id_relacion,
            relacion.id_ficha_origen,
            relacion.id_ficha_destino,
            relacion.tipo_relacion
        ]);
    }

    await pool.query(`
        SELECT setval(
            pg_get_serial_sequence('relacion_ficha', 'id_relacion'),
            COALESCE((SELECT MAX(id_relacion) FROM relacion_ficha), 1),
            true
        );
    `);

    return relaciones.length;
}

async function sincronizarFichas() {
    const fichas = await leerTabla("ficha");
    const { rows: remotas } = await pool.query("SELECT id_ficha, texto, imagen FROM ficha");
    const remotaPorId = new Map(remotas.map((ficha) => [String(ficha.id_ficha), ficha]));
    let imagenesCorregidas = 0;
    let textosCorregidos = 0;

    for (const ficha of fichas) {
        const remota = remotaPorId.get(String(ficha.id_ficha));

        if (!remota) {
            continue;
        }

        if (String(ficha.texto || "") !== String(remota.texto || "")) {
            await pool.query("UPDATE ficha SET texto = $1, actualizado = CURRENT_TIMESTAMP WHERE id_ficha = $2", [
                ficha.texto,
                ficha.id_ficha
            ]);
            textosCorregidos += 1;
        }

        if (ficha.imagen && !/^https?:\/\//i.test(remota.imagen || "")) {
            const urlPublica = await subirImagen(ficha);
            await pool.query("UPDATE ficha SET imagen = $1, actualizado = CURRENT_TIMESTAMP WHERE id_ficha = $2", [
                urlPublica,
                ficha.id_ficha
            ]);
            imagenesCorregidas += 1;
        }
    }

    return { imagenesCorregidas, textosCorregidos };
}

async function main() {
    try {
        await asegurarTablasFaltantes();
        const configuraciones = await sincronizarConfiguracion();
        const relaciones = await sincronizarRelaciones();
        const fichas = await sincronizarFichas();

        console.log(`Configuraciones sincronizadas: ${configuraciones}.`);
        console.log(`Relaciones sincronizadas: ${relaciones}.`);
        console.log(`Textos corregidos: ${fichas.textosCorregidos}.`);
        console.log(`Imágenes trasladadas a Storage: ${fichas.imagenesCorregidas}.`);
    } finally {
        sqlite.close();
        await pool.end();
    }
}

main().catch((error) => {
    console.error("Error al sincronizar contenido:", error.message);
    process.exitCode = 1;
});
