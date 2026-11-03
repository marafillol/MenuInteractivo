const express = require("express");

const router = express.Router();

const fichasController =
    require("../../controladores/public/fichasController");

const cachePublico =
    require("../../middleware/cachePublico");

router.get(
    "/",
    cachePublico,
    fichasController.obtenerFichas
);


router.get(
    "/menu/:id_menu",
    cachePublico,
    fichasController.obtenerFichasPorMenu
);

router.get(
    "/etiqueta/:id_etiqueta",
    cachePublico,
    fichasController.obtenerFichasPorEtiqueta
);


router.get(
    "/:id_ficha",
    cachePublico,
    fichasController.obtenerFichaPorId
);

module.exports = router;