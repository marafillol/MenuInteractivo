const express = require("express");
const router = express.Router();

const upload = require("../../config/multer");

const controladorMenus =
require("../../controladores/menus");


// ===============================
// SUPABASE AUTH
// ===============================

const autenticarSupabase =
require("../../middleware/autenticarSupabase");

const verificarRol =
require("../../middleware/verificarRol");


// ===============================
// OBTENER MENÚS
// Admin, Editor y Consulta
// ===============================

router.get(

    "/",

    autenticarSupabase,

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

    autenticarSupabase,

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

    autenticarSupabase,

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

    autenticarSupabase,

    verificarRol(
        "admin",
        "editor"
    ),

    upload.single("imagen"),

    controladorMenus.actualizarMenu

);


// ===============================
// ELIMINAR MENÚ
// Admin y Editor
// ===============================

router.delete(

    "/:id",

    autenticarSupabase,

    verificarRol(
        "admin",
        "editor"
    ),

    controladorMenus.eliminarMenu

);


module.exports = router;