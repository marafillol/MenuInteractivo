const usuarioService = require("../services/usuario.service");

async function listarUsuarios(req, res) {
    res.json(await usuarioService.listarUsuarios());
}

async function obtenerUsuario(req, res) {
    res.json(await usuarioService.obtenerUsuario(req.params.id));
}

async function crearUsuario(req, res) {
    const usuario = await usuarioService.crearUsuario(req.body);
    res.status(201).json({
        mensaje: "Usuario creado con exito",
        usuario
    });
}

async function actualizarRol(req, res) {
    const usuario = await usuarioService.actualizarRol(req.params.id, req.body.rol);
    res.json({
        mensaje: "Rol actualizado",
        usuario
    });
}

module.exports = {
    listarUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarRol
};
