require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

const estaSupabaseAuthConfigurado = Boolean(supabaseUrl && serviceRoleKey);
const estaSupabaseVerificacionConfigurada = Boolean(supabaseUrl && publishableKey);

const clienteSupabaseVerificacion = estaSupabaseVerificacionConfigurada
    ? createClient(supabaseUrl, publishableKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    })
    : null;

const clienteSupabaseAdmin = estaSupabaseAuthConfigurado
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    })
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
    clienteSupabaseAdmin,
    obtenerClienteSupabaseAdmin,
    obtenerConfiguracionPublica
};
