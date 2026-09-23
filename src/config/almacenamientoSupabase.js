const { createClient } = require("@supabase/supabase-js");

const bucket = process.env.SUPABASE_BUCKET || "multimedia";
const estaConfigurado = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabase = estaConfigurado
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
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

module.exports = {
    estaConfigurado,
    subirArchivo
};
