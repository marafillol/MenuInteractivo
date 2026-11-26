const express = require("express");
const Usuario = require("../modelos/usuario");
const { esModoLocal, modoServidor } = require("../config/modoServidor");
const { verificarPassword, crearToken } = require("../servicios/autenticacionLocal");

const router = express.Router();

router.get("/config", (req, res) => {
    if (esModoLocal) {
        return res.json({ modo: "local" });
    }

    const { obtenerConfiguracionPublica } = require("../config/supabaseAuth");
    const configuracion = obtenerConfiguracionPublica();
    if (!configuracion) {
        return res.status(503).json({ error: "Falta configurar la autenticación de Supabase." });
    }

    return res.json({ modo: "supabase", ...configuracion });
});

router.post("/login", async (req, res) => {
    if (!esModoLocal) {
        return res.status(404).json({ error: "El inicio de sesión local no está activo." });
    }

    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        const password = req.body?.password;

        if (!email || typeof password !== "string") {
            return res.status(400).json({ error: "Ingresá correo y contraseña." });
        }

        const usuario = await Usuario.obtenerPorEmail(email);
        const passwordCorrecta = usuario && await verificarPassword(password, usuario.password_hash);

        if (!usuario || !passwordCorrecta) {
            return res.status(401).json({ error: "El correo o la contraseña son incorrectos." });
        }

        if (Number(usuario.activo) !== 1) {
            return res.status(403).json({ error: "Usuario desactivado. Contactá al administrador del sistema." });
        }

        const { password_hash, supabase_uid, ...perfil } = usuario;
        return res.json({ token: crearToken(usuario), usuario: perfil });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error("No se pudo iniciar la sesión local; código=", error.code || "sin_codigo");
        return res.status(500).json({ error: "No se pudo iniciar sesión local." });
    }
});

router.post("/logout", (req, res) => res.status(204).end());

router.get("/modo", (req, res) => res.json({ modo: modoServidor }));

module.exports = router;
