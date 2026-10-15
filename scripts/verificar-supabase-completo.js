/**
 * Auditoría de solo lectura para PostgreSQL/Supabase y Supabase Storage.
 * No hace INSERT, UPDATE, DELETE, ALTER ni subidas/eliminaciones en Storage.
 *
 * Requiere DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Uso: node scripts/verificar-supabase-completo.js
 */
require("dotenv").config();

const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const bucket = process.env.SUPABASE_BUCKET || "multimedia";

if (!databaseUrl || !supabaseUrl || !serviceRoleKey) {
    console.error("Faltan variables de conexión. Configuralas localmente y no compartas sus valores.");
    process.exit(2);
}

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
});
const storage = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const tablasRequeridas = [
    "usuario", "plantilla", "menu", "ficha", "etiqueta",
    "multimedia", "ficha_etiqueta", "relacion_ficha", "configuracion"
];

async function leerTablasPublicas() {
    const { rows } = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    return new Set(rows.map((fila) => fila.table_name));
}

async function leerColumnas(tabla) {
    const { rows } = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
        [tabla]
    );
    return new Set(rows.map((fila) => fila.column_name));
}

async function contarTabla(tabla) {
    const { rows } = await pool.query(
        `SELECT COUNT(*)::bigint AS cantidad FROM public."${tabla}"`
    );
    return Number(rows[0].cantidad);
}

async function clasificarRutas(tabla, columna) {
    const columnas = await leerColumnas(tabla);
    if (!columnas.has(columna)) {
        return { tabla, columna, estado: "columna no encontrada" };
    }

    const prefijoSupabase = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/`;
    const sql = `
        SELECT
            COUNT(*)::integer AS total,
            COUNT(*) FILTER (WHERE ${columna} IS NULL OR btrim(${columna}::text) = '')::integer AS sin_ruta,
            COUNT(*) FILTER (WHERE LEFT(${columna}::text, char_length($1)) = $1)::integer AS supabase_storage,
            COUNT(*) FILTER (
                WHERE ${columna} IS NOT NULL
                  AND btrim(${columna}::text) <> ''
                  AND LEFT(${columna}::text, char_length($1)) <> $1
                  AND (
                      POSITION('/imagenes/' IN lower(${columna}::text)) > 0
                      OR LEFT(lower(${columna}::text), 9) = 'imagenes/'
                      OR LEFT(lower(${columna}::text), 8) = '/uploads'
                      OR LEFT(lower(${columna}::text), 14) = 'public/uploads'
                  )
            )::integer AS ruta_legacy,
            COUNT(*) FILTER (
                WHERE ${columna} IS NOT NULL
                  AND btrim(${columna}::text) <> ''
                  AND LEFT(${columna}::text, char_length($1)) <> $1
                  AND ${columna}::text ~* '^https?://'
                  AND POSITION('/imagenes/' IN lower(${columna}::text)) = 0
            )::integer AS otras_urls_externas,
            COUNT(*) FILTER (
                WHERE ${columna} IS NOT NULL
                  AND btrim(${columna}::text) <> ''
                  AND LEFT(${columna}::text, char_length($1)) <> $1
                  AND ${columna}::text !~* '^https?://'
                  AND POSITION('/imagenes/' IN lower(${columna}::text)) = 0
                  AND LEFT(lower(${columna}::text), 9) <> 'imagenes/'
                  AND LEFT(lower(${columna}::text), 8) <> '/uploads'
                  AND LEFT(lower(${columna}::text), 14) <> 'public/uploads'
            )::integer AS otras_rutas
        FROM public."${tabla}"
    `;
    const { rows } = await pool.query(sql, [prefijoSupabase]);
    return { tabla, columna, ...rows[0] };
}

async function contarObjetosStorage() {
    let archivos = 0;
    let carpetas = 0;
    const visitadas = new Set();

    async function visitar(carpeta) {
        if (visitadas.has(carpeta)) return;
        visitadas.add(carpeta);
        let offset = 0;

        while (true) {
            const { data, error } = await storage.storage
                .from(bucket)
                .list(carpeta, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });

            if (error) {
                throw new Error("No se pudo listar Supabase Storage (bucket o permisos).");
            }

            for (const elemento of data || []) {
                if (!elemento.id && !elemento.metadata) {
                    carpetas += 1;
                    const siguiente = carpeta ? `${carpeta}/${elemento.name}` : elemento.name;
                    await visitar(siguiente);
                } else {
                    archivos += 1;
                }
            }

            if (!data || data.length < 1000) break;
            offset += data.length;
        }
    }

    await visitar("");
    return { bucket, archivos, carpetas };
}

async function main() {
    const tablas = await leerTablasPublicas();
    const faltantes = tablasRequeridas.filter((tabla) => !tablas.has(tabla));

    console.log("=== AUDITORÍA SUPABASE: SOLO LECTURA ===");
    console.log("Conexión PostgreSQL: OK");
    console.log("Tablas requeridas:", faltantes.length === 0 ? "todas presentes" : "faltan tablas");
    if (faltantes.length) console.log("Tablas faltantes:", faltantes.join(", "));

    for (const tabla of tablasRequeridas) {
        if (!tablas.has(tabla)) continue;
        console.log(`Registros en ${tabla}: ${await contarTabla(tabla)}`);
    }

    const rutas = [];
    if (tablas.has("menu")) rutas.push(await clasificarRutas("menu", "imagen"));
    if (tablas.has("ficha")) rutas.push(await clasificarRutas("ficha", "imagen"));
    if (tablas.has("multimedia")) rutas.push(await clasificarRutas("multimedia", "ruta_archivo"));
    console.log("Clasificación de rutas multimedia (sin listar nombres/URLs):");
    for (const ruta of rutas) console.log(JSON.stringify(ruta));

    const objetos = await contarObjetosStorage();
    console.log("Objetos encontrados en Storage:", JSON.stringify(objetos));
    console.log("Auditoría completada: no se modificaron filas ni objetos.");
}

main()
    .catch((error) => {
        console.error("Falló la auditoría. Código:", error.code || "sin_codigo");
        console.error("No se muestra la URL de conexión ni los datos de los registros.");
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end().catch(() => {});
    });
