const express = require("express");
const router = express.Router();

const etiquetasController =
    require("../../controladores/public/etiquetasController");

router.get(
    "/",
    etiquetasController.obtenerEtiquetas
);

module.exports = router;