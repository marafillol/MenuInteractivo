const { all, get, run } = require("./db");

function findAll() {
    return all("SELECT id_usuario, nombre, email, rol, activo, creado, actualizado FROM usuario ORDER BY creado DESC");
}

function findById(id) {
    return get(
        "SELECT id_usuario, nombre, email, rol, activo, creado, actualizado FROM usuario WHERE id_usuario = ?",
        [id]
    );
}

function findByEmail(email) {
    return get("SELECT * FROM usuario WHERE email = ?", [email]);
}

async function create(usuario) {
    const result = await run(
        `INSERT INTO usuario (nombre, email, password_hash, rol, activo)
         VALUES (?, ?, ?, ?, ?)`,
        [usuario.nombre, usuario.email, usuario.password_hash, usuario.rol, usuario.activo]
    );

    return findById(result.id);
}

async function updateRole(id, rol) {
    await run(
        `UPDATE usuario
         SET rol = ?, actualizado = CURRENT_TIMESTAMP
         WHERE id_usuario = ?`,
        [rol, id]
    );

    return findById(id);
}

module.exports = {
    findAll,
    findById,
    findByEmail,
    create,
    updateRole
};
