const { all, get, run } = require("./db");

function findAll() {
    return all("SELECT * FROM ficha ORDER BY creado DESC");
}

function findById(id) {
    return get("SELECT * FROM ficha WHERE id_ficha = ?", [id]);
}

function findByMenu(menuId) {
    return all("SELECT * FROM ficha WHERE id_menu = ? ORDER BY creado DESC", [menuId]);
}

async function create(item) {
    const result = await run(
        `INSERT INTO ficha (
            id_menu,
            titulo,
            resumen,
            texto,
            imagen,
            id_plantilla,
            datos_json,
            visible
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            item.id_menu,
            item.titulo,
            item.resumen,
            item.texto,
            item.imagen,
            item.id_plantilla,
            item.datos_json,
            item.visible
        ]
    );

    return findById(result.id);
}

async function update(id, item) {
    await run(
        `UPDATE ficha
         SET titulo = ?,
             resumen = ?,
             texto = ?,
             imagen = COALESCE(?, imagen),
             id_plantilla = COALESCE(?, id_plantilla),
             datos_json = COALESCE(?, datos_json)
         WHERE id_ficha = ?`,
        [
            item.titulo,
            item.resumen,
            item.texto,
            item.imagen,
            item.id_plantilla,
            item.datos_json,
            id
        ]
    );

    return findById(id);
}

async function updateVisibility(id, visible) {
    await run("UPDATE ficha SET visible = ? WHERE id_ficha = ?", [visible, id]);
    return findById(id);
}

function remove(id) {
    return run("DELETE FROM ficha WHERE id_ficha = ?", [id]);
}

function removeByMenu(menuId) {
    return run("DELETE FROM ficha WHERE id_menu = ?", [menuId]);
}

module.exports = {
    findAll,
    findById,
    findByMenu,
    create,
    update,
    updateVisibility,
    remove,
    removeByMenu
};

