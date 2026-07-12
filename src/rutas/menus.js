const upload = require("../config/multer");
const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");

const controladorMenus = require("../controladores/menus");


// Configuración subida de imágenes

const almacenamiento = multer.diskStorage({

    destination: function(req, file, cb){

        cb(null, "imagenes/menus");

    },


    filename: function(req, file, cb){

        const nombre =
            Date.now() +
            path.extname(file.originalname);


        cb(null, nombre);

    }

});


const subir = multer({
    storage: almacenamiento
});



// Obtener menús
router.get(
    "/",
    controladorMenus.listarMenus
);



// Crear menú con imagen
router.post(
    "/",
    upload.single("imagen"),
    controladorMenus.crearMenu
);


router.get(
    "/:id",
    controladorMenus.obtenerMenu
);

router.put(
    "/:id",
    subir.single("imagen"),
    controladorMenus.actualizarMenu
);


router.delete(
    "/:id",
    controladorMenus.eliminarMenu
);

module.exports = router;