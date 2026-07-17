const express = require("express");

const router = express.Router();

const controlador =
require("../../controladores/etiquetaControlador");


// =======================================
// AUTENTICACIÓN FIREBASE
// =======================================

const autenticarFirebase =
require("../../middleware/autenticarFirebase");

const verificarRol =
require("../../middleware/verificarRol");


// =======================================
// OBTENER TODAS LAS ETIQUETAS
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

    controlador.obtenerEtiquetas

);


// =======================================
// OBTENER UNA ETIQUETA
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

    controlador.obtenerEtiqueta

);


// =======================================
// CREAR ETIQUETA
// Admin y Editor
// =======================================

router.post(

    "/",

    autenticarFirebase,

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

    autenticarFirebase,

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

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor"
    ),

    controlador.eliminarEtiqueta

);


module.exports = router;