const express = require("express");
const router = express.Router();

const autenticarFirebase = require("../../middleware/autenticarFirebase");
const verificarRol = require("../../middleware/verificarRol");
const controlador = require("../../controladores/buscar");

router.get(
    "/",
    autenticarFirebase,
    verificarRol("admin", "editor", "consulta"),
    controlador.buscar
);

module.exports = router;