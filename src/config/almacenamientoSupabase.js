const { createClient } = require("@supabase/supabase-js");

const bucket = process.env.SUPABASE_BUCKET || "multimedia";
const urlProyectoConfigurada = process.env.SUPABASE_URL;
const clavePrivadaSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const estaConfigurado = Boolean(
    process.env.SUPABASE_URL && clavePrivadaSupabase
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

// Elimina únicamente objetos cuya URL pertenece al proyecto y al bucket
// configurados. Rutas locales o URLs externas se ignoran deliberadamente.
const eliminarArchivo = async (rutaPublica) => {
    if (!rutaPublica || !supabase) {
        return false;
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
    eliminarArchivo
};
