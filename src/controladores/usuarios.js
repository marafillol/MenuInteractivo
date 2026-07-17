const Usuario =
require("../modelos/usuario");

const {
    getAuth
}
=
require("firebase-admin/auth");



// =======================================================
// OBTENER USUARIO POR EMAIL
// =======================================================

const obtenerUsuarioPorEmail = async(req,res)=>{

    try{

        const usuario =
        await Usuario.obtenerPorEmail(
            req.params.email
        );

        res.json(usuario);

    }catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};



// =======================================================
// OBTENER USUARIO AUTENTICADO
// =======================================================

const obtenerMiUsuario = async(req,res)=>{

    try{

        res.json(req.usuario);

    }catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};



// =======================================================
// OBTENER TODOS LOS USUARIOS
// =======================================================

const obtenerUsuarios = async(req,res)=>{

    try{

        const usuarios =
        await Usuario.obtenerUsuarios();

        res.json(usuarios);

    }catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};



// =======================================================
// CREAR USUARIO
// =======================================================

const crearUsuario = async(req,res)=>{

    try{

        const {
            nombre,
            email,
            password,
            rol,
            activo
        } = req.body;



        // Crear usuario en Firebase

        let usuarioFirebase;


        try {


            usuarioFirebase =
            await getAuth().createUser({

                email,
                password

            });


        }catch(error){


             if(error.code === "auth/email-already-exists"){


                 return res.status(400).json({

                     error:
                     "El correo electrónico ya está registrado. No se puede crear otro usuario con el mismo email."

                 });


             }


             throw error;


        }



        // Guardar usuario en SQLite

        await Usuario.crearUsuario({

            firebase_uid:
            usuarioFirebase.uid,

            nombre,

            email,

            rol,

            activo

        });



        res.json({

            mensaje:
            "Usuario creado correctamente"

        });

    }catch(error){

         console.error(
             "ERROR CREANDO USUARIO:",
             error
         );


         if(error.code === "auth/email-already-exists"){

             return res.status(400).json({

                 error:
                 "No se pudo crear el usuario porque ese correo electrónico ya está registrado. Ingrese un correo diferente o revise los usuarios existentes."

             });

         }


         res.status(500).json({

             error:
             "Ocurrió un error inesperado al crear el usuario."

         });


    }

};


const actualizarUsuario = async(req,res)=>{


    try{


        const id = req.params.id;


        const usuario =
        await Usuario.obtenerPorId(id);



        if(!usuario){

            return res.status(404).json({

                error:"Usuario no encontrado"

            });

        }



        // ==============================
        // CAMBIO DE EMAIL EN FIREBASE
        // ==============================

        if(usuario.email !== req.body.email){


            await getAuth()
            .updateUser(

                usuario.firebase_uid,

                {

                    email:req.body.email

                }

            );


        }




        // ==============================
        // NO DESACTIVAR ÚLTIMO ADMIN
        // ==============================

        if(

            usuario.rol === "admin" &&
            usuario.activo == 1 &&
            req.body.activo == 0

        ){


            const cantidadAdmins =
            await Usuario.contarAdministradoresActivos();



            if(cantidadAdmins <= 1){


                return res.status(400).json({

                    error:
                    "No se puede desactivar el último administrador activo del sistema."

                });


            }


        }


        // ==============================
        // NO CAMBIAR ROL DEL ÚLTIMO ADMIN
        // ==============================

        if(

            usuario.rol === "admin" &&
            usuario.activo == 1 &&
            req.body.rol !== "admin"

        ){

            const cantidadAdmins =
            await Usuario.contarAdministradoresActivos();



            if(cantidadAdmins <= 1){


                return res.status(400).json({

                    error:
                    "No se puede cambiar el rol del último administrador activo. Debe existir al menos un administrador en el sistema."

                });


            }

        }


        // ==============================
        // ACTUALIZAR SQLITE
        // ==============================


        await Usuario.actualizarUsuario(

            id,

            req.body

        );





        res.json({

            mensaje:
            "Usuario actualizado correctamente"

        });



    }catch(error){


        console.error(
            "ERROR ACTUALIZANDO USUARIO:",
            error
        );


        res.status(500).json({

            error:error.message

        });


    }


};

const eliminarUsuario = async(req,res)=>{

    try{

        const id = req.params.id;

        const usuario =
        await Usuario.obtenerPorId(id);

        console.log(usuario);
        if(!usuario){

            return res.status(404).json({

                error:"Usuario no encontrado"

            });

        }


        // No permitir eliminarse a sí mismo

        if(req.usuario.id_usuario == usuario.id_usuario){

            return res.status(400).json({

                error:"No podés eliminar tu propio usuario porque perderías el acceso al sistema. Si necesitás eliminar esta cuenta, iniciá sesión con otro administrador."

            });

        }


        // Si es administrador, verificar que no sea el último
        if(

            usuario.rol === "admin"
            &&
            usuario.activo

        ){

            const cantidadAdmins =

            await Usuario.contarAdministradoresActivos();


            if(cantidadAdmins <= 1){

                return res.status(400).json({

                    error:
                    "No se puede eliminar el último administrador."

                });

            }

        }


        // Eliminar Firebase
        if(usuario.firebase_uid){

            await getAuth().deleteUser(

                usuario.firebase_uid

            );

        }


        // Eliminar SQLite

        await Usuario.eliminarUsuario(id);


        res.json({

            mensaje:
            "Usuario eliminado correctamente"

        });


    }catch(error){

        console.error(error);

        res.status(500).json({

            error:error.message

        });

    }

};



const cambiarPassword = async(req,res)=>{


    try{


        const usuario =
        await Usuario.obtenerPorId(
        req.params.id
        );



        await getAuth()
        .updateUser(

        usuario.firebase_uid,

        {

        password:
        req.body.password

        }

        );



        res.json({

        mensaje:
        "Contraseña actualizada"

        });


    }catch(error){


         console.error(
             "ERROR CAMBIANDO CONTRASEÑA:",
             error
         );


         if(
             error.code === "auth/password-does-not-meet-requirements" ||
             error.code === "auth/invalid-password"
         ){

             return res.status(400).json({

                 error:
                 "La contraseña debe tener al menos 6 caracteres. Ingrese una contraseña más segura."

             });

         }



         res.status(500).json({

             error:
             error.message

         });


    }


};


// =======================================================
// EXPORTAR
// =======================================================

module.exports = {

    obtenerUsuarioPorEmail,

    obtenerMiUsuario,

    obtenerUsuarios,

    crearUsuario,

    actualizarUsuario,

    eliminarUsuario,

    cambiarPassword

};