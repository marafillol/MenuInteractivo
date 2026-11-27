
require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { Pool } = require("pg");
const sqlite3 = require("sqlite3").verbose();
const { createClient } = require("@supabase/supabase-js");

const raiz = path.resolve(__dirname, "..");

const tablas = [
    "plantilla",
    "menu",
    "etiqueta",
    "ficha",
    "multimedia",
    "ficha_etiqueta",
    "relacion_ficha"
];

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CLAVE_MARCA = "sync.initial_import_completed";
const bucket = process.env.SUPABASE_BUCKET || "multimedia";

const rutaSQLite = process.env.DATABASE_SQLITE_PATH
    ? path.resolve(process.env.DATABASE_SQLITE_PATH)
    : null;

const carpetaMultimedia = process.env.INICIALIZAR_LOCAL_MEDIA_DIR
    ? path.resolve(process.env.INICIALIZAR_LOCAL_MEDIA_DIR)
    : path.join(raiz, "imagenes", "importadas-supabase");

function exigir(condicion, mensaje) {
    if (!condicion) throw new Error(mensaje);
}

function abrirSQLite(ruta) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(ruta, error => {
            if (error) reject(error);
            else resolve(db);
        });
    });
}

function cerrarSQLite(db) {
    return new Promise((resolve, reject) => {
        db.close(error => error ? reject(error) : resolve());
    });
}

function all(db, sql, valores = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, valores, (error, filas) => {
            if (error) reject(error);
            else resolve(filas);
        });
    });
}

function get(db, sql, valores = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, valores, (error, fila) => {
            if (error) reject(error);
            else resolve(fila);
        });
    });
}

function run(db, sql, valores = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, valores, function (error) {
            if (error) reject(error);
            else resolve(this);
        });
    });
}

function normalizar(valor) {
    if (valor === undefined) return null;
    if (valor instanceof Date) return valor.toISOString();
    if (typeof valor === "boolean") return valor ? 1 : 0;

    if (
        valor &&
        typeof valor === "object" &&
        !Buffer.isBuffer(valor)
    ) {
        return JSON.stringify(valor);
    }

    return valor;
}

