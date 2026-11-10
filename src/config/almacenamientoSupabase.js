const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const { createHash } = require("node:crypto");
const { esModoSupabase } = require("./modoServidor");

const bucket = process.env.SUPABASE_BUCKET || "multimedia";
const urlProyectoConfigurada = process.env.SUPABASE_URL;
const clavePrivadaSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const estaConfigurado = Boolean(
    esModoSupabase && process.env.SUPABASE_URL && clavePrivadaSupabase
);

const supabase = estaConfigurado
    ? createClient(
        process.env.SUPABASE_URL,
        clavePrivadaSupabase,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        }
    )
    : null;

const nombreSeguro = (nombre) => nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

const subirArchivo = async (archivo, carpeta) => {
    if (!archivo) {
        return null;
    }

    if (!supabase) {
        return archivo.path.replace(/\\/g, "/");
    }

    const ruta = `${carpeta}/${Date.now()}-${nombreSeguro(archivo.originalname)}`;
    const { error } = await supabase.storage
        .from(bucket)
        .upload(ruta, archivo.buffer, {
            contentType: archivo.mimetype,
            upsert: false
        });

    if (error) {
        throw new Error(`No se pudo subir el archivo a Supabase: ${error.message}`);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(ruta);
    return data.publicUrl;
};

const validarStorageKey = (storageKey) => {
    if (typeof storageKey !== "string" || !storageKey.startsWith("multimedia/")) {
        throw new Error("La clave de almacenamiento no es válida.");
    }
    const segmentos = storageKey.split("/");
    if (segmentos.some((segmento) =>
        !segmento || segmento === "." || segmento === ".." || segmento.includes("\\")
    )) {
        throw new Error("La clave de almacenamiento no es válida.");
    }
    return storageKey;
};

const obtenerUrlPublica = (storageKey) => {
    validarStorageKey(storageKey);
    if (!supabase) throw new Error("El almacenamiento remoto no está configurado.");
    return supabase.storage.from(bucket).getPublicUrl(storageKey).data.publicUrl;
};

const subirArchivoSincronizado = async (storageKey, contenido, mimeType, checksumEsperado) => {
    validarStorageKey(storageKey);
    if (!supabase) throw new Error("El almacenamiento remoto no está configurado.");
    const buffer = Buffer.isBuffer(contenido) ? contenido : Buffer.from(contenido);
    const checksum = createHash("sha256").update(buffer).digest("hex");
    if (checksum !== checksumEsperado) {
        throw new Error("El checksum del archivo no coincide con el manifiesto de sincronización.");
    }
    const { error } = await supabase.storage.from(bucket).upload(storageKey, buffer, {
        contentType: mimeType || "application/octet-stream",
        upsert: true
    });
    if (error) throw new Error("No se pudo guardar el archivo sincronizado en Storage.");
    return obtenerUrlPublica(storageKey);
};

const descargarArchivoSincronizado = async (storageKey) => {
    validarStorageKey(storageKey);
    if (!supabase) throw new Error("El almacenamiento remoto no está configurado.");
    const { data, error } = await supabase.storage.from(bucket).download(storageKey);
    if (error || !data) throw new Error("No se pudo descargar el archivo sincronizado de Storage.");
    return Buffer.from(await data.arrayBuffer());
};

// Elimina únicamente objetos cuya URL pertenece al proyecto y al bucket
// configurados. Rutas locales o URLs externas se ignoran deliberadamente.
const eliminarArchivo = async (rutaPublica) => {
    if (!rutaPublica) {
        return false;
    }

    if (!supabase) {
        const raizProyecto = path.resolve(__dirname, "../..");
        const rutaRelativa = String(rutaPublica)
            .replace(/^\/+/, "")
            .replace(/\\/g, "/");
        const rutaAbsoluta = path.resolve(raizProyecto, rutaRelativa);
        const directorioImagenes = path.join(raizProyecto, "imagenes");

        if (!rutaAbsoluta.startsWith(directorioImagenes + path.sep) || !fs.existsSync(rutaAbsoluta)) {
            return false;
        }

        await fs.promises.unlink(rutaAbsoluta);
        return true;
    }

    let url;
    let urlProyecto;

    try {
        url = new URL(rutaPublica);
        urlProyecto = new URL(urlProyectoConfigurada);
    } catch {
        return false;
    }

    if (url.origin !== urlProyecto.origin) {
        return false;
    }

    const prefijo = `/storage/v1/object/public/${bucket}/`;
    if (!url.pathname.startsWith(prefijo)) {
        return false;
    }

    let rutaObjeto;
    try {
        rutaObjeto = decodeURIComponent(url.pathname.slice(prefijo.length));
    } catch {
        return false;
    }

    const segmentos = rutaObjeto.split("/");
    if (
        !rutaObjeto ||
        segmentos.some((segmento) =>
            !segmento || segmento === "." || segmento === ".." || segmento.includes("\\")
        )
    ) {
        return false;
    }

    const { error } = await supabase.storage.from(bucket).remove([rutaObjeto]);
    if (error) {
        // No propagar la respuesta del proveedor, que podría incluir detalles internos.
        throw new Error("No se pudo eliminar el archivo del almacenamiento.");
    }

    return true;
};

module.exports = {
    estaConfigurado,
    subirArchivo,
    subirArchivoSincronizado,
    descargarArchivoSincronizado,
    obtenerUrlPublica,
    eliminarArchivo
};
