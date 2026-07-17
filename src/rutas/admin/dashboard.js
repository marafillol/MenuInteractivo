const express = require("express");

const router = express.Router();

const dashboardController =
require("../../controladores/dashboard");


// =======================================
// FIREBASE SEGURIDAD
// =======================================

const autenticarFirebase =
require("../../middleware/autenticarFirebase");

const verificarRol =
require("../../middleware/verificarRol");


// =======================================
// DASHBOARD
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

    dashboardController.obtenerDashboard

);


module.exports = router;