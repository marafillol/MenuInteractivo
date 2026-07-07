const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const categoriaController = require("../controllers/categoria.controller");

const router = express.Router();

router.get("/", asyncHandler(categoriaController.listarCategorias));
router.get("/:id", asyncHandler(categoriaController.obtenerCategoria));
router.post("/", asyncHandler(categoriaController.crearCategoria));
router.put("/:id", asyncHandler(categoriaController.actualizarCategoria));
router.delete("/:id", asyncHandler(categoriaController.eliminarCategoria));

module.exports = router;
