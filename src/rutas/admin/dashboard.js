const express = require("express");

const router = express.Router();

const dashboardController =
require("../../controladores/dashboard");


// =======================================
// SUPABASE AUTH
// =======================================

const autenticarSupabase =
require("../../middleware/autenticarSupabase");

const verificarRol =
require("../../middleware/verificarRol");


// =======================================
// DASHBOARD
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

    dashboardController.obtenerDashboard

);


module.exports = router;