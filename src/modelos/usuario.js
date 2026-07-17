const db = require("../database");

const obtenerPorEmail = (email)=>{

    return new Promise((resolve,reject)=>{

        db.get(

            `
            SELECT *
            FROM usuario
            WHERE email = ?
            `,

            [email],

            (error,fila)=>{

                if(error){

                    reject(error);

                }else{

                    resolve(fila);

                }

            }

        );

    });

};



const vincularFirebaseUID = (id_usuario, firebase_uid)=>{

    return new Promise((resolve,reject)=>{


        db.run(

            `
            UPDATE usuario
            SET firebase_uid = ?
            WHERE id_usuario = ?
            `,

            [
                firebase_uid,
                id_usuario
            ],

            function(error){

                if(error){

                    reject(error);

                }else{

                    resolve();

                }

            }

        );


    });

};


const obtenerUsuarios = ()=>{

    return new Promise((resolve,reject)=>{


        db.all(
            `
            SELECT *
            FROM usuario
            ORDER BY id_usuario DESC
            `,
            [],
            (error, filas)=>{


                if(error){

                    reject(error);

                }else{

                    resolve(filas);

                }


            }
        );


    });

};


const crearUsuario = (datos)=>{

    return new Promise((resolve,reject)=>{


        db.run(

            `
            INSERT INTO usuario
            (
            firebase_uid,
            nombre,
            email,
            rol,
            activo
            )
            VALUES
            (?,?,?,?,?)
            `,

            [
             datos.firebase_uid,
             datos.nombre,
             datos.email,
             datos.rol,
             datos.activo
            ],

            function(error){

                if(error){

                    reject(error);

                }else{

                    resolve({
                        id_usuario:this.lastID
                    });

                }

            }

        );


    });

};


// ======================================
// OBTENER USUARIO POR FIREBASE UID
// ======================================

const obtenerPorId = (id_usuario)=>{

    return new Promise((resolve,reject)=>{


        db.get(

            `
            SELECT *
            FROM usuario
            WHERE id_usuario = ?
            `,

            [id_usuario],

            (error,fila)=>{


                if(error){

                    reject(error);

                }else{

                    resolve(fila);

                }

            }

        );


    });

};

const actualizarUsuario = (id_usuario, datos)=>{

    return new Promise((resolve,reject)=>{


        db.run(

            `
            UPDATE usuario
            SET
            nombre=?,
            email=?,
            rol=?,
            activo=?
            WHERE id_usuario=?
            `,

            [
                datos.nombre,
                datos.email,
                datos.rol,
                datos.activo,
                id_usuario
            ],

            function(error){

                if(error){

                    reject(error);

                }else{

                    resolve();

                }

            }

        );


    });

};

const eliminarUsuario = (id_usuario)=>{

    return new Promise((resolve,reject)=>{


        db.run(

            `
            DELETE FROM usuario
            WHERE id_usuario=?
            `,

            [id_usuario],

            function(error){

                if(error){
                    reject(error);
                }else{
                    resolve();
                }

            }

        );


    });

};


const existeFirebaseUID = (firebase_uid)=>{

    return new Promise((resolve,reject)=>{


        db.get(

            `
            SELECT *
            FROM usuario
            WHERE firebase_uid = ?
            `,

            [firebase_uid],

            (error,fila)=>{


                if(error){

                    reject(error);

                }else{

                    resolve(fila);

                }

            }

        );


    });

};


const obtenerPorFirebaseUID = (firebase_uid)=>{

    return new Promise((resolve,reject)=>{


        db.get(

            `
            SELECT *
            FROM usuario
            WHERE firebase_uid = ?
            `,

            [firebase_uid],

            (error,fila)=>{


                if(error){

                    reject(error);

                }else{

                    resolve(fila);

                }

            }

        );


    });

};

module.exports = {

    obtenerPorEmail,
    obtenerUsuarios,
    crearUsuario,
    obtenerPorId,
    vincularFirebaseUID,
    actualizarUsuario,
    eliminarUsuario,
    existeFirebaseUID,
    obtenerPorFirebaseUID
};