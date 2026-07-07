const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const multimediaController = require("../controllers/multimedia.controller");

const router = express.Router();

router.post("/", asyncHandler(multimediaController.crearMultimedia));

module.exports = router;
