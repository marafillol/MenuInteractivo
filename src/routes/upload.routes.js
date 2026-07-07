const express = require("express");
const upload = require("../config/multer");
const uploadController = require("../controllers/upload.controller");

const router = express.Router();

router.post("/images", upload.single("imagen"), uploadController.subirImagen);

module.exports = router;
