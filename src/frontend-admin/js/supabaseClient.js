let configuracionAutenticacion;
let clienteSupabase;
let importacionSupabase;

export async function obtenerConfiguracionAutenticacion() {
    if (configuracionAutenticacion) {
        return configuracionAutenticacion;
    }

    const respuesta = await fetch("/api/auth/config", {
        headers: { Accept: "application/json" }
    });
    const configuracion = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok || !configuracion.modo) {
        throw new Error(configuracion.error || "No se pudo obtener la configuración de autenticación.");
    }

    configuracionAutenticacion = configuracion;
    return configuracionAutenticacion;
}

export async function obtenerClienteSupabase() {
    const configuracion = await obtenerConfiguracionAutenticacion();

    if (configuracion.modo !== "supabase") {
        throw new Error("Supabase no está activo en el servidor local.");
    }

    if (clienteSupabase) {
        return clienteSupabase;
    }

    if (!importacionSupabase) {
        importacionSupabase = import("https://esm.sh/@supabase/supabase-js@2");
    }

    const { createClient } = await importacionSupabase;
    clienteSupabase = createClient(configuracion.url, configuracion.publishableKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });

    return clienteSupabase;
}
