const { randomUUID, timingSafeEqual } = require("node:crypto");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ENTIDADES = {
    plantilla: {
        tabla: "plantilla",
        campos: ["nombre", "descripcion", "plantilla_json", "activo"],
        requeridos: ["nombre", "plantilla_json"]
    },
    menu: {
        tabla: "menu",
        campos: [
            "nombre", "descripcion", "imagen", "imagen_storage_key",
            "imagen_checksum_sha256", "imagen_mime_type", "imagen_tamano_bytes",
            "visible", "creado", "actualizado"
        ],
        padre: { campo: "plantilla_sync_id", tabla: "plantilla", id: "id_plantilla", destino: "id_plantilla" },
        requeridos: ["nombre"]
    },
    ficha: {
        tabla: "ficha",
        campos: [
            "titulo", "resumen", "texto", "imagen", "imagen_storage_key",
            "imagen_checksum_sha256", "imagen_mime_type", "imagen_tamano_bytes",
            "datos_json", "visible", "creado", "actualizado"
        ],
        padre: { campo: "menu_sync_id", tabla: "menu", id: "id_menu", destino: "id_menu" },
        requeridos: ["titulo"]
    },
    etiqueta: {
        tabla: "etiqueta",
        campos: ["nombre", "descripcion", "activo"],
        requeridos: ["nombre"]
    },
    multimedia: {
        tabla: "multimedia",
        campos: [
            "descripcion", "ruta_archivo", "tipo_multi", "miniatura", "activo",
            "checksum_sha256", "mime_type", "tamano_bytes", "storage_key", "creado", "actualizado"
        ],
        padre: { campo: "ficha_sync_id", tabla: "ficha", id: "id_ficha", destino: "id_ficha" },
        requeridos: ["ruta_archivo", "tipo_multi", "storage_key", "checksum_sha256"]
    },
    relacion_ficha: {
        tabla: "relacion_ficha",
        campos: ["tipo_relacion"],
        padres: [
            { campo: "ficha_origen_sync_id", tabla: "ficha", id: "id_ficha", destino: "id_ficha_origen" },
            { campo: "ficha_destino_sync_id", tabla: "ficha", id: "id_ficha", destino: "id_ficha_destino" }
        ],
        requeridos: ["tipo_relacion"]
    },
    ficha_etiqueta: {
        tabla: "ficha_etiqueta",
        campos: ["creado"],
        padres: [
            { campo: "ficha_sync_id", tabla: "ficha", id: "id_ficha", destino: "id_ficha" },
            { campo: "etiqueta_sync_id", tabla: "etiqueta", id: "id_etiqueta", destino: "id_etiqueta" }
        ]
    }
};

function secretoValido(recibido, esperado) {
    if (typeof recibido !== "string" || typeof esperado !== "string") return false;
    const a = Buffer.from(recibido);
    const b = Buffer.from(esperado);
    return a.length === b.length && timingSafeEqual(a, b);
}

function normalizarPayload(valor) {
    if (valor && typeof valor === "object") return valor;
    if (typeof valor === "string") {
        try { return JSON.parse(valor); } catch { return {}; }
    }
    return {};
}

async function buscarIdPadre(consultar, padre, syncId) {
    if (typeof syncId !== "string" || !syncId) {
        throw new Error("El evento no contiene la identidad compartida de una referencia.");
    }
    const resultado = await consultar(
        `SELECT ${padre.id} FROM ${padre.tabla} WHERE sync_id = ? AND sync_deleted_at IS NULL`,
        [syncId]
    );
    const id = resultado.rows[0]?.[padre.id];
    if (id === undefined || id === null) {
        throw new Error(`Falta reconciliar la entidad padre ${padre.tabla}.`);
    }
    return id;
}

async function registrarConflicto(consultar, evento, actual, payload) {
    const conflictoId = randomUUID();
    await consultar(`
        INSERT INTO sync_conflictos (
            conflicto_id, entidad, sync_id, version_local_json,
            version_remota_json, detectado, resuelto
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        ON CONFLICT (conflicto_id) DO NOTHING
    `, [
        conflictoId, evento.entidad, evento.sync_id,
        JSON.stringify(actual || null), JSON.stringify({
            evento_id: evento.evento_id,
            version_base: evento.version_base,
            version_resultado: evento.version_resultado,
            payload
        }), false
    ]);
    return { estado: "conflicto", conflicto_id: conflictoId };
}

