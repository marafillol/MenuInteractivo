require("dotenv").config();
const { esModoSupabase } = require("./config/modoServidor");

if (esModoSupabase) {
    if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL para iniciar el modo Supabase.");

    module.exports = require("./databasePostgres");

} else {

// Importa la librería sqlite3 para trabajar con la base de datos SQLite
// y path para manejar rutas de archivos de forma segura.
const sqlite3 = require("sqlite3").verbose();
const path = require("path");


// =====================================================
// CONFIGURACIÓN DE LA BASE DE DATOS
// =====================================================

// Define la ruta absoluta donde se encuentra el archivo SQLite.
// La base de datos utilizada por el sistema es museo.db.
const dbPath = process.env.DATABASE_SQLITE_PATH
    ? path.resolve(process.env.DATABASE_SQLITE_PATH)
    : path.resolve(__dirname, "../database/museo.db");


// =====================================================
// CONEXIÓN CON LA BASE DE DATOS
// =====================================================

// Crea una conexión con la base de datos SQLite.
// Si el archivo no existe, SQLite lo crea automáticamente.
const db = new sqlite3.Database(dbPath, (err) => {

    if (err) {

        console.error(
            "Error al conectar a la base de datos:",
            err.message
        );

    } else {

        console.log(
            "Base de datos conectada en:",
            dbPath
        );

    }

});



// =====================================================
// CREACIÓN DE TABLAS
// =====================================================

// serialize permite ejecutar las consultas SQL una detrás de otra,
// asegurando que las tablas se creen en el orden correcto.
db.serialize(() => {



    // =================================================
    // TABLA USUARIO
    // =================================================

    // Almacena los usuarios que pueden acceder al panel administrativo.
    // Guarda información de autenticación, permisos y estado del usuario.

    db.run(`
        CREATE TABLE IF NOT EXISTS usuario(

            id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,

            supabase_uid TEXT UNIQUE,

            nombre TEXT NOT NULL,

            email TEXT UNIQUE NOT NULL,

            rol TEXT NOT NULL,

            activo INTEGER DEFAULT 1,

            creado DATETIME DEFAULT CURRENT_TIMESTAMP,

            actualizado DATETIME DEFAULT CURRENT_TIMESTAMP

        );
    `);



    // =================================================
    // TABLA PLANTILLA
    // =================================================

    // Guarda las estructuras dinámicas utilizadas por las fichas.
    // La estructura se almacena en formato JSON para permitir
    // diferentes tipos de contenido sin modificar la base de datos.

    db.run(`
        CREATE TABLE IF NOT EXISTS plantilla (

            id_plantilla INTEGER PRIMARY KEY AUTOINCREMENT,

            nombre TEXT NOT NULL,

            descripcion TEXT,

            plantilla_json TEXT NOT NULL,

            activo INTEGER DEFAULT 1,

            creado DATETIME DEFAULT CURRENT_TIMESTAMP,

            actualizado DATETIME
        )
    `);



    // =================================================
    // TABLA MENU
    // =================================================

    // Representa las categorías principales del sistema.
    // Cada menú utiliza una plantilla que define la estructura
    // de las fichas que contiene.

    db.run(`
        CREATE TABLE IF NOT EXISTS menu (

            id_menu INTEGER PRIMARY KEY AUTOINCREMENT,

            nombre TEXT NOT NULL,

            descripcion TEXT,

            imagen TEXT,

            id_plantilla INTEGER NOT NULL,

            visible INTEGER DEFAULT 1,

            creado DATETIME DEFAULT CURRENT_TIMESTAMP,

            actualizado DATETIME,


            FOREIGN KEY(id_plantilla)

            REFERENCES plantilla(id_plantilla)
        )
    `);

    // Ajustes globales del sitio, por ejemplo el estilo de la vista visitante.
    db.run(`
        CREATE TABLE IF NOT EXISTS configuracion(

            clave TEXT PRIMARY KEY,

            valor TEXT NOT NULL,

            actualizado DATETIME DEFAULT CURRENT_TIMESTAMP

        )
    `);



    // =================================================
    // TABLA FICHA
    // =================================================

    // Contiene la información individual mostrada al visitante.
    // Una ficha pertenece a un menú y puede contener información
    // general e información específica almacenada como JSON.

    db.run(`
        CREATE TABLE IF NOT EXISTS ficha (

            id_ficha INTEGER PRIMARY KEY AUTOINCREMENT,

            id_menu INTEGER NOT NULL,

            titulo TEXT NOT NULL,

            resumen TEXT,

            texto TEXT,

            imagen TEXT,

            datos_json TEXT,

            visible INTEGER DEFAULT 1,

            id_usuario INTEGER,

            creado DATETIME DEFAULT CURRENT_TIMESTAMP,

            actualizado DATETIME,


            FOREIGN KEY(id_menu)

            REFERENCES menu(id_menu),


            FOREIGN KEY(id_usuario)

            REFERENCES usuario(id_usuario)
        )
    `);



    // =================================================
    // TABLA ETIQUETA
    // =================================================

    // Guarda etiquetas utilizadas para clasificar y organizar fichas.

    // Ejemplos:
    // - Historia
    // - Militar
    // - Fauna
    // - Antártida

    db.run(`
        CREATE TABLE IF NOT EXISTS etiqueta (

            id_etiqueta INTEGER PRIMARY KEY AUTOINCREMENT,

            nombre TEXT NOT NULL,

            descripcion TEXT,

            activo INTEGER DEFAULT 1
        )
    `);



    // =================================================
    // TABLA INTERMEDIA FICHA - ETIQUETA
    // =================================================

    // Permite una relación muchos a muchos.
    //
    // Una ficha puede tener muchas etiquetas.
    // Una etiqueta puede pertenecer a muchas fichas.

    db.run(`
        CREATE TABLE IF NOT EXISTS ficha_etiqueta (

            id_ficha INTEGER NOT NULL,

            id_etiqueta INTEGER NOT NULL,

            creado DATETIME DEFAULT CURRENT_TIMESTAMP,


            PRIMARY KEY(
                id_ficha,
                id_etiqueta
            ),


            FOREIGN KEY(id_ficha)

            REFERENCES ficha(id_ficha),


            FOREIGN KEY(id_etiqueta)

            REFERENCES etiqueta(id_etiqueta)
        )
    `);



    // =================================================
    // TABLA MULTIMEDIA
    // =================================================

    // Guarda los archivos multimedia asociados a cada ficha.
    //
    // Puede almacenar imágenes, videos, audios u otros recursos.

    db.run(`
        CREATE TABLE IF NOT EXISTS multimedia (

            id_multi INTEGER PRIMARY KEY AUTOINCREMENT,

            id_ficha INTEGER NOT NULL,

            descripcion TEXT,

            ruta_archivo TEXT NOT NULL,

            tipo_multi TEXT,

            miniatura TEXT,

            activo INTEGER DEFAULT 1,

            creado DATETIME DEFAULT CURRENT_TIMESTAMP,

            actualizado DATETIME,


            FOREIGN KEY(id_ficha)

            REFERENCES ficha(id_ficha)
        )
    `);



    // =================================================
    // TABLA RELACIÓN ENTRE FICHAS
    // =================================================

    // Permite vincular fichas entre sí.
    //
    // Ejemplo:
    // Una ficha de un soldado puede estar relacionada
    // con una ficha de una batalla.

    db.run(`
        CREATE TABLE IF NOT EXISTS relacion_ficha (

            id_relacion INTEGER PRIMARY KEY AUTOINCREMENT,

            id_ficha_origen INTEGER NOT NULL,

            id_ficha_destino INTEGER NOT NULL,

            tipo_relacion TEXT,


            FOREIGN KEY(id_ficha_origen)

            REFERENCES ficha(id_ficha),


            FOREIGN KEY(id_ficha_destino)

            REFERENCES ficha(id_ficha)
        )
    `);


});


// Preparación explícita de SQLite. El servidor debe esperar esta promesa
// antes de atender peticiones para garantizar PRAGMAs y migraciones completas.
const consultarSQLite = (sql) => new Promise((resolve, reject) => {
    db.all(sql, [], (error, filas) => error ? reject(error) : resolve(filas));
});
const obtenerSQLite = (sql) => new Promise((resolve, reject) => {
    db.get(sql, [], (error, fila) => error ? reject(error) : resolve(fila));
});
const ejecutarSQLite = (sql) => new Promise((resolve, reject) => {
    db.run(sql, (error) => error ? reject(error) : resolve());
});

let preparacionPendiente = null;

db.preparar = () => {
    if (preparacionPendiente) return preparacionPendiente;

    preparacionPendiente = (async () => {
        // Estas opciones son por conexión; foreign_keys debe activarse
        // antes de ejecutar escrituras de la aplicación.
        await ejecutarSQLite("PRAGMA foreign_keys = ON");
        await ejecutarSQLite("PRAGMA busy_timeout = 5000");

        // WAL permite lectores concurrentes mientras se escribe. SQLite
        // mantiene un único escritor a la vez.
        const journal = await obtenerSQLite("PRAGMA journal_mode = WAL");
        if (String(journal?.journal_mode || "").toLowerCase() !== "wal") {
            throw new Error("No se pudo activar el modo WAL de SQLite.");
        }

        const foreignKeys = await obtenerSQLite("PRAGMA foreign_keys");
        if (Number(foreignKeys?.foreign_keys) !== 1) {
            throw new Error("No se pudo activar la integridad referencial de SQLite.");
        }

        const busyTimeout = await obtenerSQLite("PRAGMA busy_timeout");
        if (Number(busyTimeout?.timeout) !== 5000) {
            throw new Error("No se pudo configurar busy_timeout en SQLite.");
        }

        // Migraciones aditivas: no reconstruyen ni eliminan tablas o datos.
        const columnas = await consultarSQLite("PRAGMA table_info(usuario)");
        const nombres = new Set(columnas.map((columna) => columna.name));
        if (!nombres.has("supabase_uid")) {
            await ejecutarSQLite("ALTER TABLE usuario ADD COLUMN supabase_uid TEXT");
        }
        if (!nombres.has("password_hash")) {
            await ejecutarSQLite("ALTER TABLE usuario ADD COLUMN password_hash TEXT");
        }

        console.log("[SQLite] Integridad referencial, WAL y busy_timeout preparados.");
    })().catch((error) => {
        // No dejar una promesa rechazada cacheada: el proceso fallará al iniciar
        // y el error quedará visible en los logs.
        preparacionPendiente = null;
        throw error;
    });

    return preparacionPendiente;
};


const abrirConexionTransaccion = () => new Promise((resolve, reject) => {
    const conexion = new sqlite3.Database(dbPath, (error) => {
        if (error) {
            conexion.close(() => reject(error));
            return;
        }
        resolve(conexion);
    });
});

const consultarEnTransaccion = (conexion, sql, parametros = []) => {
    const consulta = String(sql).trim();
    const esLectura = /^(SELECT|PRAGMA|EXPLAIN)\\b/i.test(consulta);

    return new Promise((resolve, reject) => {
        if (esLectura) {
            conexion.all(sql, parametros, (error, filas) => {
                if (error) return reject(error);
                resolve({ rows: filas, rowCount: filas.length });
            });
            return;
        }

        conexion.run(sql, parametros, function (error) {
            if (error) return reject(error);
            resolve({
                rows: [],
                rowCount: this.changes,
                lastID: this.lastID,
                changes: this.changes
            });
        });
    });
};

// Cada transacción utiliza una conexión propia. Así, consultas normales de la
// conexión principal nunca se incorporan accidentalmente a una transacción.
// BEGIN IMMEDIATE reserva el turno de escritura y busy_timeout permite esperar
// a que termine otro escritor antes de devolver SQLITE_BUSY.
db.withTransaction = async (trabajo) => {
    if (typeof trabajo !== "function") {
        throw new TypeError("La transacción requiere una función.");
    }

    await db.preparar();
    const conexion = await abrirConexionTransaccion();
    let iniciada = false;

    try {
        await new Promise((resolve, reject) => {
            conexion.run("PRAGMA foreign_keys = ON", (error) => error ? reject(error) : resolve());
        });
        await new Promise((resolve, reject) => {
            conexion.run("PRAGMA busy_timeout = 5000", (error) => error ? reject(error) : resolve());
        });
        await new Promise((resolve, reject) => {
            conexion.run("BEGIN IMMEDIATE", (error) => error ? reject(error) : resolve());
        });
        iniciada = true;

        const consultar = (sql, parametros = []) =>
            consultarEnTransaccion(conexion, sql, parametros);

        const resultado = await trabajo(consultar);

        await new Promise((resolve, reject) => {
            conexion.run("COMMIT", (error) => error ? reject(error) : resolve());
        });
        iniciada = false;
        return resultado;
    } catch (error) {
        if (iniciada) {
            await new Promise((resolve) => {
                conexion.run("ROLLBACK", () => resolve());
            });
        }
        throw error;
    } finally {
        await new Promise((resolve) => conexion.close(() => resolve()));
    }
};

module.exports = db;

}
