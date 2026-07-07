const Multimedia = require("../models/multimedia.model");
const Item = require("../models/item.model");
const httpError = require("../utils/httpError");

async function listarPorFicha(fichaId) {
    const ficha = await Item.findById(fichaId);
    if (!ficha) throw httpError(404, "Ficha no encontrada");
    return Multimedia.findByFicha(fichaId);
}

async function crearMultimedia(data) {
    const idFicha = data.id_ficha;
    if (!idFicha) throw httpError(400, "La ficha es obligatoria");

    const ficha = await Item.findById(idFicha);
    if (!ficha) throw httpError(404, "Ficha no encontrada");

    const rutaArchivo = data.ruta_archivo || data.contenido;
    if (!rutaArchivo) throw httpError(400, "La ruta del archivo es obligatoria");

    return Multimedia.create({
        descripcion: data.descripcion || null,
        id_ficha: idFicha,
        ruta_archivo: rutaArchivo,
        tipo_multi: data.tipo_multi || data.tipo_contenido || null,
        miniatura: data.miniatura || null,
        activo: data.activo !== undefined ? Number(data.activo) : 1
    });
}

module.exports = {
    listarPorFicha,
    crearMultimedia
};
