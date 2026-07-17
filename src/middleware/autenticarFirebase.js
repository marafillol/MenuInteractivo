const {
    auth
}
=
require("../firebase/firebaseAdmin");


const Usuario =
require("../modelos/usuario");




// =======================================
// AUTENTICAR FIREBASE + USUARIO SQLITE
// =======================================

const autenticarFirebase = async(req,res,next)=>{

    try{


        const authorization =
        req.headers.authorization;



        if(!authorization){

            return res.status(401).json({

                error:
                "No se envió token"

            });

        }



        const token =
        authorization.replace(
            "Bearer ",
            ""
        );



        const decoded =
        await auth.verifyIdToken(token);



        console.log(
            "Firebase autorizado:",
            decoded.email
        );



        // Buscar usuario en SQLite

        let usuario =
        await Usuario.obtenerPorFirebaseUID(decoded.uid);


        if(!usuario){

            usuario =
            await Usuario.obtenerPorEmail(decoded.email);


            if(usuario){

                console.log(
                    "Usuario encontrado por email:",
                    usuario
                );

                console.log(
                    "Guardando Firebase UID:",
                    decoded.uid
                );


                await Usuario.vincularFirebaseUID(
                    usuario.id_usuario,
                    decoded.uid
                );


                console.log(
                    "UID guardado correctamente"
                );

            }

        }



        if(!usuario){

            return res.status(401).json({

                error:
                "Usuario no registrado en el sistema"

            });

        }



        // Guardar datos disponibles

        req.firebase = decoded;


        req.usuario = usuario;



        next();



    }catch(error){


        console.error(
            "ERROR AUTENTICANDO FIREBASE:",
            error
        );


        res.status(401).json({

            error:
            error.message

        });


    }


};



module.exports =
autenticarFirebase;