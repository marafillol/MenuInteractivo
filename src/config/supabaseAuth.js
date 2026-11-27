
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

const estaSupabaseAuthConfigurado = Boolean(supabaseUrl && serviceRoleKey);
const estaSupabaseVerificacionConfigurada = Boolean(supabaseUrl && publishableKey);

const opcionesAuth = {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
};

// Cliente independiente para verificar sesiones existentes.
const clienteSupabaseVerificacion = estaSupabaseVerificacionConfigurada
    ? createClient(supabaseUrl, publishableKey, opcionesAuth)
    : null;

// Cliente administrativo. No se utiliza para iniciar sesión de usuarios.
const clienteSupabaseAdmin = estaSupabaseAuthConfigurado
    ? createClient(supabaseUrl, serviceRoleKey, opcionesAuth)
    : null;

const obtenerClienteSupabaseVerificacion = () => {
    if (!clienteSupabaseVerificacion) {
        const error = new Error(
            "Falta configurar la clave pública de Supabase para verificar sesiones."
        );
        error.status = 503;
        throw error;
    }

    return clienteSupabaseVerificacion;
};

// Autenticación remota aislada: un cliente nuevo por cada intento.
const autenticarCredencialesSupabase = async (email, password) => {
    if (!estaSupabaseVerificacionConfigurada) {
        const error = new Error(
            "La autenticación remota no está configurada."
        );
        error.status = 503;
        throw error;
    }

    const cliente = createClient(
        supabaseUrl,
        publishableKey,
        opcionesAuth
    );

    const { data, error } = await cliente.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        const fallo = new Error(
            "No se pudieron verificar las credenciales con Supabase."
        );

        fallo.status = Number(error.status) >= 500 ? 503 : 401;
        throw fallo;
    }

    if (!data?.user || !data?.session) {
        const fallo = new Error("Supabase no devolvió una sesión válida.");
        fallo.status = 401;
        throw fallo;
    }

    return data.user;
};

const obtenerClienteSupabaseAdmin = () => {
    if (!clienteSupabaseAdmin) {
        const error = new Error(
            "La autenticación de Supabase no está configurada en el servidor."
        );
        error.status = 503;
        throw error;
    }

    return clienteSupabaseAdmin;
};

const obtenerConfiguracionPublica = () => {
    if (!supabaseUrl || !publishableKey) {
        return null;
    }

    return {
        url: supabaseUrl,
        publishableKey
    };
};

module.exports = {
    estaSupabaseAuthConfigurado,
    estaSupabaseVerificacionConfigurada,
    clienteSupabaseVerificacion,
    obtenerClienteSupabaseVerificacion,
    autenticarCredencialesSupabase,
    clienteSupabaseAdmin,
    obtenerClienteSupabaseAdmin,
    obtenerConfiguracionPublica
};
