const express = require("express");
const router = express.Router();

const autenticarSupabase = require("../../middleware/autenticarSupabase");
const verificarRol = require("../../middleware/verificarRol");
const controlador = require("../../controladores/configuracion");
const respaldo = require("../../controladores/respaldo");

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

router.get(
    "/copia-seguridad",
    autenticarSupabase,
    verificarRol("admin"),
    respaldo.descargarCopiaSeguridad
);

module.exports = router;