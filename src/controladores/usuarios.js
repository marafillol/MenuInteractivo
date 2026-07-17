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


        }
        catch(error){


            if(error.code === "auth/email-already-exists"){


                usuarioFirebase =
                await getAuth().getUserByEmail(email);


            }
            else{

                throw error;

            }


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

        res.status(500).json({

            error:error.message

        });

    }

};


const actualizarUsuario = async(req,res)=>{


    try{


        const id =
        req.params.id;



        const usuario =
        await Usuario.obtenerPorId(id);



        if(!usuario){

            return res.status(404).json({

                error:
                "Usuario no encontrado"

            });

        }



        // Actualizar email solamente si cambió

        if(usuario.email !== req.body.email){


            await getAuth()
            .updateUser(

                usuario.firebase_uid,

                {

                    email:req.body.email

                }

            );


        }



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
            error
        );


        res.status(500).json({

            error:error.message

        });


    }


};

const eliminarUsuario = async(req,res)=>{

    try{

        await Usuario.eliminarUsuario(
            req.params.id
        );


        res.json({
            mensaje:"Usuario eliminado correctamente"
        });


    }catch(error){

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


        res.status(500).json({

        error:error.message

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