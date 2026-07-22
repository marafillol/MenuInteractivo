const express = require("express");

const router = express.Router();

const menusController =
require("../../controladores/public/menusController");

router.get(
    "/",
    menusController.obtenerMenus
);

module.exports = router;