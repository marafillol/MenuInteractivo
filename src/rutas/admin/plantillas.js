const express = require("express");

const router = express.Router();


const plantillaController =
require("../../controladores/plantillas");


// =======================================
// AUTENTICACIÓN SUPABASE
// =======================================

const autenticarSupabase =
require("../../middleware/autenticarSupabase");


const verificarRol =
require("../../middleware/verificarRol");



// =================================
// PERMISO LECTURA PLANTILLAS
// ADMIN + EDITOR
// =================================

const permitirLectura =
(req, res, next)=>{


    const rol = req.usuario.rol;


    if(
        rol === "admin" ||
        rol === "editor"||
        rol === "consulta"
    ){

        next();

    }
    else{

        return res.status(403).json({

            error:"No tiene permisos para leer plantillas"

        });

    }

};



// =================================
// LISTAR PLANTILLAS
// ADMIN + EDITOR + CONSULTA
// =================================

router.get(
    "/",
    autenticarSupabase,
    permitirLectura,
    plantillaController.listarPlantillas
);



// =================================
// OBTENER PLANTILLA DE UN MENÚ
// ADMIN + EDITOR + CONSULTA
// =================================

router.get(
    "/menu/:id_menu",
    autenticarSupabase,
    permitirLectura,
    plantillaController.obtenerPlantillaPorMenu
);



// =================================
// OBTENER PLANTILLA POR ID
// ADMIN + EDITOR + CONSULTA
// =================================

router.get(
    "/:id_plantilla",
    autenticarSupabase,
    permitirLectura,
    plantillaController.obtenerPlantilla
);



// =================================
// CREAR PLANTILLA
// SOLO ADMIN
// =================================

router.post(
    "/",
    autenticarSupabase,
    verificarRol("admin"),
    plantillaController.crearPlantilla
);



// =================================
// ACTUALIZAR PLANTILLA
// SOLO ADMIN
// =================================

router.put(
    "/:id",
    autenticarSupabase,
    verificarRol("admin"),
    plantillaController.actualizarPlantilla
);



// =================================
// ELIMINAR PLANTILLA
// SOLO ADMIN
// =================================

router.delete(
    "/:id",
    autenticarSupabase,
    verificarRol("admin"),
    plantillaController.eliminarPlantilla
);



module.exports = router;