async function aplicarEvento(consultar, evento, { registrarRecepcion = true } = {}) {
    const definicion = ENTIDADES[evento.entidad];
    if (!definicion) {
        return { estado: "no_soportado", motivo: "Entidad todavía no habilitada para el protocolo." };
    }
    if (!["INSERT", "UPDATE", "DELETE"].includes(evento.operacion) ||
        !UUID_RE.test(String(evento.evento_id || "")) ||
        !UUID_RE.test(String(evento.origen_device_id || "")) ||
        !UUID_RE.test(String(evento.sync_id || "")) ||
        !Number.isSafeInteger(Number(evento.version_resultado)) ||
        Number(evento.version_resultado) < 1 ||
        !Number.isSafeInteger(Number(evento.version_base ?? 0)) ||
        Number(evento.version_base ?? 0) < 0) {
        throw new Error("Sobre de sincronización inválido.");
    }

    const repetido = await consultar(
        "SELECT evento_id FROM sync_eventos WHERE evento_id = ?",
        [evento.evento_id]
    );
    if (repetido.rows.length) return { estado: "duplicado" };

    const payload = normalizarPayload(evento.payload_json ?? evento.payload);
    const tabla = definicion.tabla;
    const existenteResultado = await consultar(
        `SELECT * FROM ${tabla} WHERE sync_id = ?`,
        [evento.sync_id]
    );
    const actual = existenteResultado.rows[0] || null;
    const versionActual = actual ? Number(actual.sync_version || 1) : 0;
    const versionBase = Number(evento.version_base || 0);
    const versionNueva = Number(evento.version_resultado);

    // Solo el mismo evento_id demuestra que un reintento ya fue recibido.
    // Eventos distintos que intentan escribir una versión ya ocupada son conflicto.
    if (versionActual !== versionBase) {
        const conflicto = await registrarConflicto(consultar, evento, actual, payload);
        // El conflicto también es una recepción procesada: guardar el evento
        // hace idempotente el reintento si la respuesta HTTP se pierde.
        if (registrarRecepcion) await guardarEventoRecibido(consultar, evento);
        return conflicto;
    }

    if (evento.operacion === "DELETE") {
        if (!actual) {
            const conflicto = await registrarConflicto(consultar, evento, null, payload);
            if (registrarRecepcion) await guardarEventoRecibido(consultar, evento);
            return conflicto;
        }
        const eliminadoEn = payload.deleted_at || new Date().toISOString();
        await consultar(
            `UPDATE ${tabla} SET sync_deleted_at = ?, sync_version = ?${tabla === "plantilla" || tabla === "etiqueta" || tabla === "multimedia" ? ", activo = 0" : ""} WHERE sync_id = ?`,
            [eliminadoEn, versionNueva, evento.sync_id]
        );
    } else {
        const valores = {};
        for (const campo of definicion.campos) {
            if (Object.prototype.hasOwnProperty.call(payload, campo)) valores[campo] = payload[campo];
        }

        const padres = definicion.padres || (definicion.padre ? [definicion.padre] : []);
        for (const padre of padres) {
            const id = await buscarIdPadre(consultar, padre, payload[padre.campo]);
            valores[padre.destino] = id;
        }
        for (const requerido of definicion.requeridos || []) {
            if (valores[requerido] === undefined) throw new Error(`Falta el campo obligatorio ${requerido}.`);
        }

        const columnas = Object.keys(valores);
        const columnasInsert = [...columnas, "sync_id", "sync_version", "sync_deleted_at"];
        const valoresInsert = [...columnas.map((campo) => valores[campo]), evento.sync_id, versionNueva, null];
        const marcadores = columnasInsert.map(() => "?").join(", ");
        const actualizables = [...columnas, "sync_version", "sync_deleted_at"];
        const asignaciones = actualizables.map((campo) => `${campo} = excluded.${campo}`).join(", ");
        await consultar(
            `INSERT INTO ${tabla} (${columnasInsert.join(", ")}) VALUES (${marcadores}) ON CONFLICT (sync_id) DO UPDATE SET ${asignaciones}`,
            valoresInsert
        );
    }

    if (registrarRecepcion) await guardarEventoRecibido(consultar, evento);
    return { estado: "aplicado" };
}

async function guardarEventoRecibido(consultar, evento) {
    const payload = normalizarPayload(evento.payload_json ?? evento.payload);
    await consultar(`
        INSERT INTO sync_eventos (
            evento_id, origen_device_id, entidad, operacion, sync_id,
            version_base, version_resultado, payload_json, creado, aplicado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        ON CONFLICT (evento_id) DO NOTHING
    `, [
        evento.evento_id, evento.origen_device_id, evento.entidad, evento.operacion,
        evento.sync_id, evento.version_base ?? 0, evento.version_resultado,
        JSON.stringify(payload), true
    ]);
}

async function procesarLote(consultar, eventos, opciones) {
    const confirmados = [];
    const rechazados = [];
    for (const evento of eventos) {
        try {
            const resultado = await aplicarEvento(consultar, evento, opciones);
            if (resultado.estado === "aplicado" || resultado.estado === "duplicado" || resultado.estado === "conflicto") {
                confirmados.push(evento.evento_id);
            }
            if (resultado.estado !== "aplicado" && resultado.estado !== "duplicado") {
                rechazados.push({ evento_id: evento.evento_id, entidad: evento.entidad, sync_id: evento.sync_id, ...resultado });
            }
        } catch (error) {
            rechazados.push({ evento_id: evento.evento_id, estado: "error", motivo: error.message });
        }
    }
    return { confirmados, rechazados };
}

module.exports = {
    ENTIDADES,
    secretoValido,
    normalizarPayload,
    aplicarEvento,
    procesarLote
};
