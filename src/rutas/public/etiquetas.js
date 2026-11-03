const express = require("express");

const router = express.Router();

const etiquetasController =
    require("../../controladores/public/etiquetasController");

const cachePublico =
    require("../../middleware/cachePublico");

router.get(
    "/",
    cachePublico,
    etiquetasController.obtenerEtiquetas
);

module.exports = router;