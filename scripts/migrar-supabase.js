require("dotenv").config();

const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const raizProyecto = path.resolve(__dirname, "..");
const rutaSQLite = path.join(raizProyecto, "database", "museo.db");

if(!process.env.DATABASE_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY){
    throw new Error("Faltan credenciales de Supabase en el archivo .env.");
}

const pool = new Pool({
    connectionString:process.env.DATABASE_URL,
    ssl:{ rejectUnauthorized:false }
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const bucket = process.env.SUPABASE_BUCKET || "multimedia";

const tablas = [
    "usuario", "plantilla", "menu", "ficha", "etiqueta",
    "ficha_etiqueta", "multimedia", "relacion_ficha", "configuracion"
];

const estructuras = `
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
    CREATE TABLE IF NOT EXISTS plantilla (
        id_plantilla SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        plantilla_json TEXT NOT NULL,
        activo INTEGER DEFAULT 1,
        creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS menu (
        id_menu SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        imagen TEXT,
        id_plantilla INTEGER NOT NULL REFERENCES plantilla(id_plantilla),
        visible INTEGER DEFAULT 1,
        creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ficha (
        id_ficha SERIAL PRIMARY KEY,
        id_menu INTEGER NOT NULL REFERENCES menu(id_menu),
        titulo TEXT NOT NULL,
        resumen TEXT,
        texto TEXT,
        imagen TEXT,
        datos_json TEXT,
        visible INTEGER DEFAULT 1,
        id_usuario INTEGER REFERENCES usuario(id_usuario),
        creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS etiqueta (
        id_etiqueta SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        activo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS ficha_etiqueta (
        id_ficha INTEGER NOT NULL REFERENCES ficha(id_ficha),
        id_etiqueta INTEGER NOT NULL REFERENCES etiqueta(id_etiqueta),
        creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id_ficha, id_etiqueta)
    );
    CREATE TABLE IF NOT EXISTS multimedia (
        id_multi SERIAL PRIMARY KEY,
        id_ficha INTEGER NOT NULL REFERENCES ficha(id_ficha),
        descripcion TEXT,
        ruta_archivo TEXT NOT NULL,
        tipo_multi TEXT,
        miniatura TEXT,
        activo INTEGER DEFAULT 1,
        creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS relacion_ficha (
        id_relacion SERIAL PRIMARY KEY,
        id_ficha_origen INTEGER NOT NULL REFERENCES ficha(id_ficha),
        id_ficha_destino INTEGER NOT NULL REFERENCES ficha(id_ficha),
        tipo_relacion TEXT
    );
    CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL,
        actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

const definiciones = {
    usuario:["id_usuario", "firebase_uid", "nombre", "email", "rol", "activo", "creado", "actualizado"],
    plantilla:["id_plantilla", "nombre", "descripcion", "plantilla_json", "activo", "creado", "actualizado"],
    menu:["id_menu", "nombre", "descripcion", "imagen", "id_plantilla", "visible", "creado", "actualizado"],
    ficha:["id_ficha", "id_menu", "titulo", "resumen", "texto", "imagen", "datos_json", "visible", "id_usuario", "creado", "actualizado"],
    etiqueta:["id_etiqueta", "nombre", "descripcion", "activo"],
    ficha_etiqueta:["id_ficha", "id_etiqueta", "creado"],
    multimedia:["id_multi", "id_ficha", "descripcion", "ruta_archivo", "tipo_multi", "miniatura", "activo", "creado", "actualizado"],
    relacion_ficha:["id_relacion", "id_ficha_origen", "id_ficha_destino", "tipo_relacion"],
    configuracion:["clave", "valor", "actualizado"]
};

const clavesPrimarias = {
    usuario:"id_usuario", plantilla:"id_plantilla", menu:"id_menu", ficha:"id_ficha",
    etiqueta:"id_etiqueta", multimedia:"id_multi", relacion_ficha:"id_relacion"
};

function leerTabla(db, tabla){
    return new Promise((resolve, reject)=>{
        db.all(`SELECT * FROM ${tabla}`, (error, filas)=>{
            if(error){
                reject(error);
                return;
            }

            resolve(filas);
        });
    });
}

async function importarTabla(db, tabla){
    const columnas = definiciones[tabla];
    const filas = await leerTabla(db, tabla);

    for(const fila of filas){
        const valores = columnas.map(columna=>fila[columna]);
        const parametros = columnas.map((_, indice)=>`$${indice + 1}`).join(", ");
        const conflicto = tabla === "ficha_etiqueta"
            ? "ON CONFLICT (id_ficha, id_etiqueta) DO NOTHING"
            : `ON CONFLICT (${clavesPrimarias[tabla] || "clave"}) DO NOTHING`;

        await pool.query(
            `INSERT INTO ${tabla} (${columnas.join(", ")}) VALUES (${parametros}) ${conflicto}`,
            valores
        );
    }

    console.log(`${tabla}: ${filas.length} registros importados.`);
}

function normalizarRuta(ruta){
    if(!ruta || /^https?:\/\//i.test(ruta)){
        return null;
    }

    const relativa = ruta.replace(/^[\\/]+/, "").replace(/\\/g, "/");
    const absoluta = path.resolve(raizProyecto, relativa);

    if(!absoluta.startsWith(raizProyecto) || !fs.existsSync(absoluta)){
        return null;
    }

    const rutaBucket = relativa
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._/-]/g, "_");

    return { relativa, absoluta, rutaBucket };
}

async function subirArchivo(ruta){
    const archivo = normalizarRuta(ruta);

    if(!archivo){
        return ruta;
    }

    const contenido = fs.readFileSync(archivo.absoluta);
    const { error } = await supabase.storage
        .from(bucket)
        .upload(archivo.rutaBucket, contenido, { upsert:true });

    if(error){
        throw error;
    }

    return supabase.storage.from(bucket).getPublicUrl(archivo.rutaBucket).data.publicUrl;
}

async function migrarArchivos(db){
    const campos = [
        { tabla:"menu", id:"id_menu", campo:"imagen" },
        { tabla:"ficha", id:"id_ficha", campo:"imagen" },
        { tabla:"multimedia", id:"id_multi", campo:"ruta_archivo" }
    ];

    for(const item of campos){
        const filas = await leerTabla(db, item.tabla);

        for(const fila of filas){
            const nuevaRuta = await subirArchivo(fila[item.campo]);

            if(nuevaRuta && nuevaRuta !== fila[item.campo]){
                await pool.query(
                    `UPDATE ${item.tabla} SET ${item.campo} = $1 WHERE ${item.id} = $2`,
                    [nuevaRuta, fila[item.id]]
                );
            }
        }

        console.log(`${item.tabla}: archivos procesados.`);
    }
}

async function sincronizarSecuencias(){
    for(const [tabla, columna] of Object.entries(clavesPrimarias)){
        await pool.query(
            `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX(${columna}) FROM ${tabla}), 1), true)`,
            [tabla, columna]
        );
    }
}

async function verificarDestinoVacio(){
    for(const tabla of tablas){
        const { rows } = await pool.query(`SELECT COUNT(*)::int AS cantidad FROM ${tabla}`);

        if(rows[0].cantidad > 0){
            throw new Error(`Supabase ya contiene datos en ${tabla}. La migracion se detuvo para no duplicarlos.`);
        }
    }
}

async function main(){
    const sqlite = new sqlite3.Database(rutaSQLite);
    const soloArchivos = process.argv.includes("--archivos");

    try{
        if(!soloArchivos){
            await pool.query(estructuras);
            await verificarDestinoVacio();

            for(const tabla of tablas){
                await importarTabla(sqlite, tabla);
            }

            await sincronizarSecuencias();
        }

        await migrarArchivos(sqlite);
        console.log("Migracion terminada. SQLite local se conserva sin cambios.");
    }finally{
        sqlite.close();
        await pool.end();
    }
}

main().catch(error=>{
    console.error("Error de migracion:", error.message);
    process.exitCode = 1;
});
