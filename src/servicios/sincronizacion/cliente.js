const db = require("../../database");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { esModoLocal } = require("../../config/modoServidor");
const { obtenerIdDispositivo } = require("./dispositivo");
const { ENTIDADES, procesarLote } = require("./protocolo");
const { estaPreparado } = require("./esquema");

const CLAVE_CURSOR = "sync.cursor.supabase";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIMITE_LOTE = 100;
let temporizador = null;
let enCurso = false;

function all(sql, valores = []) {
    return new Promise((resolve, reject) => db.all(sql, valores, (error, filas) =>
        error ? reject(error) : resolve(filas || [])
    ));
}

function parsearPayload(evento) {
    if (typeof evento.payload_json !== "string") return evento;
    try {
        return { ...evento, payload_json: JSON.parse(evento.payload_json) };
    } catch {
        return evento;
    }
}

function obtenerUrlIntercambio() {
    const base = String(process.env.SYNC_REMOTE_URL || "").trim();
    if (!base) return null;
    if (/\/api\/sync\/v1\/exchange\/?$/i.test(base)) return base.replace(/\/$/, "");
    return base.replace(/\/$/, "") + "/api/sync/v1/exchange";
}

async function leerCursor() {
    const filas = await all("SELECT valor FROM configuracion WHERE clave = ?", [CLAVE_CURSOR]);
    const cursor = Number(filas[0]?.valor || 0);
    if (!Number.isSafeInteger(cursor) || cursor < 0) {
        throw new Error("El cursor local de sincronización no es válido.");
    }
    return cursor;
}

function obtenerPayload(evento) {
    if (evento.payload_json && typeof evento.payload_json === "object") return evento.payload_json;
    try { return JSON.parse(evento.payload_json || "{}"); } catch { return {}; }
}

function obtenerRutaStaging(evento) {
    if (!UUID_RE.test(String(evento.sync_id || "")) ||
        !Number.isSafeInteger(Number(evento.version_resultado)) || Number(evento.version_resultado) < 1) {
        throw new Error("La identidad o versión del archivo pendiente no es válida.");
    }
    const payload = obtenerPayload(evento);
    const extension = path.extname(String(payload.storage_key || ""));
    if (!/^\.[a-z0-9]{1,10}$/i.test(extension)) throw new Error("La extensión del archivo pendiente no es válida.");
    const raiz = path.resolve(__dirname, "../../../database/.sync-pending");
    const ruta = path.resolve(raiz, evento.sync_id, `v${evento.version_resultado}${extension}`);
    if (!ruta.startsWith(raiz + path.sep)) throw new Error("La ruta de staging multimedia no es válida.");
    return ruta;
}

async function obtenerBytesPendientes(evento, ruta, payload) {
    try {
        return await fs.promises.readFile(ruta);
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }

    // Compatibilidad con eventos creados antes del staging por versión:
    // se recupera el archivo actual solo si su checksum coincide exactamente.
    const filas = await all("SELECT ruta_archivo FROM multimedia WHERE sync_id = ?", [evento.sync_id]);
    const rutaLocal = String(filas[0]?.ruta_archivo || "");
    const raizProyecto = path.resolve(__dirname, "../../../");
    const raizMultimedia = path.join(raizProyecto, "imagenes", "multimedia");
    const absoluta = path.resolve(raizProyecto, rutaLocal);
    const relativa = path.relative(raizMultimedia, absoluta);
    if (!rutaLocal || path.isAbsolute(rutaLocal) || relativa === "" ||
        relativa === ".." || relativa.startsWith(".." + path.sep) || path.isAbsolute(relativa)) {
        throw new Error("No existe una copia local verificable del archivo multimedia pendiente.");
    }
    const contenido = await fs.promises.readFile(absoluta);
    const checksum = createHash("sha256").update(contenido).digest("hex");
    if (checksum !== payload.checksum_sha256) {
        throw new Error("El archivo local cambió y ya no coincide con el evento multimedia pendiente.");
    }
    await fs.promises.mkdir(path.dirname(ruta), { recursive: true });
    await fs.promises.writeFile(ruta, contenido);
    return contenido;
}

