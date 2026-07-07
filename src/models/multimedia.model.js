const { all, get, run } = require("./db");

function findByFicha(fichaId) {
    return all("SELECT * FROM multimedia WHERE id_ficha = ? ORDER BY creado DESC", [fichaId]);
}

function findById(id) {
    return get("SELECT * FROM multimedia WHERE id_multi = ?", [id]);
}

async function create(multimedia) {
    const result = await run(
        `INSERT INTO multimedia (descripcion, id_ficha, ruta_archivo, tipo_multi, miniatura, activo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            multimedia.descripcion,
            multimedia.id_ficha,
            multimedia.ruta_archivo,
            multimedia.tipo_multi,
            multimedia.miniatura,
            multimedia.activo
        ]
    );

    return findById(result.id);
}

module.exports = {
    findByFicha,
    create
};
