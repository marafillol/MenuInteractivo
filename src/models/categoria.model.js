const { all, get, run } = require("./db");

function findAll() {
    return all("SELECT * FROM categoria ORDER BY nombre ASC");
}

function findById(id) {
    return get("SELECT * FROM categoria WHERE id_categoria = ?", [id]);
}

async function create(categoria) {
    const result = await run(
        `INSERT INTO categoria (nombre, descripcion, activo)
         VALUES (?, ?, ?)`,
        [categoria.nombre, categoria.descripcion, categoria.activo]
    );

    return findById(result.id);
}

async function update(id, categoria) {
    await run(
        `UPDATE categoria
         SET nombre = ?,
             descripcion = ?,
             activo = COALESCE(?, activo),
             actualizado = CURRENT_TIMESTAMP
         WHERE id_categoria = ?`,
        [categoria.nombre, categoria.descripcion, categoria.activo, id]
    );

    return findById(id);
}

function remove(id) {
    return run("DELETE FROM categoria WHERE id_categoria = ?", [id]);
}

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove
};