async function subirMultimediaPendiente(evento, url, secreto) {
    if (evento.entidad !== "multimedia" || evento.operacion === "DELETE") return;
    const payload = obtenerPayload(evento);
    const ruta = obtenerRutaStaging(evento);
    const contenido = await obtenerBytesPendientes(evento, ruta, payload);
    const checksum = createHash("sha256").update(contenido).digest("hex");
    if (checksum !== payload.checksum_sha256) {
        throw new Error("El archivo multimedia pendiente no coincide con su checksum.");
    }
    const formulario = new FormData();
    formulario.append("storage_key", payload.storage_key);
    formulario.append("checksum_sha256", payload.checksum_sha256);
    formulario.append("mime_type", payload.mime_type || "application/octet-stream");
    formulario.append("file", new Blob([contenido], {
        type: payload.mime_type || "application/octet-stream"
    }), path.basename(ruta));

    const endpoint = url.replace(/\/exchange\/?$/i, "/media/upload");
    const respuesta = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${secreto}` },
        body: formulario,
        signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(60000) : undefined
    });
    if (!respuesta.ok) throw new Error(`No se pudo transferir multimedia (HTTP ${respuesta.status}).`);
}

async function prepararMultimediaEntrante(evento, url, secreto) {
    if (evento.entidad !== "multimedia" || evento.operacion === "DELETE") return parsearPayload(evento);
    if (!UUID_RE.test(String(evento.sync_id || "")) ||
        !Number.isSafeInteger(Number(evento.version_resultado)) || Number(evento.version_resultado) < 1) {
        throw new Error("La identidad o versión del archivo remoto no es válida.");
    }
    const payload = obtenerPayload(evento);
    const endpoint = url.replace(/\/exchange\/?$/i, "/media/download") +
        "?key=" + encodeURIComponent(payload.storage_key || "");
    const respuesta = await fetch(endpoint, {
        headers: { authorization: `Bearer ${secreto}` },
        signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(60000) : undefined
    });
    if (!respuesta.ok) throw new Error(`No se pudo descargar multimedia (HTTP ${respuesta.status}).`);
    const contenido = Buffer.from(await respuesta.arrayBuffer());
    const checksum = createHash("sha256").update(contenido).digest("hex");
    if (checksum !== payload.checksum_sha256) {
        throw new Error("El checksum de multimedia recibida no coincide.");
    }

    const tipo = String(payload.tipo_multi || "archivo").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "archivo";
    const extension = path.extname(String(payload.storage_key || ""));
    if (!/^\.[a-z0-9]{1,10}$/i.test(extension)) throw new Error("La extensión multimedia recibida no es válida.");
    const raizProyecto = path.resolve(__dirname, "../../../");
    const carpeta = path.join(raizProyecto, "imagenes", "multimedia", tipo);
    await fs.promises.mkdir(carpeta, { recursive: true });
    const nombre = `${evento.sync_id}-v${evento.version_resultado}${extension}`;
    const destino = path.join(carpeta, nombre);
    const temporal = destino + ".sync-tmp";
    await fs.promises.writeFile(temporal, contenido);
    await fs.promises.rename(temporal, destino);
    return {
        ...evento,
        payload_json: {
            ...payload,
            ruta_archivo: path.relative(raizProyecto, destino).split(path.sep).join("/")
        }
    };
}

async function limpiarStagingConfirmado(eventos, idsConfirmados) {
    const confirmados = new Set(idsConfirmados);
    for (const evento of eventos) {
        if (!confirmados.has(evento.evento_id) ||
            evento.entidad !== "multimedia" || evento.operacion === "DELETE") continue;
        const ruta = obtenerRutaStaging(evento);
        try {
            await fs.promises.unlink(ruta);
            await fs.promises.rmdir(path.dirname(ruta));
        } catch (error) {
            if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) throw error;
        }
    }
}

async function guardarConfirmaciones(ids) {
    if (!ids.length) return;
    await db.withTransaction(async (consultar) => {
        const placeholders = ids.map(() => "?").join(", ");
        await consultar(
            `UPDATE sync_eventos SET aplicado = 1 WHERE evento_id IN (${placeholders})`,
            ids
        );
    });
}

async function aplicarEventosEntrantes(eventos, cursor) {
    await db.withTransaction(async (consultar) => {
        const resultado = await procesarLote(
            consultar,
            eventos.map(parsearPayload),
            { registrarRecepcion: true }
        );
        const errores = resultado.rechazados.filter((item) => item.estado === "error" || item.estado === "no_soportado");
        if (errores.length) {
            throw new Error("Hay eventos remotos pendientes de reconciliar; se conserva el cursor para reintentar.");
        }
        await consultar(
            `INSERT INTO configuracion (clave, valor, actualizado)
             VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor, actualizado = CURRENT_TIMESTAMP`,
            [CLAVE_CURSOR, String(cursor)]
        );
    });
}

async function sincronizarUnaVez() {
    if (!esModoLocal) throw new Error("El cliente de sincronización solo se ejecuta desde SQLite local.");
    const url = obtenerUrlIntercambio();
    const secreto = process.env.SYNC_SHARED_SECRET;
    if (!url || !secreto || secreto.length < 32) {
        return { estado: "sin_configurar" };
    }
    if (typeof fetch !== "function") throw new Error("Este entorno de Node.js no incluye fetch.");

    if (!await estaPreparado(Object.keys(ENTIDADES))) {
        return { estado: "esquema_pendiente" };
    }

    const deviceId = await obtenerIdDispositivo();
    const cursor = await leerCursor();
    const pendientes = await all(
        `SELECT evento_id, origen_device_id, entidad, operacion, sync_id,
                version_base, version_resultado, payload_json, creado
         FROM sync_eventos
         WHERE aplicado = 0 AND entidad IN (${Object.keys(ENTIDADES).map(() => "?").join(", ")})
         ORDER BY id_evento ASC LIMIT ${LIMITE_LOTE}`,
        Object.keys(ENTIDADES)
    );

    for (const evento of pendientes) {
        await subirMultimediaPendiente(parsearPayload(evento), url, secreto);
    }

    const respuesta = await fetch(url, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${secreto}`
        },
        body: JSON.stringify({
            device_id: deviceId,
            cursor,
            events: pendientes.map(parsearPayload)
        }),
        signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(20000) : undefined
    });
    if (!respuesta.ok) {
        throw new Error(`El servidor de sincronización respondió HTTP ${respuesta.status}.`);
    }
    const datos = await respuesta.json();
    if (!Array.isArray(datos.acknowledged) || !Array.isArray(datos.events) ||
        !Number.isSafeInteger(Number(datos.next_cursor))) {
        throw new Error("La respuesta del servidor de sincronización está incompleta.");
    }

    await guardarConfirmaciones(datos.acknowledged);
    await limpiarStagingConfirmado(pendientes, datos.acknowledged);
    const eventosEntrantes = [];
    for (const evento of datos.events) {
        eventosEntrantes.push(await prepararMultimediaEntrante(evento, url, secreto));
    }
    await aplicarEventosEntrantes(eventosEntrantes, Number(datos.next_cursor));

    return {
        estado: "sincronizado",
        enviados: datos.acknowledged.length,
        recibidos: datos.events.length,
        conflictos: (datos.rejected || []).filter((item) => item.estado === "conflicto").length,
        cursor: Number(datos.next_cursor)
    };
}

async function ejecutarCiclo() {
    if (enCurso || !esModoLocal || !obtenerUrlIntercambio() || !process.env.SYNC_SHARED_SECRET) return;
    enCurso = true;
    try {
        const resultado = await sincronizarUnaVez();
        if (resultado.estado === "sincronizado" &&
            (resultado.enviados || resultado.recibidos || resultado.conflictos)) {
            console.log("[sync] Intercambio completado:", resultado);
        }
    } catch (error) {
        console.warn("[sync] Se reintentará cuando el servidor vuelva a estar disponible:", error.message);
    } finally {
        enCurso = false;
    }
}

function iniciarSincronizacionAutomatica(intervaloMs = 30000) {
    if (!esModoLocal || temporizador || !obtenerUrlIntercambio() || !process.env.SYNC_SHARED_SECRET) {
        return false;
    }
    ejecutarCiclo();
    temporizador = setInterval(ejecutarCiclo, intervaloMs);
    temporizador.unref?.();
    return true;
}

function detenerSincronizacionAutomatica() {
    if (temporizador) clearInterval(temporizador);
    temporizador = null;
}

module.exports = {
    sincronizarUnaVez,
    iniciarSincronizacionAutomatica,
    detenerSincronizacionAutomatica
};
