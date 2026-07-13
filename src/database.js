// Importa la librería sqlite3 para trabajar con la base de datos SQLite
// y path para manejar rutas de archivos de forma segura.
const sqlite3 = require("sqlite3").verbose();
const path = require("path");


// =====================================================
// CONFIGURACIÓN DE LA BASE DE DATOS
// =====================================================

// Define la ruta absoluta donde se encuentra el archivo SQLite.
// La base de datos utilizada por el sistema es museo.db.
const dbPath = path.resolve(__dirname, "../database/museo.db");


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

            firebase_uid TEXT UNIQUE NOT NULL,

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


// Exporta la conexión para que los modelos puedan utilizarla
// y ejecutar consultas sobre la base de datos.
module.exports = db;