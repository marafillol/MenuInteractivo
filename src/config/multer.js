const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({

    destination:(req,file,cb)=>{


        if(req.baseUrl.includes("menus")){

            cb(
                null,
                "imagenes/menus"
            );

        }
        else if(req.baseUrl.includes("fichas")){

            cb(
                null,
                "imagenes/fichas"
            );

        }
        else if(req.baseUrl.includes("multimedia")){

            switch(req.body.tipo_multi){

                case "imagen":
                    cb(null,"imagenes/multimedia/imagen");
                    break;

                case "video":
                    cb(null,"imagenes/multimedia/videos");
                    break;

                case "audio":
                    cb(null,"imagenes/multimedia/audios");
                    break;

                default:
                    cb(null,"imagenes/multimedia/documentos");
                    break;

            }

        }

    },


    filename:(req,file,cb)=>{


        const nombre =
        Date.now()
        +
        "-"
        +
        file.originalname;


        cb(
            null,
            nombre
        );


    }


});


module.exports = multer({
    storage
});