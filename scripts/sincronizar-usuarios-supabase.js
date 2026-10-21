require("dotenv").config();

const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL en el archivo .env.");
}

const rutaSQLite = path.resolve(__dirname, "..", "database", "museo.db");
const sqlite = new sqlite3.Database(rutaSQLite);
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const leerUsuarios = () => new Promise((resolve, reject) => {
    sqlite.all("SELECT id_usuario, firebase_uid, nombre, email, rol, activo, creado, actualizado FROM usuario", (error, usuarios) => {
        if (error) {
            reject(error);
            return;
        }

        resolve(usuarios);
    });
});

async function sincronizarUsuarios() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuario (
                id_usuario SERIAL PRIMARY KEY,
                firebase_uid TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                rol TEXT NOT NULL,
                activo INTEGER DEFAULT 1,
                creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const usuarios = await leerUsuarios();

        for (const usuario of usuarios) {
            await pool.query(`
                INSERT INTO usuario (id_usuario, firebase_uid, nombre, email, rol, activo, creado, actualizado)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (firebase_uid) DO UPDATE SET
                    nombre = EXCLUDED.nombre,
                    email = EXCLUDED.email,
                    rol = EXCLUDED.rol,
                    activo = EXCLUDED.activo,
                    actualizado = EXCLUDED.actualizado;
            `, [
                usuario.id_usuario,
                usuario.firebase_uid,
                usuario.nombre,
                usuario.email,
                usuario.rol,
                usuario.activo,
                usuario.creado,
                usuario.actualizado
            ]);
        }

        await pool.query(`
            SELECT setval(
                pg_get_serial_sequence('usuario', 'id_usuario'),
                COALESCE((SELECT MAX(id_usuario) FROM usuario), 1),
                true
            );
        `);

        console.log(`Usuarios sincronizados: ${usuarios.length}.`);
        console.log("Las fichas y etiquetas existentes en Supabase no fueron modificadas.");
    } finally {
        sqlite.close();
        await pool.end();
    }
}

sincronizarUsuarios().catch((error) => {
    console.error("Error al sincronizar usuarios:", error.message);
    process.exitCode = 1;
});
