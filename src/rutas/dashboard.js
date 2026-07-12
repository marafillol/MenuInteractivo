const express=require("express");

const router=express.Router();


const dashboardController=
require("../controladores/dashboard");



router.get(
    "/",
    dashboardController.obtenerDashboard
);



module.exports=router;