const express = require("express");

const router = express.Router();


const usuarioControlador =
require("../../controladores/usuarios");


// =======================================
// AUTENTICACIÓN FIREBASE
// =======================================

const autenticarFirebase =
require("../../middleware/autenticarFirebase");


const verificarRol =
require("../../middleware/verificarRol");



router.get(
    "/me",
    autenticarFirebase,
    usuarioControlador.obtenerMiUsuario
);


router.get(
    "/",
    autenticarFirebase,
    verificarRol("admin"),
    usuarioControlador.obtenerUsuarios
);


router.post(
    "/",
    autenticarFirebase,
    verificarRol("admin"),
    usuarioControlador.crearUsuario
);

router.put(
    "/:id/password",
    autenticarFirebase,
    verificarRol("admin"),
    usuarioControlador.cambiarPassword
);


router.put(
    "/:id",
    autenticarFirebase,
    verificarRol("admin"),
    usuarioControlador.actualizarUsuario
);


router.delete(
    "/:id",
    autenticarFirebase,
    verificarRol("admin"),
    usuarioControlador.eliminarUsuario
);



module.exports = router;