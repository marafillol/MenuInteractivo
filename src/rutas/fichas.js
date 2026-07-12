const upload = require("../config/multer");

const express = require("express");

const router = express.Router();

const controladorFichas =
require("../controladores/fichas");


// =================================
// LISTAR TODAS
// =================================

router.get(
    "/",
    controladorFichas.listarFichas
);


// =================================
// LISTAR POR MENU
// =================================

router.get(
    "/menu/:id_menu",
    controladorFichas.listarFichasPorMenu
);


// =================================
// CREAR FICHA
// =================================

router.post(
    "/",
    upload.single("imagen"),
    controladorFichas.crearFicha
);

// =================================
// ACTUALIZAR FICHA
// =================================

router.put(
    "/:id_ficha",
    upload.single("imagen"),
    controladorFichas.actualizarFicha
);


// =================================
// ACTUALIZAR FICHA
// =================================

router.put(
    "/:id_ficha",
    upload.single("imagen"),
    controladorFichas.actualizarFicha
);

// =================================
// OBTENER UNA FICHA
// =================================

router.get(
    "/:id_ficha",
    controladorFichas.obtenerFicha
);


// =================================
// ELIMINAR FICHA
// =================================

router.delete(
    "/:id_ficha",
    controladorFichas.eliminarFicha
);



module.exports = router;