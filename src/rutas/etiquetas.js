const express=require("express");

const router=express.Router();


const controlador=
require("../controladores/etiquetaControlador");



router.get(
"/",
controlador.obtenerEtiquetas
);



router.post(
"/",
controlador.crearEtiqueta
);


router.get(
"/:id",
controlador.obtenerEtiqueta
);



router.put(
"/:id",
controlador.editarEtiqueta
);



router.delete(
"/:id",
controlador.eliminarEtiqueta
);


module.exports=router;