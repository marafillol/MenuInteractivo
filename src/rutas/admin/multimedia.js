const express = require("express");

const router = express.Router();

const upload =
require("../../config/multer");

const controladorMultimedia =
require("../../controladores/multimedia");


// =======================================
// AUTENTICACIÓN FIREBASE
// =======================================

const autenticarFirebase =
require("../../middleware/autenticarFirebase");

const verificarRol =
require("../../middleware/verificarRol");


// =======================================
// LISTAR TODA LA MULTIMEDIA
// Admin, Editor y Consulta
// =======================================

router.get(

    "/",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor",
        "consulta"
    ),

    controladorMultimedia.listarMultimedia

);


// =======================================
// LISTAR MULTIMEDIA DE UNA FICHA
// Admin, Editor y Consulta
// =======================================

router.get(

    "/ficha/:id_ficha",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor",
        "consulta"
    ),

    controladorMultimedia.listarPorFicha

);


// =======================================
// OBTENER UNA MULTIMEDIA
// Admin, Editor y Consulta
// =======================================

router.get(

    "/:id",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor",
        "consulta"
    ),

    controladorMultimedia.obtenerMultimedia

);


// =======================================
// CREAR MULTIMEDIA
// Admin y Editor
// =======================================

router.post(

    "/",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor"
    ),

    upload.single("archivo"),

    controladorMultimedia.crearMultimedia

);


// =======================================
// ACTUALIZAR MULTIMEDIA
// Admin y Editor
// =======================================

router.put(

    "/:id",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor"
    ),

    upload.single("archivo"),

    controladorMultimedia.actualizarMultimedia

);


// =======================================
// ELIMINAR MULTIMEDIA
// Admin y Editor
// =======================================

router.delete(

    "/:id",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor"
    ),

    controladorMultimedia.eliminarMultimedia

);


module.exports = router;