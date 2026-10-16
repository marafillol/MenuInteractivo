import { obtenerClienteSupabase } from "./supabaseClient.js";

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
        const cliente = await obtenerClienteSupabase();
        const { data, error } = await cliente.auth.signInWithPassword({ email, password });

        if (error || !data?.session?.access_token) {
            mostrarMensajeLogin(
                "No se pudo iniciar sesión",
                "El correo o la contraseña son incorrectos, o la cuenta necesita restablecer su contraseña."
            );
            return;
        }

        const respuesta = await fetch("/api/usuarios/me", {
            headers: { Authorization: "Bearer " + data.session.access_token }
        });
        const perfil = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            await cliente.auth.signOut();
            mostrarMensajeLogin(
                "Acceso denegado",
                perfil.error || "La cuenta no está habilitada para el sistema."
            );
            return;
        }

        window.location.href = "panel.html";
    } catch (error) {
        console.error("No se pudo completar el inicio de sesión con Supabase.");
        mostrarMensajeLogin(
            "Error de acceso",
            "No se pudo conectar con la autenticación. Revisá la configuración de Supabase."
        );
    } finally {
        if (boton) boton.disabled = false;
    }
});
