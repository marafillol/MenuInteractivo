const express = require("express");

const router = express.Router();

const upload =
require("../../config/multer");

const controladorFichas =
require("../../controladores/fichas");


// =================================
// FIREBASE SEGURIDAD
// =================================

const autenticarFirebase =
require("../../middleware/autenticarFirebase");

const verificarRol =
require("../../middleware/verificarRol");


// =================================
// LISTAR TODAS
// Admin, Editor y Consulta
// =================================

router.get(

    "/",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor",
        "consulta"
    ),

    controladorFichas.listarFichas

);


// =================================
// LISTAR FICHAS POR MENÚ
// Admin, Editor y Consulta
// =================================

router.get(

    "/menu/:id_menu",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor",
        "consulta"
    ),

    controladorFichas.listarFichasPorMenu

);


// =================================
// OBTENER UNA FICHA
// Admin, Editor y Consulta
// =================================

router.get(

    "/:id_ficha",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor",
        "consulta"
    ),

    controladorFichas.obtenerFicha

);


// =================================
// CREAR FICHA
// Admin y Editor
// =================================

router.post(

    "/",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor"
    ),

    upload.single("imagen"),

    controladorFichas.crearFicha

);


// =================================
// ACTUALIZAR FICHA
// Admin y Editor
// =================================

router.put(

    "/:id_ficha",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor"
    ),

    upload.single("imagen"),

    controladorFichas.actualizarFicha

);


// =================================
// ELIMINAR FICHA
// Admin y Editor
// =================================

router.delete(

    "/:id_ficha",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor"
    ),

    controladorFichas.eliminarFicha

);


module.exports = router;