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



const vincularSupabaseUID = (id_usuario, supabase_uid)=>{

    return new Promise((resolve,reject)=>{


        db.run(

            `
            UPDATE usuario
            SET supabase_uid = ?
            WHERE id_usuario = ?
            `,

            [
                supabase_uid,
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
            supabase_uid,
            nombre,
            email,
            rol,
            activo
            )
            VALUES
            (?,?,?,?,?)
            `,

            [
             datos.supabase_uid,
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
// OBTENER USUARIO POR SUPABASE UID
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


const existeSupabaseUID = (supabase_uid)=>{

    return new Promise((resolve,reject)=>{


        db.get(

            `
            SELECT *
            FROM usuario
            WHERE supabase_uid = ?
            `,

            [supabase_uid],

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


const obtenerPorSupabaseUID = (supabase_uid)=>{

    return new Promise((resolve,reject)=>{


        db.get(

            `
            SELECT *
            FROM usuario
            WHERE supabase_uid = ?
            `,

            [supabase_uid],

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


const contarAdministradoresActivos = ()=>{

    return new Promise((resolve,reject)=>{


        db.get(

            `
            SELECT COUNT(*) AS cantidad
            FROM usuario
            WHERE rol = 'admin'
            AND activo = 1
            `,

            [],

            (error,fila)=>{

                if(error){

                    reject(error);

                }else{

                    resolve(fila.cantidad);

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
    vincularSupabaseUID,
    actualizarUsuario,
    eliminarUsuario,
    existeSupabaseUID,
    obtenerPorSupabaseUID,
    contarAdministradoresActivos
};