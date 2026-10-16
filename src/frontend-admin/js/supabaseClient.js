import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let cliente;
let configurando;

export function obtenerClienteSupabase() {
    if (cliente) return Promise.resolve(cliente);
    if (configurando) return configurando;

    configurando = (async () => {
        const respuesta = await fetch("/api/public/auth-config", {
            headers: { Accept: "application/json" }
        });
        if (!respuesta.ok) {
            throw new Error("No se pudo obtener la configuración pública de Supabase.");
        }

        const configuracion = await respuesta.json();
        if (!configuracion.url || !configuracion.publishableKey) {
            throw new Error("Falta configurar la URL o la clave pública de Supabase.");
        }

        cliente = createClient(configuracion.url, configuracion.publishableKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        });
        return cliente;
    })().catch((error) => {
        configurando = null;
        throw error;
    });

    return configurando;
}
