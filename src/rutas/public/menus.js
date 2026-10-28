const express = require("express");

const router = express.Router();

const menusController =
    require("../../controladores/public/menusController");

const cachePublico =
    require("../../middleware/cachePublico");

router.get(
    "/",
    cachePublico,
    menusController.obtenerMenus
);

module.exports = router;