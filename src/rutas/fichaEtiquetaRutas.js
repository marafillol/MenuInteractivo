const express = require("express");

const router = express.Router();

const FichaEtiquetaControlador =
require("../controladores/fichaEtiquetaControlador");



router.get(
    "/fichas/:id/etiquetas",
    FichaEtiquetaControlador.obtenerEtiquetasFicha
);



router.put(
    "/fichas/:id/etiquetas",
    FichaEtiquetaControlador.guardarEtiquetasFicha
);



module.exports = router;