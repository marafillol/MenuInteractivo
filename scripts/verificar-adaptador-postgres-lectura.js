/**
 * Verifica la conexión y operaciones de lectura del adaptador PostgreSQL.
 * Solo ejecuta SELECT. No muestra DATABASE_URL ni valores de configuración.
 *
 * Uso local:
 *   node scripts/verificar-adaptador-postgres-lectura.js
 */
require("dotenv").config();

if (!process.env.DATABASE_URL) {
    console.error("No se encontró DATABASE_URL. Configurala en el entorno local; no la compartas por chat.");
    process.exit(2);
}

const db = require("../src/databasePostgres");

const obtenerFila = (sql, parametros = []) => new Promise((resolve, reject) => {
    db.get(sql, parametros, (error, fila) => {
        if (error) return reject(error);
        resolve(fila);
    });
});

const cerrarPool = () => new Promise((resolve, reject) => {
    db.close((error) => error ? reject(error) : resolve());
});

async function verificar() {
    let errorPrincipal = null;

    try {
        const parametro = await obtenerFila(
            "SELECT ?::text AS resultado",
            ["adaptador-lectura-ok"]
        );

        if (parametro?.resultado !== "adaptador-lectura-ok") {
            throw Object.assign(new Error("Falló la prueba de parámetros."), { code: "PRUEBA_PARAMETROS" });
        }

        const conteos = await obtenerFila(`
            SELECT
                (SELECT COUNT(*)::int FROM public.menu) AS menus,
                (SELECT COUNT(*)::int FROM public.ficha) AS fichas,
                (SELECT COUNT(*)::int FROM public.plantilla) AS plantillas,
                (SELECT COUNT(*)::int FROM public.etiqueta) AS etiquetas,
                (SELECT COUNT(*)::int FROM public.multimedia) AS multimedia,
                (SELECT COUNT(*)::int FROM public.ficha_etiqueta) AS relaciones_ficha_etiqueta,
                (SELECT COUNT(*)::int FROM public.relacion_ficha) AS relaciones_ficha
        `);

        const primerMenu = await obtenerFila(
            "SELECT id_menu FROM public.menu ORDER BY id_menu LIMIT 1"
        );

        if (!primerMenu) {
            throw Object.assign(new Error("No hay menús para completar la prueba de lectura."), { code: "SIN_DATOS_MENU" });
        }

        const menuBuscado = await obtenerFila(
            "SELECT id_menu FROM public.menu WHERE id_menu = ?",
            [primerMenu.id_menu]
        );

        if (!menuBuscado || String(menuBuscado.id_menu) !== String(primerMenu.id_menu)) {
            throw Object.assign(new Error("Falló la búsqueda con parámetro."), { code: "PRUEBA_BUSQUEDA" });
        }

        const plantilla = await obtenerFila(
            "SELECT plantilla_json FROM public.plantilla ORDER BY id_plantilla LIMIT 1"
        );

        if (!plantilla || plantilla.plantilla_json === null || typeof plantilla.plantilla_json !== "object") {
            throw Object.assign(new Error("No se recibió plantilla_json como objeto JSONB."), { code: "PRUEBA_JSONB" });
        }

        const configuraciones = await obtenerFila(
            "SELECT COUNT(*)::int AS coincidencias FROM public.configuracion WHERE clave IN (?, ?)",
            ["estilo_admin", "estilo_visitante"]
        );

        console.log("Conexión a PostgreSQL: OK");
        console.log("Traducción de parámetros: OK");
        console.log("Búsqueda parametrizada: OK");
        console.log("Lectura de JSONB: OK");
        console.log("Conteos de registros:", JSON.stringify(conteos));
        console.log("Claves de configuración encontradas:", configuraciones.coincidencias);
        console.log("Todas las consultas fueron de solo lectura; no se modificó ningún dato.");
    } catch (error) {
        errorPrincipal = error;
        console.error("Falló la verificación de lectura del adaptador.");
        console.error("Código de error:", error?.code || "sin_codigo");
        console.error("No se muestra el mensaje SQL ni la URL de conexión.");
        process.exitCode = 1;
    } finally {
        try {
            await cerrarPool();
        } catch (errorCierre) {
            console.error("No se pudo cerrar correctamente el pool PostgreSQL.");
            console.error("Código de error:", errorCierre?.code || "sin_codigo");
            if (!errorPrincipal) process.exitCode = 1;
        }
    }
}

verificar();
