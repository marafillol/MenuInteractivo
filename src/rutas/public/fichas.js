const express = require("express");

const router = express.Router();

const fichasController =
require("../../controladores/public/fichasController");


router.get(
    "/",
    fichasController.obtenerFichas
);


router.get(
    "/menu/:id_menu",
    fichasController.obtenerFichasPorMenu
);


router.get(
    "/:id_ficha",
    fichasController.obtenerFichaPorId
);


module.exports = router;