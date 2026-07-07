const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const itemController = require("../controllers/item.controller");

const router = express.Router();

router.get("/", asyncHandler(itemController.listarItems));
router.get("/:id", asyncHandler(itemController.obtenerItem));
router.post("/", asyncHandler(itemController.crearItem));
router.put("/:id", asyncHandler(itemController.actualizarItem));
router.patch("/:id/visible", asyncHandler(itemController.actualizarVisibilidad));
router.put("/:id/visible", asyncHandler(itemController.actualizarVisibilidad));
router.delete("/:id", asyncHandler(itemController.eliminarItem));

module.exports = router;
