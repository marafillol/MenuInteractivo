const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const menuController = require("../controllers/menu.controller");

const router = express.Router();

router.get("/", asyncHandler(menuController.listarMenus));
router.get("/:id", asyncHandler(menuController.obtenerMenu));
router.post("/", asyncHandler(menuController.crearMenu));
router.put("/:id", asyncHandler(menuController.actualizarMenu));
router.delete("/:id", asyncHandler(menuController.eliminarMenu));

module.exports = router;
