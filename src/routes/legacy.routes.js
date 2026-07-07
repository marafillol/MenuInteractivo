const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const upload = require("../config/multer");
const itemController = require("../controllers/item.controller");
const uploadController = require("../controllers/upload.controller");
const multimediaController = require("../controllers/multimedia.controller");
const menuRoutes = require("./menu.routes");
const itemRoutes = require("./item.routes");

const router = express.Router();

router.get("/saludo", (req, res) => {
    res.json({ mensaje: "Hola Museo Malvinas" });
});

router.get("/menus/:id/fichas", asyncHandler(itemController.listarItemsPorMenu));
router.use("/menus", menuRoutes);
router.get("/fichas/:id/multimedia", asyncHandler(multimediaController.listarPorFicha));
router.use("/fichas", itemRoutes);
router.post("/imagenes/upload", upload.single("imagen"), uploadController.subirImagen);
router.post("/multimedia", asyncHandler(multimediaController.crearMultimedia));

module.exports = router;

