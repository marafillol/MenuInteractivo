const express = require("express");

const router = express.Router();

const FichaEtiquetaControlador =
require("../../controladores/fichaEtiquetaControlador");


// ===============================
// FIREBASE SEGURIDAD
// ===============================

const autenticarFirebase =
require("../../middleware/autenticarFirebase");

const verificarRol =
require("../../middleware/verificarRol");


// ===============================
// OBTENER ETIQUETAS DE UNA FICHA
// Admin, Editor y Consulta
// ===============================

router.get(

    "/fichas/:id/etiquetas",

    autenticarFirebase,

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

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor"
    ),

    FichaEtiquetaControlador.guardarEtiquetasFicha

);


module.exports = router;