import {
    obtenerClienteSupabase,
    obtenerConfiguracionAutenticacion
} from "./supabaseClient.js";

const CLAVE_TOKEN_LOCAL = "menu_interactivo_token_local";
const esPanel = window.location.pathname.endsWith("panel.html");

window.obtenerTokenSupabase = async function () {
    const configuracion = await obtenerConfiguracionAutenticacion();

    if (configuracion.modo === "local") {
        const token = localStorage.getItem(CLAVE_TOKEN_LOCAL);
        if (!token) throw new Error("No hay una sesión local activa.");
        return token;
    }

    const cliente = await obtenerClienteSupabase();
    const { data, error } = await cliente.auth.getSession();
    if (error) throw new Error("No se pudo consultar la sesión de Supabase.");
    if (!data?.session?.access_token) throw new Error("No hay una sesión activa.");
    return data.session.access_token;
};

window.cerrarSesionSupabase = async function () {
    const configuracion = await obtenerConfiguracionAutenticacion();

    if (configuracion.modo === "local") {
        localStorage.removeItem(CLAVE_TOKEN_LOCAL);
        await fetch("/api/auth/logout", { method: "POST" });
        return;
    }

    const cliente = await obtenerClienteSupabase();
    const { error } = await cliente.auth.signOut();
    if (error) throw new Error("No se pudo cerrar la sesión.");
};

window.supabaseAuthReady = (async () => {
    if (!esPanel) return null;

    try {
        const token = await window.obtenerTokenSupabase();
        const respuesta = await fetch("/api/usuarios/me", {
            headers: { Authorization: "Bearer " + token }
        });
        const perfil = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            await window.cerrarSesionSupabase();
            window.location.replace("index.html");
            return null;
        }

        window.usuarioActual = perfil;
        return perfil;
    } catch (error) {
        console.error("No se pudo inicializar la autenticación.");
        window.location.replace("index.html");
        return null;
    }
})();
