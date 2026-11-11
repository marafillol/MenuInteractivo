const { esClaveHistoricaPermitida } = require("./resolverStorageHistorico");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TABLAS = [
    "plantilla",
    "menu",
    "ficha",
    "etiqueta",
    "ficha_etiqueta",
    "relacion_ficha",
    "multimedia"
];

const COLUMNAS = {
    plantilla: [
        "id_plantilla", "nombre", "descripcion", "plantilla_json", "activo",
        "creado", "actualizado", "sync_id", "sync_version", "sync_deleted_at"
    ],
    menu: [
        "id_menu", "nombre", "descripcion", "imagen", "id_plantilla", "visible",
        "creado", "actualizado", "sync_id", "sync_version", "sync_deleted_at",
        "imagen_storage_key", "imagen_checksum_sha256", "imagen_mime_type", "imagen_tamano_bytes"
    ],
    ficha: [
        "id_ficha", "id_menu", "titulo", "resumen", "texto", "imagen", "datos_json",
        "visible", "id_usuario", "creado", "actualizado", "sync_id", "sync_version",
        "sync_deleted_at", "imagen_storage_key", "imagen_checksum_sha256",
        "imagen_mime_type", "imagen_tamano_bytes"
    ],
    etiqueta: [
        "id_etiqueta", "nombre", "descripcion", "activo", "sync_id",
        "sync_version", "sync_deleted_at"
    ],
    ficha_etiqueta: [
        "id_ficha", "id_etiqueta", "creado", "sync_id", "sync_version", "sync_deleted_at"
    ],
    relacion_ficha: [
        "id_relacion", "id_ficha_origen", "id_ficha_destino", "tipo_relacion",
        "sync_id", "sync_version", "sync_deleted_at"
    ],
    multimedia: [
        "id_multi", "id_ficha", "descripcion", "ruta_archivo", "tipo_multi",
        "miniatura", "activo", "creado", "actualizado", "sync_id", "sync_version",
        "sync_deleted_at", "checksum_sha256", "mime_type", "tamano_bytes",
        "storage_key", "sync_previous_path"
    ]
};

const CLAVE_ESTADO = "sync.bootstrap.estado";
const CLAVE_CURSOR = "sync.cursor.supabase";

function errorBootstrap(mensaje, codigo = "BOOTSTRAP_INVALIDO") {
    const error = new Error(mensaje);
    error.code = codigo;
    return error;
}

function validarHash(valor) {
    return typeof valor === "string" && /^[a-f0-9]{64}$/i.test(valor);
}

function validarStorageKey(valor, entidad, id) {
    if (typeof valor !== "string") return false;
    if (valor.startsWith("multimedia/")) {
        const partes = valor.split("/");
        if (partes.length >= 3 && partes.every((parte) =>
            /^[a-zA-Z0-9._-]+$/.test(parte) && parte !== "." && parte !== ".."
        )) return true;
    }
    return esClaveHistoricaPermitida(entidad, id, valor);
}

function validarSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object" ||
        snapshot.version !== 1 ||
        !Number.isSafeInteger(Number(snapshot.cursor)) ||
        Number(snapshot.cursor) < 0 ||
        !snapshot.data || typeof snapshot.data !== "object") {
        throw errorBootstrap("La instantánea de Supabase tiene un formato inválido.");
    }

    const indices = {};
    for (const tabla of TABLAS) {
        const filas = snapshot.data[tabla];
        if (!Array.isArray(filas)) {
            throw errorBootstrap(`La instantánea no incluye la entidad ${tabla}.`);
        }
        const vistos = new Set();
        indices[tabla] = new Map();
        for (const fila of filas) {
            if (!fila || typeof fila !== "object" ||
                !UUID_RE.test(String(fila.sync_id || "")) ||
                !Number.isSafeInteger(Number(fila.sync_version)) ||
                Number(fila.sync_version) < 1) {
                throw errorBootstrap(`La entidad ${tabla} contiene registros sin identidad o versión válida.`, "SNAPSHOT_INCOMPLETO");
            }
            if (vistos.has(fila.sync_id)) {
                throw errorBootstrap(`La entidad ${tabla} contiene sync_id duplicados.`);
            }
            vistos.add(fila.sync_id);
            indices[tabla].set(fila.sync_id, fila);
        }
    }

    const comprobarPadre = (tabla, id, tablaPadre, campoId, entidad) => {
        const padre = snapshot.data[tablaPadre].find((fila) => Number(fila[campoId]) === Number(id));
        if (!padre) throw errorBootstrap(`${entidad} referencia un registro inexistente de ${tablaPadre}.`, "SNAPSHOT_INCOMPLETO");
        return padre;
    };

    for (const fila of snapshot.data.menu) {
        comprobarPadre("menu", fila.id_plantilla, "plantilla", "id_plantilla", "Un menú");
        if (!fila.sync_deleted_at && fila.imagen && (!validarStorageKey(fila.imagen_storage_key, "menu", fila.id_menu) || !validarHash(fila.imagen_checksum_sha256))) {
            throw errorBootstrap("Hay portadas de menú históricas sin clave de Storage y checksum verificables.", "SNAPSHOT_MULTIMEDIA_INCOMPLETO");
        }
        if (!fila.sync_deleted_at && fila.imagen_storage_key && (!validarStorageKey(fila.imagen_storage_key, "ficha", fila.id_ficha) || !validarHash(fila.imagen_checksum_sha256))) {
            throw errorBootstrap("Una portada de menú tiene metadatos de Storage inválidos.", "SNAPSHOT_MULTIMEDIA_INCOMPLETO");
        }
    }
    for (const fila of snapshot.data.ficha) {
        comprobarPadre("ficha", fila.id_menu, "menu", "id_menu", "Una ficha");
        if (!fila.sync_deleted_at && fila.imagen && (!validarStorageKey(fila.imagen_storage_key, "menu", fila.id_menu) || !validarHash(fila.imagen_checksum_sha256))) {
            throw errorBootstrap("Hay portadas de fichas históricas sin clave de Storage y checksum verificables.", "SNAPSHOT_MULTIMEDIA_INCOMPLETO");
        }
        if (!fila.sync_deleted_at && fila.imagen_storage_key && (!validarStorageKey(fila.imagen_storage_key, "ficha", fila.id_ficha) || !validarHash(fila.imagen_checksum_sha256))) {
            throw errorBootstrap("Una portada de ficha tiene metadatos de Storage inválidos.", "SNAPSHOT_MULTIMEDIA_INCOMPLETO");
        }
    }
    for (const fila of snapshot.data.multimedia) {
        comprobarPadre("multimedia", fila.id_ficha, "ficha", "id_ficha", "Un archivo multimedia");
        if (!fila.sync_deleted_at &&
            (!validarStorageKey(fila.storage_key, "multimedia", fila.id_multi) || !validarHash(fila.checksum_sha256))) {
            throw errorBootstrap("Hay archivos multimedia activos sin clave de Storage y checksum verificables.", "SNAPSHOT_MULTIMEDIA_INCOMPLETO");
        }
    }
    for (const fila of snapshot.data.ficha_etiqueta) {
        comprobarPadre("ficha_etiqueta", fila.id_ficha, "ficha", "id_ficha", "Una asociación ficha-etiqueta");
        comprobarPadre("ficha_etiqueta", fila.id_etiqueta, "etiqueta", "id_etiqueta", "Una asociación ficha-etiqueta");
    }
    for (const fila of snapshot.data.relacion_ficha) {
        comprobarPadre("relacion_ficha", fila.id_ficha_origen, "ficha", "id_ficha", "Una relación entre fichas");
        comprobarPadre("relacion_ficha", fila.id_ficha_destino, "ficha", "id_ficha", "Una relación entre fichas");
    }

    return {
        cursor: Number(snapshot.cursor),
        cantidades: Object.fromEntries(TABLAS.map((tabla) => [tabla, snapshot.data[tabla].length]))
    };
}

