const express = require("express");

const router = express.Router();


const usuarioControlador =
require("../../controladores/usuarios");


// =======================================
// AUTENTICACIÓN SUPABASE
// =======================================

const autenticarSupabase =
require("../../middleware/autenticarSupabase");


const verificarRol =
require("../../middleware/verificarRol");



router.get(
    "/me",
    autenticarSupabase,
    usuarioControlador.obtenerMiUsuario
);


router.get(
    "/",
    autenticarSupabase,
    verificarRol("admin"),
    usuarioControlador.obtenerUsuarios
);


router.post(
    "/",
    autenticarSupabase,
    verificarRol("admin"),
    usuarioControlador.crearUsuario
);

router.put(
    "/:id/password",
    autenticarSupabase,
    verificarRol("admin"),
    usuarioControlador.cambiarPassword
);


router.put(
    "/:id",
    autenticarSupabase,
    verificarRol("admin"),
    usuarioControlador.actualizarUsuario
);


router.delete(
    "/:id",
    autenticarSupabase,
    verificarRol("admin"),
    usuarioControlador.eliminarUsuario
);



module.exports = router;