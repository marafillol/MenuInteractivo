const express = require("express");

const router = express.Router();


const {

    obtenerRelacionesFicha,

    guardarRelacionesFicha,

    eliminarRelacionFicha

} = require("../controladores/relacionFichaControlador");

router.get(
    "/:id",
    obtenerRelacionesFicha
);


router.post(
    "/:id",
    guardarRelacionesFicha
);

router.delete(
    "/:id",
    eliminarRelacionFicha
);

module.exports = router;