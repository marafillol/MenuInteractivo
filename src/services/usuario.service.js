const Usuario = require("../models/usuario.model");
const httpError = require("../utils/httpError");

const ROLES_VALIDOS = ["admin", "editor", "viewer"];

function normalizeUsuarioPayload(data) {
    return {
        nombre: data.nombre ? data.nombre.trim() : "",
        email: data.email ? data.email.trim().toLowerCase() : "",
        password_hash: data.password_hash || data.passwordHash || "",
        rol: data.rol || "editor",
        activo: data.activo !== undefined ? Number(data.activo) : 1
    };
}

async function listarUsuarios() {
    return Usuario.findAll();
}

async function obtenerUsuario(id) {
    const usuario = await Usuario.findById(id);
    if (!usuario) throw httpError(404, "Usuario no encontrado");
    return usuario;
}

async function crearUsuario(data) {
    const usuario = normalizeUsuarioPayload(data);
    if (!usuario.nombre) throw httpError(400, "El nombre del usuario es obligatorio");
    if (!usuario.email) throw httpError(400, "El email del usuario es obligatorio");
    if (!usuario.password_hash) throw httpError(400, "El password_hash del usuario es obligatorio");
    if (!ROLES_VALIDOS.includes(usuario.rol)) throw httpError(400, "Rol de usuario invalido");
    return Usuario.create(usuario);
}

async function actualizarRol(id, rol) {
    await obtenerUsuario(id);
    if (!ROLES_VALIDOS.includes(rol)) throw httpError(400, "Rol de usuario invalido");
    return Usuario.updateRole(id, rol);
}

module.exports = {
    listarUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarRol
};