async function crearSnapshot(consultar) {
    // Debe ser la primera consulta de la transacción para fijar el aislamiento.
    await consultar("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
    // Bloquea escrituras de contenido/outbox hasta capturar filas y cursor juntos.
    await consultar(
        `LOCK TABLE ${[...TABLAS, "sync_eventos"].join(", ")} IN SHARE MODE`
    );

    const data = {};
    for (const tabla of TABLAS) {
        const resultado = await consultar(`SELECT * FROM ${tabla} ORDER BY 1`);
        data[tabla] = resultado.rows.map((fila) => {
            // Los usuarios y sus IDs locales no forman parte de la réplica de contenido.
            if (tabla === "ficha") return { ...fila, id_usuario: null };
            return fila;
        });
    }
    const cursorResultado = await consultar(
        "SELECT COALESCE(MAX(id_evento), 0)::bigint AS cursor FROM sync_eventos"
    );
    const snapshot = {
        version: 1,
        cursor: Number(cursorResultado.rows[0]?.cursor || 0),
        generado_en: new Date().toISOString(),
        data
    };
    validarSnapshot(snapshot);
    return snapshot;
}

async function comprobarBaseLocalVacia(consultar) {
    for (const tabla of TABLAS) {
        const resultado = await consultar(`SELECT COUNT(*) AS cantidad FROM ${tabla}`);
        if (Number(resultado.rows[0]?.cantidad || 0) > 0) {
            throw errorBootstrap(
                `La base local ya contiene registros en ${tabla}; no se importará encima de datos existentes.`,
                "BASE_LOCAL_NO_VACIA"
            );
        }
    }
    for (const tabla of ["sync_eventos", "sync_conflictos"]) {
        const resultado = await consultar(`SELECT COUNT(*) AS cantidad FROM ${tabla}`);
        if (Number(resultado.rows[0]?.cantidad || 0) > 0) {
            throw errorBootstrap(
                `La tabla local ${tabla} ya contiene datos; se requiere revisar la instalación antes de inicializar.`,
                "BASE_LOCAL_NO_VACIA"
            );
        }
    }
}

async function aplicarSnapshot(db, snapshot) {
    const resumen = validarSnapshot(snapshot);
    return db.withTransaction(async (consultar) => {
        await comprobarBaseLocalVacia(consultar);

        for (const tabla of TABLAS) {
            const columnas = COLUMNAS[tabla];
            for (const fila of snapshot.data[tabla]) {
                const valores = columnas.map((columna) => {
                    if (tabla === "ficha" && columna === "id_usuario") return null;
                    const valor = fila[columna] === undefined ? null : fila[columna];
                    if (valor instanceof Date) return valor.toISOString();
                    if (["plantilla_json", "datos_json"].includes(columna) && valor !== null && typeof valor === "object") return JSON.stringify(valor);
                    return valor;
                });
                const marcadores = columnas.map(() => "?").join(", ");
                await consultar(
                    `INSERT INTO ${tabla} (${columnas.join(", ")}) VALUES (${marcadores})`,
                    valores
                );
            }
        }

        await consultar(
            `INSERT INTO configuracion (clave, valor, actualizado)
             VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor, actualizado = CURRENT_TIMESTAMP`,
            [CLAVE_CURSOR, String(resumen.cursor)]
        );
        await consultar(
            `INSERT INTO configuracion (clave, valor, actualizado)
             VALUES (?, 'completo', CURRENT_TIMESTAMP)
             ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor, actualizado = CURRENT_TIMESTAMP`,
            [CLAVE_ESTADO]
        );

        return { estado: "inicializado", cursor: resumen.cursor, cantidades: resumen.cantidades };
    });
}

module.exports = {
    TABLAS,
    COLUMNAS,
    CLAVE_ESTADO,
    CLAVE_CURSOR,
    validarSnapshot,
    crearSnapshot,
    comprobarBaseLocalVacia,
    aplicarSnapshot
};
