const express = require("express");
const router = express.Router();

const autenticarSupabase = require("../../middleware/autenticarSupabase");
const verificarRol = require("../../middleware/verificarRol");
const controlador = require("../../controladores/configuracion");

router.get(
    "/estilo-visitante",
    autenticarSupabase,
    verificarRol("admin"),
    controlador.obtenerEstiloVisitante
);

router.put(
    "/estilo-visitante",
    autenticarSupabase,
    verificarRol("admin"),
    controlador.guardarEstiloVisitante
);

router.get(
    "/estilo-admin",
    autenticarSupabase,
    verificarRol("admin"),
    controlador.obtenerEstiloAdmin
);

router.put(
    "/estilo-admin",
    autenticarSupabase,
    verificarRol("admin"),
    controlador.guardarEstiloAdmin
);

module.exports = router;
