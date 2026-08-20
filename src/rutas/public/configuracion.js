const express = require("express");
const router = express.Router();
const controlador = require("../../controladores/configuracion");

router.get("/estilo-visitante", controlador.obtenerEstiloVisitante);

module.exports = router;
