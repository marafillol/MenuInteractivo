function requireRole(...rolesPermitidos) {
    return function roleMiddleware(req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                mensaje: "Autenticacion requerida"
            });
        }

        if (!rolesPermitidos.includes(req.user.rol)) {
            return res.status(403).json({
                mensaje: "No tenes permisos para realizar esta accion"
            });
        }

        return next();
    };
}

module.exports = requireRole;
