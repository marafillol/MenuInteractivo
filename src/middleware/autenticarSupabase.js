const Usuario = require("../modelos/usuario");
const {
    estaSupabaseAuthConfigurado,
    obtenerClienteSupabaseAdmin
} = require("../config/supabaseAuth");

const autenticarSupabase = async (req, res, next) => {
    if (!estaSupabaseAuthConfigurado) {
        return res.status(503).json({
            error: "La autenticación de Supabase no está configurada en este entorno."
        });
    }

    const authorization = req.headers.authorization || "";
    const coincidencia = authorization.match(/^Bearer\s+(.+)$/i);

    if (!coincidencia) {
        return res.status(401).json({
            error: "No se envió un token de sesión válido."
        });
    }

    try {
        const cliente = obtenerClienteSupabaseAdmin();
        const { data, error } = await cliente.auth.getUser(coincidencia[1]);

        if (error || !data?.user) {
            return res.status(401).json({
                error: "La sesión es inválida o venció. Iniciá sesión nuevamente."
            });
        }

        const usuario = await Usuario.obtenerPorSupabaseUID(data.user.id);

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

        req.supabaseUser = data.user;
        req.usuario = usuario;
        return next();
    } catch (error) {
        if (error.status === 503) {
            return res.status(503).json({ error: error.message });
        }
        console.error(
            "Error verificando sesión de Supabase; código=",
            error.code || "sin_codigo"
        );
        return res.status(503).json({
            error: "No se pudo verificar la sesión en este momento."
        });
    }
};

module.exports = autenticarSupabase;
