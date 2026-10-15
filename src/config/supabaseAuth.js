require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

const estaSupabaseAuthConfigurado = Boolean(supabaseUrl && serviceRoleKey);
const clienteSupabaseAdmin = estaSupabaseAuthConfigurado
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    })
    : null;

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
    clienteSupabaseAdmin,
    obtenerClienteSupabaseAdmin,
    obtenerConfiguracionPublica
};