function hash(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

function obtenerRutaStorage(valor) {
    if (typeof valor !== "string" || !valor.trim()) return null;

    try {
        const url = new URL(valor);
        const marcador = `/storage/v1/object/public/${bucket}/`;
        const posicion = url.pathname.indexOf(marcador);

        if (posicion === -1) return null;

        const ruta = decodeURIComponent(
            url.pathname.slice(posicion + marcador.length)
        );

        const partes = ruta.split("/");

        if (
            !ruta ||
            partes.some(p => !p || p === "." || p === "..")
        ) {
            throw new Error(`Ruta de Storage no segura: ${valor}`);
        }

        return ruta;
    } catch (error) {
        if (error.message.includes("no segura")) throw error;
        return null;
    }
}

function destinoArchivo(rutaStorage) {
    const partes = rutaStorage.split("/");

    const destino = path.resolve(carpetaMultimedia, ...partes);
    const relativa = path.relative(carpetaMultimedia, destino);

    exigir(
        relativa &&
        !relativa.startsWith("..") &&
        !path.isAbsolute(relativa),
        `Destino multimedia no seguro: ${rutaStorage}`
    );

    return destino;
}

async function columnasSQLite(db, tabla) {
    return all(db, `PRAGMA table_info("${tabla}")`);
}

async function comprobarTablasLocales(db) {
    for (const tabla of tablas) {
        const existe = await get(
            db,
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            [tabla]
        );

        exigir(existe, `No existe la tabla local ${tabla}.`);

        const columnas = await columnasSQLite(db, tabla);
        const nombres = new Set(columnas.map(c => c.name));

        for (const columna of [
            "sync_id",
            "sync_version",
            "sync_deleted_at"
        ]) {
            exigir(
                nombres.has(columna),
                `La tabla ${tabla} no tiene la columna ${columna}. Prepará el esquema de sincronización primero.`
            );
        }
    }

    const auxiliares = [
        "sync_eventos",
        "sync_dispositivos",
        "sync_conflictos"
    ];

    for (const tabla of auxiliares) {
        const existe = await get(
            db,
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            [tabla]
        );

        exigir(existe, `Falta la tabla auxiliar ${tabla}.`);
    }

    const configuracion = await get(
        db,
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'configuracion'"
    );

    exigir(configuracion, "No existe la tabla configuracion.");
}

async function comprobarBaseVacia(db) {
    const marca = await get(
        db,
        "SELECT valor FROM configuracion WHERE clave = ?",
        [CLAVE_MARCA]
    );

    exigir(
        !marca,
        "Esta base ya tiene una marca de importación inicial. No se puede repetir."
    );

    // El usuario local ID 3 debe conservarse con su contraseña original.
    const usuarioLocal = await get(
        db,
        `SELECT id_usuario, password_hash
         FROM usuario
         WHERE id_usuario = ?`,
        [3]
    );

    exigir(
        usuarioLocal && usuarioLocal.password_hash,
        "No se encontró el usuario local ID 3 con su contraseña. Se cancela la importación."
    );
}
async function obtenerDatosRemotos(pool) {
    const resultado = {};

    for (const tabla of tablas) {
        const consulta = await pool.query(
            `SELECT * FROM public."${tabla}"`
        );

        resultado[tabla] = consulta.rows;
    }

    // Los usuarios se consultan, pero nunca se modifican en Supabase.
    const usuarios = await pool.query(
        `SELECT
            id_usuario,
            supabase_uid,
            nombre,
            email,
            rol,
            activo,
            creado,
            actualizado
         FROM public.usuario
         ORDER BY id_usuario`
    );

    resultado.usuario = usuarios.rows;

    return resultado;
}

async function insertarUsuariosRemotos(db, usuarios) {
    for (const usuario of usuarios) {
        await run(
            db,
            `INSERT INTO usuario (
                id_usuario,
                supabase_uid,
                nombre,
                email,
                rol,
                activo,
                creado,
                actualizado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                usuario.id_usuario,
                usuario.supabase_uid,
                usuario.nombre,
                usuario.email,
                usuario.rol,
                normalizar(usuario.activo),
                normalizar(usuario.creado),
                normalizar(usuario.actualizado)
            ]
        );
    }
}

async function vaciarContenidoLocal(db) {
    // Primero se eliminan las tablas dependientes.
    const ordenEliminacion = [
        "ficha_etiqueta",
        "relacion_ficha",
        "multimedia",
        "ficha",
        "menu",
        "etiqueta",
        "plantilla"
    ];

    for (const tabla of ordenEliminacion) {
        await run(db, `DELETE FROM "${tabla}"`);
    }

    // Se conservan exclusivamente las cuentas locales ID 3.
    await run(
        db,
        "DELETE FROM usuario WHERE id_usuario <> ?",
        [3]
    );
}

async function reemplazarContenidoLocal(db) {
    // Primero se eliminan las tablas dependientes.
    const ordenBorrado = [
        "ficha_etiqueta",
        "relacion_ficha",
        "multimedia",
        "ficha",
        "menu",
        "etiqueta",
        "plantilla"
    ];

    for (const tabla of ordenBorrado) {
        await run(db, `DELETE FROM "${tabla}"`);
    }

    // Se conservan exclusivamente los usuarios locales ID 3.
    await run(
        db,
        "DELETE FROM usuario WHERE id_usuario <> ?",
        [3]
    );
}

function validarIdentidades(datos) {
    for (const tabla of tablas) {
        const filas = datos[tabla];
        const identidades = new Set();

        for (const fila of filas) {
            exigir(
                typeof fila.sync_id === "string" &&
                UUID_RE.test(fila.sync_id),
                `La tabla remota ${tabla} contiene un sync_id inválido.`
            );

            exigir(
                !identidades.has(fila.sync_id),
                `La tabla remota ${tabla} contiene sync_id duplicados.`
            );

            identidades.add(fila.sync_id);

            exigir(
                Number.isInteger(Number(fila.sync_version)) &&
                Number(fila.sync_version) >= 1,
                `La tabla ${tabla} contiene una sync_version inválida.`
            );
        }
    }
}

async function resolverUsuarios(db, datos) {
    const clavesForaneas = await all(
        db,
        'PRAGMA foreign_key_list("ficha")'
    );

    const tieneReferenciaUsuario = clavesForaneas.some(
        fk => fk.from === "id_usuario" && fk.table === "usuario"
    );

    if (!tieneReferenciaUsuario) return;

    const columnas = await columnasSQLite(db, "ficha");
    const columnaUsuario = columnas.find(c => c.name === "id_usuario");

    exigir(
        columnaUsuario,
        "La tabla ficha tiene una referencia a usuario, pero no se encontró id_usuario."
    );

    const usuariosLocales = await all(
        db,
        "SELECT id_usuario FROM usuario"
    );

    const idsLocales = new Set(
        usuariosLocales.map(u => String(u.id_usuario))
    );

    for (const ficha of datos.ficha) {
        if (ficha.id_usuario == null) continue;

        if (!idsLocales.has(String(ficha.id_usuario))) {
            exigir(
                Number(columnaUsuario.notnull) === 0,
                "Hay fichas asociadas a usuarios remotos que no existen localmente y la columna id_usuario no admite NULL."
            );

            ficha.id_usuario = null;
        }
    }
}

async function descargarMultimedia(datos, supabase) {
    const archivos = new Map();

    const campos = [
        ["ficha", "imagen"],
        ["multimedia", "ruta_archivo"],
        ["multimedia", "miniatura"]
    ];

    for (const [tabla, campo] of campos) {
        for (const fila of datos[tabla]) {
            const ruta = obtenerRutaStorage(fila[campo]);

            if (ruta) archivos.set(ruta, true);
        }
    }

    const temporales = fs.mkdtempSync(
        path.join(os.tmpdir(), "museo-inicializacion-")
    );

    const descargados = new Map();

    try {
        for (const ruta of archivos.keys()) {
            const { data, error } = await supabase.storage
                .from(bucket)
                .download(ruta);

            if (error) {
                throw new Error(
                    `No se pudo descargar ${ruta}: ${error.message}`
                );
            }

            const buffer = Buffer.from(await data.arrayBuffer());
            const temporal = path.join(
                temporales,
                `${hash(Buffer.from(ruta)).slice(0, 24)}.bin`
            );

            fs.writeFileSync(temporal, buffer);

            descargados.set(ruta, {
                buffer,
                temporal,
                destino: destinoArchivo(ruta)
            });
        }

        for (const [tabla, campo] of campos) {
            for (const fila of datos[tabla]) {
                const ruta = obtenerRutaStorage(fila[campo]);

                if (!ruta) continue;

                const archivo = descargados.get(ruta);
                const relativa = path.relative(raiz, archivo.destino);

                fila[campo] = relativa
                    .split(path.sep)
                    .join("/");
            }
        }

        return { descargados, temporales };
    } catch (error) {
        fs.rmSync(temporales, { recursive: true, force: true });
        throw error;
    }
}

async function instalarArchivos(descargados) {
    const archivosNuevos = [];

    try {
        for (const [ruta, archivo] of descargados) {
            fs.mkdirSync(path.dirname(archivo.destino), {
                recursive: true
            });

            if (fs.existsSync(archivo.destino)) {
                const existente = fs.readFileSync(archivo.destino);

                exigir(
                    hash(existente) === hash(archivo.buffer),
                    `Ya existe un archivo diferente en destino: ${ruta}. No se sobrescribió.`
                );

                continue;
            }

            fs.copyFileSync(
                archivo.temporal,
                archivo.destino,
                fs.constants.COPYFILE_EXCL
            );

            archivosNuevos.push(archivo.destino);
        }

        return archivosNuevos;
    } catch (error) {
        for (const archivo of archivosNuevos) {
            try {
                fs.unlinkSync(archivo);
            } catch (_) {
                // Se conserva el error original.
            }
        }

        throw error;
    }
}

async function insertarFilas(db, datos) {
    for (const tabla of tablas) {
        const columnasLocales = await columnasSQLite(db, tabla);
        const permitidas = new Set(columnasLocales.map(c => c.name));

        for (const fila of datos[tabla]) {
            const nombres = Object.keys(fila).filter(
                nombre => permitidas.has(nombre)
            );

            exigir(
                nombres.length > 0,
                `No hay columnas compatibles para importar ${tabla}.`
            );

            const columnasSQL = nombres
                .map(nombre => `"${nombre}"`)
                .join(", ");

            const parametros = nombres.map(() => "?").join(", ");

            const valores = nombres.map(nombre =>
                normalizar(fila[nombre])
            );

            await run(
                db,
                `INSERT INTO "${tabla}" (${columnasSQL}) VALUES (${parametros})`,
                valores
            );
        }
    }
}

async function guardarMarca(db) {
    const columnas = await columnasSQLite(db, "configuracion");
    const nombres = new Set(columnas.map(c => c.name));

    exigir(
        nombres.has("clave") && nombres.has("valor"),
        "No se reconoce la estructura de la tabla configuracion. No se puede guardar la marca de importación."
    );

    const campos = ["clave", "valor"];
    const valores = [
        CLAVE_MARCA,
        new Date().toISOString()
    ];

    if (nombres.has("actualizado")) {
        campos.push("actualizado");
        valores.push(new Date().toISOString());
    }

    const lista = campos.map(c => `"${c}"`).join(", ");
    const parametros = campos.map(() => "?").join(", ");

    await run(
        db,
        `INSERT INTO configuracion (${lista}) VALUES (${parametros})`,
        valores
    );
}

async function importar() {
    exigir(
        process.env.INICIALIZAR_LOCAL_DESDE_SUPABASE === "true",
        "Falta la confirmación INICIALIZAR_LOCAL_DESDE_SUPABASE=true."
    );

    exigir(
        rutaSQLite,
        "Debés indicar DATABASE_SQLITE_PATH explícitamente."
    );

    exigir(
        fs.existsSync(rutaSQLite),
        `No existe la base SQLite indicada: ${rutaSQLite}`
    );

    exigir(
        process.env.DATABASE_URL &&
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Faltan DATABASE_URL, SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
    );

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const db = await abrirSQLite(rutaSQLite);

    let transaccionAbierta = false;
    let archivosNuevos = [];
    let temporales = null;

    try {
        await run(db, "PRAGMA foreign_keys = ON");
        await comprobarTablasLocales(db);
        await comprobarBaseVacia(db);

        console.log("Base local vacía y esquema preparado.");

        const datos = await obtenerDatosRemotos(pool);

        validarIdentidades(datos);
        await resolverUsuarios(db, datos);

        console.log("Identidades remotas verificadas.");

        const multimedia = await descargarMultimedia(
            datos,
            supabase
        );

        temporales = multimedia.temporales;

        await run(db, "BEGIN IMMEDIATE");
        transaccionAbierta = true;

        // Se conserva la configuración local y se reemplaza el contenido.
        await reemplazarContenidoLocal(db);

        archivosNuevos = await instalarArchivos(
            multimedia.descargados
        );

        // Primero los usuarios, luego las entidades que pueden referenciarlos.
        await insertarUsuariosRemotos(db, datos.usuario);

        await insertarFilas(db, datos);
        await guardarMarca(db);

        const erroresFK = await all(
            db,
            "PRAGMA foreign_key_check"
        );

        exigir(
            erroresFK.length === 0,
            `Se detectaron referencias inválidas: ${JSON.stringify(erroresFK.slice(0, 10))}`
        );

        await run(db, "COMMIT");
        transaccionAbierta = false;

        console.log("");
        console.log("Inicialización local completada.");

        for (const tabla of tablas) {
            console.log(
                `${tabla}: ${datos[tabla].length} registros`
            );
        }

        console.log(`Archivos multimedia revisados: ${multimedia.descargados.size}`);
        console.log("No se importaron usuarios ni configuraciones remotas.");
        console.log("No se generaron eventos de sincronización.");
        console.log("Marca de importación guardada correctamente.");

    } catch (error) {
        if (transaccionAbierta) {
            try {
                await run(db, "ROLLBACK");
            } catch (_) {
                // Se conserva el error original.
            }
        }

        for (const archivo of archivosNuevos) {
            try {
                fs.unlinkSync(archivo);
            } catch (_) {
                // Se conserva el error original.
            }
        }

        throw error;

    } finally {
        if (temporales) {
            fs.rmSync(temporales, {
                recursive: true,
                force: true
            });
        }

        await cerrarSQLite(db);
        await pool.end();
    }
}

importar().catch(error => {
    console.error("");
    console.error("No se pudo inicializar la base local:");
    console.error(error.message);
    process.exitCode = 1;
});
