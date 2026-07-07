const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const itemController = require("../controllers/item.controller");
const menuRoutes = require("./menu.routes");
const categoriaRoutes = require("./categoria.routes");
const itemRoutes = require("./item.routes");
const usuarioRoutes = require("./usuario.routes");
const uploadRoutes = require("./upload.routes");
const multimediaRoutes = require("./multimedia.routes");
const multimediaController = require("../controllers/multimedia.controller");

const router = express.Router();

router.get("/estado-admin", (req, res) => {
    res.json({
        mensaje: "Servidor administrativo activo",
        subidaImagenes: true
    });
});

router.get("/estructura-pantalla/:id_menu", asyncHandler(itemController.obtenerEstructuraPantalla));
router.get("/menus/:id/items", asyncHandler(itemController.listarItemsPorMenu));
router.get("/menus/:id/fichas", asyncHandler(itemController.listarItemsPorMenu));
router.get("/fichas/:id/multimedia", asyncHandler(multimediaController.listarPorFicha));

router.use("/menus", menuRoutes);
router.use("/categorias", categoriaRoutes);
router.use("/items", itemRoutes);
router.use("/fichas", itemRoutes);
router.use("/usuarios", usuarioRoutes);
router.use("/uploads", uploadRoutes);
router.use("/multimedia", multimediaRoutes);

module.exports = router;

