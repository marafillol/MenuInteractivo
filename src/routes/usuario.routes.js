const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const usuarioController = require("../controllers/usuario.controller");

const router = express.Router();

router.get("/", asyncHandler(usuarioController.listarUsuarios));
router.get("/:id", asyncHandler(usuarioController.obtenerUsuario));
router.post("/", asyncHandler(usuarioController.crearUsuario));
router.patch("/:id/role", asyncHandler(usuarioController.actualizarRol));

module.exports = router;
