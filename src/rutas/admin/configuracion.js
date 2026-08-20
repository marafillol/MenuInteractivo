const express = require("express");
const router = express.Router();

const autenticarFirebase = require("../../middleware/autenticarFirebase");
const verificarRol = require("../../middleware/verificarRol");
const controlador = require("../../controladores/configuracion");

router.get(
    "/estilo-visitante",
    autenticarFirebase,
    verificarRol("admin"),
    controlador.obtenerEstiloVisitante
);

router.put(
    "/estilo-visitante",
    autenticarFirebase,
    verificarRol("admin"),
    controlador.guardarEstiloVisitante
);

router.get(
    "/estilo-admin",
    autenticarFirebase,
    verificarRol("admin"),
    controlador.obtenerEstiloAdmin
);

router.put(
    "/estilo-admin",
    autenticarFirebase,
    verificarRol("admin"),
    controlador.guardarEstiloAdmin
);

module.exports = router;
