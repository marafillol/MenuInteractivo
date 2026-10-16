const express = require("express");

const router = express.Router();

const controlador =
require("../../controladores/etiquetaControlador");


// =======================================
// AUTENTICACIÓN SUPABASE
// =======================================

const autenticarSupabase =
require("../../middleware/autenticarSupabase");

const verificarRol =
require("../../middleware/verificarRol");


// =======================================
// OBTENER TODAS LAS ETIQUETAS
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

    controlador.obtenerEtiquetas

);


// =======================================
// OBTENER UNA ETIQUETA
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

    controlador.obtenerEtiqueta

);


// =======================================
// CREAR ETIQUETA
// Admin y Editor
// =======================================

router.post(

    "/",

    autenticarSupabase,

    verificarRol(
        "admin",
        "editor"
    ),

    controlador.crearEtiqueta

);


// =======================================
// EDITAR ETIQUETA
// Admin y Editor
// =======================================

router.put(

    "/:id",

    autenticarSupabase,

    verificarRol(
        "admin",
        "editor"
    ),

    controlador.editarEtiqueta

);


// =======================================
// ELIMINAR ETIQUETA
// Admin y Editor
// =======================================

router.delete(

    "/:id",

    autenticarSupabase,

    verificarRol(
        "admin",
        "editor"
    ),

    controlador.eliminarEtiqueta

);


module.exports = router;