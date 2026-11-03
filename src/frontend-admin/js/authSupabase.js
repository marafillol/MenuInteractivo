
import { obtenerClienteSupabase } from "./supabaseClient.js";

const esPanel = window.location.pathname.endsWith("panel.html");

window.supabaseAuthReady = (async () => {
    if (!esPanel) return null;

    try {
        const cliente = await obtenerClienteSupabase();

        // Esperar a que Supabase restaure la sesión guardada.
        const { data, error } = await cliente.auth.getSession();

        if (error) {
            throw error;
        }

        if (!data?.session?.access_token) {
            window.authRedirigiendoLogin = true;
            window.location.replace("index.html");
            return null;
        }

        const respuesta = await fetch("/api/usuarios/me", {
            headers: {
                Authorization: `Bearer ${data.session.access_token}`
            }
        });

        const perfil = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            window.errorInicializacionAuth = {
                status: respuesta.status,
                mensaje: perfil?.error || "No se pudo verificar la sesion."
            };

            if (respuesta.status === 401) {
                await cliente.auth.signOut();
                window.authRedirigiendoLogin = true;
                window.location.replace("index.html");
                return null;
            }

            return {
                __errorInicializacionAuth: true,
                status: respuesta.status
            };
        }

        window.usuarioActual = perfil;
        return perfil;

    } catch (error) {
        console.error(
            "[authSupabase] Error al inicializar la sesión:",
            error
        );

        window.errorInicializacionAuth = {
            status: null,
            mensaje: "No se pudo conectar con el servidor para verificar la sesion."
        };

        return {
            __errorInicializacionAuth: true,
            status: null
        };
    }
})();

window.obtenerTokenSupabase = async function () {
    // No consultar la sesión antes de completar la inicialización.
    if (esPanel && window.supabaseAuthReady) {
        const perfil = await window.supabaseAuthReady;

        if (!perfil || perfil.__errorInicializacionAuth) {
            const mensaje = window.errorInicializacionAuth?.mensaje || "No se pudo verificar la sesion. Intenta nuevamente.";

            throw new Error(mensaje);
        }
    }

    const cliente = await obtenerClienteSupabase();
    const { data, error } = await cliente.auth.getSession();

    if (error) {
        throw new Error("No se pudo consultar la sesión de Supabase.");
    }

    const token = data?.session?.access_token;

    if (!token) {
        throw new Error("No hay una sesión activa. Iniciá sesión nuevamente.");
    }

    return token;
};

window.cerrarSesionSupabase = async function () {
    const cliente = await obtenerClienteSupabase();
    const { error } = await cliente.auth.signOut();

    if (error) {
        throw new Error("No se pudo cerrar la sesión.");
    }
};