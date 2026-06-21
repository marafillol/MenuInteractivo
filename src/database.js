const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const dbPath = process.env.SQLITE_DB_PATH || path.join(PROJECT_ROOT, "database", "museo.db");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error al conectar a la base de datos:", err.message);
    } else {
        console.log("Base de datos conectada en:", dbPath);
    }
});

db.serialize(() => {
    // Tablas sin cambios, pero asegurando que se ejecuten correctamente
    db.run(`CREATE TABLE IF NOT EXISTS menu (
        id_menu INTEGER PRIMARY KEY AUTOINCREMENT,
        descripcion TEXT,
        imagen TEXT,
        interfaz_json TEXT,
        visible INTEGER DEFAULT 1,
        creado DATETIME DEFAULT CURRENT_TIMESTAMP,
        actualizado DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS plantilla (
        id_plantilla INTEGER PRIMARY KEY AUTOINCREMENT,
        plantilla_json TEXT,
        activo INTEGER DEFAULT 1,
        creado DATETIME DEFAULT CURRENT_TIMESTAMP,
        actualizado DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ficha (
        id_ficha INTEGER PRIMARY KEY AUTOINCREMENT,
        id_menu INTEGER NOT NULL,
        titulo TEXT NOT NULL,
        resumen TEXT,
        texto TEXT,
        imagen TEXT,
        id_plantilla INTEGER,
        datos_json TEXT,
        visible INTEGER DEFAULT 1,
        actualizado_por TEXT,
        creado DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(id_menu) REFERENCES menu(id_menu),
        FOREIGN KEY(id_plantilla) REFERENCES plantilla(id_plantilla)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS etiqueta (
        id_etiqueta INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        activo INTEGER DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ficha_etiqueta (
        id_ficha INTEGER,
        id_etiqueta INTEGER,
        creado DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id_ficha, id_etiqueta),
        FOREIGN KEY(id_ficha) REFERENCES ficha(id_ficha),
        FOREIGN KEY(id_etiqueta) REFERENCES etiqueta(id_etiqueta)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS multimedia (
        id_multi INTEGER PRIMARY KEY AUTOINCREMENT,
        descripcion TEXT,
        id_ficha INTEGER NOT NULL,
        ruta_archivo TEXT NOT NULL,
        tipo_multi TEXT,
        miniatura TEXT,
        activo INTEGER DEFAULT 1,
        creado DATETIME DEFAULT CURRENT_TIMESTAMP,
        actualizado DATETIME,
        FOREIGN KEY(id_ficha) REFERENCES ficha(id_ficha)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS relacion_ficha (
        id_relacion INTEGER PRIMARY KEY AUTOINCREMENT,
        id_ficha_origen INTEGER NOT NULL,
        id_ficha_destino INTEGER NOT NULL,
        tipo_relacion TEXT,
        FOREIGN KEY(id_ficha_origen) REFERENCES ficha(id_ficha),
        FOREIGN KEY(id_ficha_destino) REFERENCES ficha(id_ficha)
    )`);
});

module.exports = db;
