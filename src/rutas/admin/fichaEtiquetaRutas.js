const express = require("express");

const router = express.Router();

const FichaEtiquetaControlador =
require("../../controladores/fichaEtiquetaControlador");


// ===============================
// SUPABASE AUTH
// ===============================

const autenticarSupabase =
require("../../middleware/autenticarSupabase");

const verificarRol =
require("../../middleware/verificarRol");


// ===============================
// OBTENER ETIQUETAS DE UNA FICHA
// Admin, Editor y Consulta
// ===============================

router.get(

    "/fichas/:id/etiquetas",

    autenticarSupabase,

    verificarRol(
        "admin",
        "editor",
        "consulta"
    ),

    FichaEtiquetaControlador.obtenerEtiquetasFicha

);


// ===============================
// GUARDAR ETIQUETAS DE UNA FICHA
// Admin y Editor
// ===============================

router.put(

    "/fichas/:id/etiquetas",

    autenticarSupabase,

    verificarRol(
        "admin",
        "editor"
    ),

    FichaEtiquetaControlador.guardarEtiquetasFicha

);


module.exports = router;