import { obtenerClienteSupabase } from "./supabaseClient.js";

const esPanel = window.location.pathname.endsWith("panel.html");

window.obtenerTokenSupabase = async function () {
    const cliente = await obtenerClienteSupabase();
    const { data, error } = await cliente.auth.getSession();
    if (error) throw new Error("No se pudo consultar la sesión de Supabase.");
    const token = data?.session?.access_token;
    if (!token) throw new Error("No hay una sesión activa.");
    return token;
};

window.cerrarSesionSupabase = async function () {
    const cliente = await obtenerClienteSupabase();
    const { error } = await cliente.auth.signOut();
    if (error) throw new Error("No se pudo cerrar la sesión.");
};

window.supabaseAuthReady = (async () => {
    if (!esPanel) return null;

    try {
        const cliente = await obtenerClienteSupabase();
        const { data, error } = await cliente.auth.getSession();
        if (error) throw new Error("No se pudo comprobar la sesión.");

        if (!data?.session?.access_token) {
            window.location.replace("index.html");
            return null;
        }

        const respuesta = await fetch("/api/usuarios/me", {
            headers: { Authorization: "Bearer " + data.session.access_token }
        });
        const perfil = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            await cliente.auth.signOut();
            window.location.replace("index.html");
            return null;
        }

        window.usuarioActual = perfil;
        return perfil;
    } catch (error) {
        console.error("No se pudo inicializar la autenticación de Supabase.");
        window.location.replace("index.html");
        return null;
    }
})();
