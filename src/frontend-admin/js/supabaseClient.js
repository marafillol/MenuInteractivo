let configuracionAutenticacion;
let cliente;
let configurando;

export async function obtenerConfiguracionAutenticacion() {
    if (configuracionAutenticacion) return configuracionAutenticacion;
    const respuesta = await fetch("/api/public/auth-config", {
        headers: { Accept: "application/json" }
    });
    const configuracion = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(configuracion.error || "No se pudo obtener la configuración de autenticación.");
    if (configuracion.modo !== "local" && (!configuracion.url || !configuracion.publishableKey)) {
        throw new Error("Falta configurar la URL o la clave pública de Supabase.");
    }
    configuracionAutenticacion = configuracion.modo ? configuracion : { ...configuracion, modo: "supabase" };
    return configuracionAutenticacion;
}

export async function obtenerClienteSupabase() {
    const configuracion = await obtenerConfiguracionAutenticacion();
    if (configuracion.modo === "local") throw new Error("Supabase no está activo en el servidor local.");
    if (cliente) return cliente;
    if (!configurando) {
        configurando = import("https://esm.sh/@supabase/supabase-js@2")
            .then(({ createClient }) => {
                cliente = createClient(configuracion.url, configuracion.publishableKey, {
                    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
                });
                return cliente;
            })
            .catch((error) => { configurando = null; throw error; });
    }
    return configurando;
}
