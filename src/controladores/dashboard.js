const Dashboard =
require("../modelos/dashboard");



const obtenerDashboard = async(req,res)=>{

    try{


        const resumen =
        await Dashboard.obtenerResumen();


        const fichas =
        await Dashboard.ultimasFichas();


        const menus =
        await Dashboard.ultimosMenus();


        const multimedia =
        await Dashboard.multimediaPorTipo();

        const fichasMenu =
        await Dashboard.fichasPorMenu();

        const estado =
        await Dashboard.estadoContenido();

        res.json({

            resumen,

            fichas,

            menus,

            multimedia,

            fichasMenu,

            estado

        });


    }
    catch(error){

        console.error(error);


        res.status(500).json({

            error:error.message

        });


    }


};



module.exports={

    obtenerDashboard

};