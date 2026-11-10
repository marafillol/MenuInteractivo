const express = require("express");
const multer = require("multer");
const { createHash } = require("node:crypto");
const { esModoSupabase } = require("../config/modoServidor");
const db = require("../database");
const { secretoValido, ENTIDADES, procesarLote } = require("../servicios/sincronizacion/protocolo");
const { obtenerIdDispositivo } = require("../servicios/sincronizacion/dispositivo");
const { estaPreparado } = require("../servicios/sincronizacion/esquema");

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_EVENTOS = 100;
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

function credencialValida(req) {
    const secreto = process.env.SYNC_SHARED_SECRET;
    const authorization = req.headers.authorization || "";
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    return Boolean(secreto && secreto.length >= 32 && secretoValido(token, secreto));
}

function storageKeyValida(storageKey) {
    if (typeof storageKey !== "string" || !storageKey.startsWith("multimedia/")) return false;
    const segmentos = storageKey.split("/");
    return segmentos.length >= 3 && segmentos.every((segmento) =>
        /^[a-zA-Z0-9._-]+$/.test(segmento) && segmento !== "." && segmento !== ".."
    );
}

router.post("/media/upload", upload.single("file"), async (req, res) => {
    if (!esModoSupabase) return res.status(404).json({ error: "El almacenamiento remoto no está activo." });
    if (!credencialValida(req)) return res.status(401).json({ error: "Credencial de sincronización inválida." });

    const { storage_key, checksum_sha256, mime_type } = req.body || {};
    if (!req.file || !storageKeyValida(storage_key) ||
        !/^[a-f0-9]{64}$/i.test(String(checksum_sha256 || ""))) {
        return res.status(400).json({ error: "Archivo o manifiesto multimedia inválido." });
    }

    try {
        const almacenamiento = require("../config/almacenamientoSupabase");
        const publicUrl = await almacenamiento.subirArchivoSincronizado(
            storage_key, req.file.buffer, mime_type || req.file.mimetype, checksum_sha256
        );
        return res.json({ storage_key, public_url: publicUrl, checksum_sha256 });
    } catch (error) {
        return res.status(422).json({ error: error.message });
    }
});

router.get("/media/download", async (req, res) => {
    if (!esModoSupabase) return res.status(404).json({ error: "El almacenamiento remoto no está activo." });
    if (!credencialValida(req)) return res.status(401).json({ error: "Credencial de sincronización inválida." });
    const storageKey = String(req.query?.key || "");
    if (!storageKeyValida(storageKey)) {
        return res.status(400).json({ error: "La clave multimedia no es válida." });
    }
    try {
        const almacenamiento = require("../config/almacenamientoSupabase");
        const archivo = await almacenamiento.descargarArchivoSincronizado(storageKey);
        res.set("content-type", "application/octet-stream");
        return res.send(archivo);
    } catch {
        return res.status(404).json({ error: "No se encontró el archivo multimedia remoto." });
    }
});

router.post("/exchange", async (req, res) => {
    if (!esModoSupabase) {
        return res.status(404).json({ error: "El receptor de sincronización no está activo en este nodo." });
    }

    if (!credencialValida(req)) {
        return res.status(401).json({ error: "Credencial de sincronización inválida." });
    }

    if (!await estaPreparado(Object.keys(ENTIDADES))) {
        return res.status(503).json({ error: "El esquema de sincronización todavía no está preparado en el servidor." });
    }

    const deviceId = req.body?.device_id;
    const cursor = Number(req.body?.cursor ?? 0);
    const eventos = req.body?.events;
    if (!UUID_RE.test(String(deviceId || "")) ||
        !Number.isSafeInteger(cursor) || cursor < 0 ||
        !Array.isArray(eventos) || eventos.length > MAX_EVENTOS) {
        return res.status(400).json({ error: "Solicitud de sincronización inválida." });
    }
    if (eventos.some((evento) =>
        evento?.origen_device_id !== deviceId ||
        !ENTIDADES[evento?.entidad] ||
        !UUID_RE.test(String(evento?.evento_id || "")) ||
        !UUID_RE.test(String(evento?.sync_id || "")) ||
        !Number.isSafeInteger(Number(evento?.version_resultado)) ||
        Number(evento.version_resultado) < 1 ||
        !Number.isSafeInteger(Number(evento?.version_base ?? 0)) ||
        Number(evento.version_base ?? 0) < 0
    )) {
        return res.status(400).json({ error: "El lote contiene eventos no válidos o de otro dispositivo." });
    }

    try {
        const dispositivo = await obtenerIdDispositivo();
        const almacenamiento = require("../config/almacenamientoSupabase");
        const eventosPreparados = await Promise.all(eventos.map(async (evento) => {
            if (evento.entidad !== "multimedia" || evento.operacion === "DELETE") return evento;
            const payload = evento.payload_json && typeof evento.payload_json === "object"
                ? evento.payload_json
                : JSON.parse(evento.payload_json || "{}");
            const archivo = await almacenamiento.descargarArchivoSincronizado(payload.storage_key);
            const checksum = createHash("sha256").update(archivo).digest("hex");
            if (checksum !== payload.checksum_sha256) {
                throw new Error("El checksum multimedia remoto no coincide.");
            }
            return {
                ...evento,
                payload_json: {
                    ...payload,
                    ruta_archivo: almacenamiento.obtenerUrlPublica(payload.storage_key)
                }
            };
        }));
        const resultado = await db.withTransaction(async (consultar) => {
            const lote = await procesarLote(consultar, eventosPreparados, { registrarRecepcion: true });
            const entidades = Object.keys(ENTIDADES);
            const placeholders = entidades.map((_, indice) => `$${indice + 2}`).join(", ");
            const pagina = await consultar(
                `SELECT id_evento, evento_id, origen_device_id, entidad, operacion,
                        sync_id, version_base, version_resultado, payload_json, creado
                 FROM sync_eventos
                 WHERE id_evento > $1 AND origen_device_id <> $${entidades.length + 2}
                   AND entidad IN (${placeholders})
                 ORDER BY id_evento ASC LIMIT 200`,
                [cursor, ...entidades, deviceId]
            );
            const nextCursor = pagina.rows.length
                ? Number(pagina.rows[pagina.rows.length - 1].id_evento)
                : cursor;
            await consultar(
                "UPDATE sync_dispositivos SET cursor_ultimo = GREATEST(cursor_ultimo, ?), ultimo_contacto = CURRENT_TIMESTAMP WHERE device_id = ?",
                [nextCursor, deviceId]
            );
            return {
                device_id: dispositivo,
                acknowledged: lote.confirmados,
                rejected: lote.rechazados,
                events: pagina.rows,
                next_cursor: nextCursor
            };
        });

        return res.json(resultado);
    } catch (error) {
        console.error("[sync] Falló el intercambio; código=", error.code || "sin_codigo");
        return res.status(503).json({ error: "No se pudo completar el intercambio de sincronización." });
    }
});

module.exports = router;
