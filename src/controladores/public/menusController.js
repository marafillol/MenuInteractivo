const Menu =
require("../../modelos/public/menu");

async function obtenerMenus(req,res){

    try{

        const menus =
        await Menu.obtenerMenus();

        res.json(menus);

    }
    catch(error){

        console.error(error);

        res.status(500).json({

            error:"Error al obtener los menús."

        });

    }

}

module.exports={

    obtenerMenus

};