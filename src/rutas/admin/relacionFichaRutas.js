const express = require("express");

const router = express.Router();

const {

    obtenerRelacionesFicha,

    guardarRelacionesFicha,

    eliminarRelacionFicha

} = require("../../controladores/relacionFichaControlador");


// ===============================
// SUPABASE AUTH
// ===============================

const autenticarSupabase =
require("../../middleware/autenticarSupabase");

const verificarRol =
require("../../middleware/verificarRol");


// ===============================
// OBTENER RELACIONES DE UNA FICHA
// Admin, Editor y Consulta
// ===============================

router.get(

    "/:id",

    autenticarSupabase,

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

    autenticarSupabase,

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

    autenticarSupabase,

    verificarRol(
        "admin",
        "editor"
    ),

    eliminarRelacionFicha

);


module.exports = router;