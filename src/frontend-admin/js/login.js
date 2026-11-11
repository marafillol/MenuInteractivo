import { obtenerClienteSupabase, obtenerConfiguracionAutenticacion } from "./supabaseClient.js";

const CLAVE_TOKEN_LOCAL = "menu_interactivo_token_local";

function mostrarMensajeLogin(titulo, texto) {
    const tituloEl = document.getElementById("tituloLoginMensaje");
    const textoEl = document.getElementById("textoLoginMensaje");
    const modal = document.getElementById("modalLoginMensaje");
    if (tituloEl) tituloEl.textContent = titulo;
    if (textoEl) textoEl.textContent = texto;
    if (modal) modal.style.display = "flex";
}

document.getElementById("btnAceptarLogin")?.addEventListener("click", () => {
    const modal = document.getElementById("modalLoginMensaje");
    if (modal) modal.style.display = "none";
});

document.getElementById("formLogin")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const email = document.getElementById("usuario").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const boton = evento.currentTarget.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;

    try {
        const configuracion = await obtenerConfiguracionAutenticacion();
        let token;
        let cliente;
        if (configuracion.modo === "local") {
            const login = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const datos = await login.json().catch(() => ({}));
            if (!login.ok || !datos.token) throw new Error(datos.error || "No se pudo iniciar sesión localmente.");
            token = datos.token;
            localStorage.setItem(CLAVE_TOKEN_LOCAL, token);
        } else {
            cliente = await obtenerClienteSupabase();
            const { data, error } = await cliente.auth.signInWithPassword({ email, password });
            if (error || !data?.session?.access_token) {
            mostrarMensajeLogin(
                "No se pudo iniciar sesión",
                "El correo o la contraseña son incorrectos, o la cuenta necesita restablecer su contraseña."
            );
            return;
            }
            token = data.session.access_token;
        }

        const respuesta = await fetch("/api/usuarios/me", {
            headers: { Authorization: "Bearer " + token }
        });
        const perfil = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            if (configuracion.modo === "local") localStorage.removeItem(CLAVE_TOKEN_LOCAL);
            else await cliente.auth.signOut();
            mostrarMensajeLogin(
                "Acceso denegado",
                perfil.error || "La cuenta no está habilitada para el sistema."
            );
            return;
        }

        window.location.href = "panel.html";
    } catch (error) {
        console.error("No se pudo completar el inicio de sesión.");
        mostrarMensajeLogin(
            "Error de acceso",
            error.message || "No se pudo conectar con la autenticación."
        );
    } finally {
        if (boton) boton.disabled = false;
    }
});
