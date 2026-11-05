const Usuario = require("../modelos/usuario");
const { verificarToken } = require("../servicios/autenticacionLocal");

const autenticarLocal = async (req, res, next) => {
    const authorization = req.headers.authorization || "";
    const coincidencia = authorization.match(/^Bearer\s+(.+)$/i);

    if (!coincidencia) {
        return res.status(401).json({ error: "No se envió un token de sesión válido." });
    }

    try {
        const sesion = verificarToken(coincidencia[1]);
        if (!sesion) {
            return res.status(401).json({ error: "La sesión es inválida o venció. Iniciá sesión nuevamente." });
        }

        const usuario = await Usuario.obtenerPorId(sesion.sub);
        if (!usuario || usuario.email.toLowerCase() !== sesion.email.toLowerCase()) {
            return res.status(401).json({ error: "La sesión ya no corresponde a un usuario del sistema." });
        }

        if (Number(usuario.activo) !== 1) {
            return res.status(403).json({ error: "Usuario desactivado. Contactá al administrador del sistema." });
        }

        req.usuario = usuario;
        return next();
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error("No se pudo verificar la sesión local; código=", error.code || "sin_codigo");
        return res.status(503).json({ error: "No se pudo verificar la sesión local." });
    }
};

module.exports = autenticarLocal;
