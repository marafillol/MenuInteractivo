const express = require("express");
const router = express.Router();

const autenticarSupabase = require("../../middleware/autenticarSupabase");
const verificarRol = require("../../middleware/verificarRol");
const controlador = require("../../controladores/buscar");

router.get(
    "/",
    autenticarSupabase,
    verificarRol("admin", "editor", "consulta"),
    controlador.buscar
);

module.exports = router;