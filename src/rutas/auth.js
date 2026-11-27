
const express = require("express");
const Usuario = require("../modelos/usuario");
const { esModoLocal, modoServidor } = require("../config/modoServidor");
const {
    verificarPassword,
    crearToken
} = require("../servicios/autenticacionLocal");
const {
    autenticarCredencialesSupabase,
    obtenerConfiguracionPublica
} = require("../config/supabaseAuth");

const router = express.Router();

// Cuenta autorizada para ingresar cuando no hay Internet.
const EMAIL_USUARIO_LOCAL = "museo@gmail.com";

router.get("/config", (req, res) => {
    if (esModoLocal) {
        return res.json({ modo: "local" });
    }

    const configuracion = obtenerConfiguracionPublica();

    if (!configuracion) {
        return res.status(503).json({
            error: "Falta configurar la autenticación de Supabase."
        });
    }

    return res.json({ modo: "supabase", ...configuracion });
});

router.post("/login", async (req, res) => {
    if (!esModoLocal) {
        return res.status(404).json({
            error: "El inicio de sesión local no está activo."
        });
    }

    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        const password = req.body?.password;

        if (!email || typeof password !== "string" || !password) {
            return res.status(400).json({
                error: "Ingresá correo y contraseña."
            });
        }

        // 1. Cuenta local: se autentica exclusivamente con SQLite.
        if (email === EMAIL_USUARIO_LOCAL) {
            const usuario = await Usuario.obtenerPorEmail(email);

            if (!usuario || !await verificarPassword(password, usuario.password_hash)) {
                return res.status(401).json({
                    error: "El correo o la contraseña son incorrectos."
                });
            }

            if (Number(usuario.activo) !== 1) {
                return res.status(403).json({
                    error: "Usuario desactivado. Contactá al administrador del sistema."
                });
            }

            const { password_hash, supabase_uid, ...perfil } = usuario;

            return res.json({
                token: crearToken(usuario),
                usuario: perfil
            });
        }

        // 2. Usuarios remotos: Supabase verifica las credenciales.
        const identidad = await autenticarCredencialesSupabase(email, password);

        // 3. El perfil y los permisos se obtienen exclusivamente de SQLite.
        const usuario = await Usuario.obtenerPorSupabaseUID(identidad.id);

        if (!usuario) {
            return res.status(403).json({
                error: "La cuenta todavía no está vinculada a un usuario habilitado del sistema."
            });
        }

        if (Number(usuario.activo) !== 1) {
            return res.status(403).json({
                error: "Usuario desactivado. Contactá al administrador del sistema."
            });
        }

        // 4. Desde este momento la sesión se verifica localmente.
        const { password_hash, supabase_uid, ...perfil } = usuario;

        return res.json({
            token: crearToken(usuario),
            usuario: perfil
        });

    } catch (error) {
        if (error.status === 401) {
            return res.status(401).json({
                error: "El correo o la contraseña son incorrectos."
            });
        }

        if (error.status === 503) {
            return res.status(503).json({
                error: "No se pudo conectar con la autenticación remota. Verificá tu conexión a Internet."
            });
        }

        console.error(
            "No se pudo iniciar sesión; código=",
            error.code || "sin_codigo"
        );

        return res.status(500).json({
            error: "No se pudo iniciar sesión."
        });
    }
});

router.post("/logout", (req, res) => res.status(204).end());

router.get("/modo", (req, res) => res.json({ modo: modoServidor }));

module.exports = router;
