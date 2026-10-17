// =========================================================
// COPIA DE SEGURIDAD · Museo Malvinas
//
// Ubicación sugerida: src/controladores/respaldo.js
// Requiere:  npm install archiver
//
// Genera un .zip con:
//   • base-de-datos/<tabla>.json   → filas de cada tabla
//   • almacenamiento/<bucket>/...  → archivos de Supabase Storage
//   • almacenamiento-local/...     → carpeta "imagenes" (solo si
//                                    existe, modo sin Supabase)
//   • manifiesto.json              → resumen y errores, si hubo
// =========================================================

const path = require("path");
const fs = require("fs");
const { Readable } = require("stream");
const archiver = require("archiver");
const { createClient } = require("@supabase/supabase-js");

// ADAPTAR si hace falta: ruta al database.js del proyecto.
// Funciona tanto con PostgreSQL (DATABASE_URL) como con SQLite.
const db = require("../database");


// Tablas del sistema (ver database.js)
const TABLAS = [
    "usuario",
    "plantilla",
    "menu",
    "configuracion",
    "ficha",
    "etiqueta",
    "ficha_etiqueta",
    "multimedia",
    "relacion_ficha"
];


// Cliente de Supabase con clave de servicio (solo en el servidor)
const claveServicio =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

const supabase =
    process.env.SUPABASE_URL && claveServicio
        ? createClient(process.env.SUPABASE_URL, claveServicio, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        })
        : null;


// ---------------------------------------------------------
// Consulta de una tabla completa (los nombres vienen de la
// lista fija de arriba, nunca del usuario)
// ---------------------------------------------------------
const leerTabla = (tabla) =>
    new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${tabla}`, [], (error, filas) =>
            error ? reject(error) : resolve(filas)
        );
    });


// ---------------------------------------------------------
// Lista recursiva de archivos de un bucket
// ---------------------------------------------------------
async function listarArchivos(bucket, carpeta = "") {

    const archivos = [];

    for (let offset = 0; ; offset += 100) {

        const { data, error } = await supabase.storage
            .from(bucket)
            .list(carpeta, { limit: 100, offset });

        if (error) throw new Error(`${bucket}/${carpeta}: ${error.message}`);

        for (const item of data) {

            const ruta = carpeta ? `${carpeta}/${item.name}` : item.name;

            // Las carpetas vienen sin "id"
            if (item.id === null) {
                archivos.push(...await listarArchivos(bucket, ruta));
            } else {
                archivos.push(ruta);
            }

        }

        if (data.length < 100) break;

    }

    return archivos;

}


// ---------------------------------------------------------
// Agrega una entrada al zip y espera a que se procese, así
// se escribe un archivo a la vez (cuida la memoria en Render)
// ---------------------------------------------------------
function agregar(zip, contenido, nombre, opciones = {}) {

    return new Promise((resolve) => {

        const limpiar = () => {
            zip.off("entry", alTerminar);
            zip.off("error", alError);
        };

        const alError = () => {
            limpiar();
            resolve();
        };

        const alTerminar = (entrada) => {
            if (entrada.name !== nombre) return;
            limpiar();
            resolve();
        };

        zip.on("entry", alTerminar);
        zip.on("error", alError);
        zip.append(contenido, { name: nombre, ...opciones });

    });

}


// ---------------------------------------------------------
// GET /api/configuracion/copia-seguridad
// ---------------------------------------------------------
async function descargarCopiaSeguridad(req, res) {

    const fecha = new Date().toISOString().slice(0, 10);

    const manifiesto = {
        fecha: new Date().toISOString(),
        tablas: {},
        buckets: {},
        errores: []
    };

    // Los JSON se comprimen; los archivos multimedia se guardan
    // tal cual (ya vienen comprimidos y así se ahorra CPU).
    const zip = archiver("zip", { zlib: { level: 6 } });

    let cancelado = false;

    res.on("close", () => {
        if (!res.writableEnded) {
            cancelado = true;
            zip.abort();
        }
    });

    zip.on("warning", (err) => manifiesto.errores.push(err.message));

    zip.on("error", (err) => {
        console.error("[respaldo] Error en el zip:", err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: "No se pudo generar la copia de seguridad." });
        } else {
            res.destroy(err);
        }
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="copia-seguridad-${fecha}.zip"`
    );

    zip.pipe(res);


    try {

        // 1. Base de datos ---------------------------------
        for (const tabla of TABLAS) {

            if (cancelado) return;

            try {

                const filas = await leerTabla(tabla);

                await agregar(
                    zip,
                    JSON.stringify(filas, null, 2),
                    `base-de-datos/${tabla}.json`
                );

                manifiesto.tablas[tabla] = filas.length;

            } catch (e) {

                manifiesto.errores.push(`tabla ${tabla}: ${e.code || e.message}`);

            }

        }


        // 2. Almacenamiento en Supabase --------------------
        if (supabase) {

            const { data: buckets, error: errBuckets } =
                await supabase.storage.listBuckets();

            if (errBuckets) {

                manifiesto.errores.push(`buckets: ${errBuckets.message}`);

            } else {

                for (const bucket of buckets) {

                    let cantidad = 0;

                    try {

                        const rutas = await listarArchivos(bucket.name);

                        for (const ruta of rutas) {

                            if (cancelado) return;

                            try {

                                const { data, error } = await supabase.storage
                                    .from(bucket.name)
                                    .createSignedUrl(ruta, 600);

                                if (error) throw new Error(error.message);

                                const respuesta = await fetch(data.signedUrl);

                                if (!respuesta.ok || !respuesta.body) {
                                    throw new Error(`HTTP ${respuesta.status}`);
                                }

                                // Se descarga como flujo: no se carga el
                                // archivo completo en memoria
                                await agregar(
                                    zip,
                                    Readable.fromWeb(respuesta.body),
                                    `almacenamiento/${bucket.name}/${ruta}`,
                                    { store: true }
                                );

                                cantidad++;

                            } catch (e) {

                                manifiesto.errores.push(`${bucket.name}/${ruta}: ${e.message}`);

                            }

                        }

                    } catch (e) {

                        manifiesto.errores.push(`bucket ${bucket.name}: ${e.message}`);

                    }

                    manifiesto.buckets[bucket.name] = cantidad;

                }

            }

        }


        // 3. Archivos locales (modo sin Supabase) ----------
        const carpetaLocal = path.resolve("imagenes");

        if (fs.existsSync(carpetaLocal)) {
            zip.directory(carpetaLocal, "almacenamiento-local/imagenes", false);
            manifiesto.buckets["local:imagenes"] = "carpeta incluida";
        }


        // 4. Manifiesto y cierre ---------------------------
        zip.append(
            JSON.stringify(manifiesto, null, 2),
            { name: "manifiesto.json" }
        );

        await zip.finalize();

    } catch (error) {

        console.error("[respaldo] Error:", error.message);

        zip.abort();

        if (!res.headersSent) {
            res.status(500).json({ error: "No se pudo generar la copia de seguridad." });
        } else {
            res.destroy(error);
        }

    }

}


module.exports = { descargarCopiaSeguridad };