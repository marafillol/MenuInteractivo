const upload = require("../config/multer");

const express = require("express");

const router = express.Router();

const controladorMultimedia = require("../controladores/multimedia");


// LISTAR TODA LA MULTIMEDIA
router.get(
    "/",
    controladorMultimedia.listarMultimedia
);


// LISTAR MULTIMEDIA DE UNA FICHA
router.get(
    "/ficha/:id_ficha",
    controladorMultimedia.listarPorFicha
);

// ==========================
// CREAR MULTIMEDIA
// ==========================

router.post(
    "/",
    upload.single("archivo"),
    controladorMultimedia.crearMultimedia
);


router.get(
    "/:id",
    controladorMultimedia.obtenerMultimedia
);


// ==========================
// ACTUALIZAR MULTIMEDIA
// ==========================

router.put(
    "/:id",
    upload.single("archivo"),
    controladorMultimedia.actualizarMultimedia
);


// ==========================
// ELIMINAR MULTIMEDIA
// ==========================

router.delete(
    "/:id",
    controladorMultimedia.eliminarMultimedia
);

module.exports = router;