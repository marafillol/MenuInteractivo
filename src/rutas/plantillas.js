const express = require("express");

const router = express.Router();

const plantillaController =
require("../controladores/plantillas");


// =================================
// LISTAR PLANTILLAS
// =================================

router.get(
    "/",
    plantillaController.listarPlantillas
);


// =================================
// OBTENER PLANTILLA DE UN MENÚ
// =================================

router.get(
    "/menu/:id_menu",
    plantillaController.obtenerPlantillaPorMenu
);

// =================================
// OBTENER PLANTILLA POR ID
// =================================

router.get(
    "/:id_plantilla",
    plantillaController.obtenerPlantilla
);


// =================================
// CREAR PLANTILLA
// =================================

router.post(
    "/",
    plantillaController.crearPlantilla
);


// =================================
// ACTUALIZAR PLANTILLA
// =================================

router.put(
    "/:id",
    plantillaController.actualizarPlantilla
);


router.delete(

    "/:id",

    plantillaController.eliminarPlantilla

);

module.exports = router;