const express = require("express");

const router = express.Router();

const {

    obtenerRelacionesFicha,

    guardarRelacionesFicha,

    eliminarRelacionFicha

} = require("../../controladores/relacionFichaControlador");


// ===============================
// FIREBASE SEGURIDAD
// ===============================

const autenticarFirebase =
require("../../middleware/autenticarFirebase");

const verificarRol =
require("../../middleware/verificarRol");


// ===============================
// OBTENER RELACIONES DE UNA FICHA
// Admin, Editor y Consulta
// ===============================

router.get(

    "/:id",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor",
        "consulta"
    ),

    obtenerRelacionesFicha

);


// ===============================
// GUARDAR RELACIONES
// Admin y Editor
// ===============================

router.post(

    "/:id",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor"
    ),

    guardarRelacionesFicha

);


// ===============================
// ELIMINAR RELACIÓN
// Admin y Editor
// ===============================

router.delete(

    "/:id",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor"
    ),

    eliminarRelacionFicha

);


module.exports = router;