const { all, get, run } = require("./db");

function findAll() {
    return all("SELECT * FROM menu ORDER BY creado DESC");
}

function findById(id) {
    return get("SELECT * FROM menu WHERE id_menu = ?", [id]);
}

async function create(menu) {
    const result = await run(
        `INSERT INTO menu (descripcion, imagen, interfaz_json, visible)
         VALUES (?, ?, ?, ?)`,
        [menu.descripcion, menu.imagen, menu.interfaz_json, menu.visible]
    );

    return findById(result.id);
}

async function update(id, menu) {
    await run(
        `UPDATE menu
         SET descripcion = ?,
             imagen = COALESCE(?, imagen),
             interfaz_json = COALESCE(?, interfaz_json),
             visible = COALESCE(?, visible),
             actualizado = CURRENT_TIMESTAMP
         WHERE id_menu = ?`,
        [menu.descripcion, menu.imagen, menu.interfaz_json, menu.visible, id]
    );

    return findById(id);
}

function remove(id) {
    return run("DELETE FROM menu WHERE id_menu = ?", [id]);
}

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove
};
