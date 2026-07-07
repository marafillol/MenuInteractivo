function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            mensaje: "Autenticacion requerida"
        });
    }

    return next();
}

module.exports = requireAuth;
