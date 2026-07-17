const express = require("express");
const router = express.Router();

const upload = require("../../config/multer");

const controladorMenus =
require("../../controladores/menus");


// ===============================
// FIREBASE SEGURIDAD
// ===============================

const autenticarFirebase =
require("../../middleware/autenticarFirebase");

const verificarRol =
require("../../middleware/verificarRol");


// ===============================
// OBTENER MENÚS
// Admin, Editor y Consulta
// ===============================

router.get(

    "/",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor",
        "consulta"
    ),

    controladorMenus.listarMenus

);


// ===============================
// CREAR MENÚ
// Admin y Editor
// ===============================

router.post(

    "/",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor"
    ),

    upload.single("imagen"),

    controladorMenus.crearMenu

);


// ===============================
// OBTENER MENÚ POR ID
// Admin, Editor y Consulta
// ===============================

router.get(

    "/:id",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor",
        "consulta"
    ),

    controladorMenus.obtenerMenu

);


// ===============================
// ACTUALIZAR MENÚ
// Admin y Editor
// ===============================

router.put(

    "/:id",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor"
    ),

    upload.single("imagen"),

    controladorMenus.actualizarMenu

);


// ===============================
// ELIMINAR MENÚ
// SOLO ADMIN
// ===============================

router.delete(

    "/:id",

    autenticarFirebase,

    verificarRol(
        "admin",
        "editor"
    ),

    controladorMenus.eliminarMenu

);


module.exports = router;