const fs = require("node:fs");
const path = require("node:path");
const { randomUUID, createHash } = require("node:crypto");
const { esModoLocal, esModoSupabase } = require("../../config/modoServidor");
const { estaPreparado, columnasDe } = require("./esquema");

const MIME_POR_EXTENSION = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif"
};

function extensionSegura(archivo) {
    const extension = path.extname(String(archivo?.originalname || "")).toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(MIME_POR_EXTENSION, extension)) {
        throw new Error("La portada debe ser una imagen JPG, PNG, WEBP, GIF o AVIF.");
    }
    return extension;
}

async function leerArchivo(archivo) {
    if (Buffer.isBuffer(archivo?.buffer)) return archivo.buffer;
    if (typeof archivo?.path === "string" && archivo.path) {
        return fs.promises.readFile(path.resolve(process.cwd(), archivo.path));
    }
    throw new Error("No se pudo leer la imagen de portada recibida.");
}

async function prepararPortada(archivo, entidad) {
    if (!archivo) return null;
    if (!["menu", "ficha"].includes(entidad)) {
        throw new TypeError("La entidad de portada no es válida.");
    }
    const tablas = entidad === "menu" ? ["menu", "plantilla"] : ["ficha", "menu"];
    if (!await estaPreparado(tablas)) return null;
    const columnas = await columnasDe(entidad);
    const nombres = new Set(columnas.map((columna) => columna.name));
    const metadatosRequeridos = [
        "imagen_storage_key", "imagen_checksum_sha256",
        "imagen_mime_type", "imagen_tamano_bytes"
    ];
    if (!metadatosRequeridos.every((campo) => nombres.has(campo))) {
        throw new Error("Falta preparar el esquema de metadatos de portadas antes de subir imágenes.");
    }

    const extension = extensionSegura(archivo);
    const mimeType = MIME_POR_EXTENSION[extension];
    const buffer = await leerArchivo(archivo);
    if (!buffer.length) throw new Error("La imagen de portada está vacía.");
    const assetId = randomUUID();
    const storageKey = `multimedia/covers/${entidad}/${assetId}${extension}`;
    const checksum = createHash("sha256").update(buffer).digest("hex");

    let imagen;
    if (esModoSupabase) {
        const almacenamiento = require("../../config/almacenamientoSupabase");
        imagen = await almacenamiento.subirArchivoSincronizado(
            storageKey, buffer, mimeType, checksum
        );
    } else if (esModoLocal) {
        imagen = String(archivo.path).replace(/\\\\/g, "/");
        const raiz = path.resolve(__dirname, "../../../database/.sync-pending-covers");
        await fs.promises.mkdir(raiz, { recursive: true });
        await fs.promises.writeFile(path.join(raiz, assetId + extension), buffer, { flag: "wx" });
    } else {
        throw new Error("El modo de almacenamiento no admite portadas sincronizadas.");
    }

    return {
        imagen,
        imagen_storage_key: storageKey,
        imagen_checksum_sha256: checksum,
        imagen_mime_type: mimeType,
        imagen_tamano_bytes: buffer.length
    };
}

module.exports = { prepararPortada, extensionSegura, leerArchivo };
