const express = require("express");

const router = express.Router();

const upload =
require("../../config/multer");

const controladorMultimedia =
require("../../controladores/multimedia");


// =======================================
// AUTENTICACIÓN SUPABASE
// =======================================

const autenticarSupabase =
require("../../middleware/autenticarSupabase");

const verificarRol =
require("../../middleware/verificarRol");


// =======================================
// LISTAR TODA LA MULTIMEDIA
// Admin, Editor y Consulta
// =======================================

router.get(

    "/",

    autenticarSupabase,

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

    autenticarSupabase,

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

    autenticarSupabase,

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

    autenticarSupabase,

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

    autenticarSupabase,

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

    autenticarSupabase,

    verificarRol(
        "admin",
        "editor"
    ),

    controladorMultimedia.eliminarMultimedia

);


module.exports = router;