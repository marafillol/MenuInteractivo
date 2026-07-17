import {
    auth
} from "./firebase.js";


import {
    onAuthStateChanged,
    signOut
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";



let usuarioFirebaseActual = null;



let firebaseListo =
new Promise((resolve)=>{


    onAuthStateChanged(auth, async (usuario)=>{


        usuarioFirebaseActual = usuario;


        if(usuario){

            console.log(
                "Usuario Firebase conectado:",
                usuario.email
            );


            try{


                const token =
                await usuario.getIdToken();



                const respuesta =
                await fetch(

                    "/api/usuarios/me",

                    {

                        headers:{

                            Authorization:
                            "Bearer " + token

                        }

                    }

                );



                const datos =
                await respuesta.json();



                if(!respuesta.ok){


                    alert(datos.error);


                    await signOut(auth);


                    window.location.href =
                    "index.html";


                    return;

                }



            }catch(error){

                 console.error(
                     "Error verificando usuario:",
                     error
                 );


                 await signOut(auth);


                 window.location.href="index.html";

            }


        }
        else{

            console.log(
                "No hay usuario Firebase"
            );

        }


        resolve(usuario);


    });


});





export async function obtenerTokenFirebase(){


    await firebaseListo;



    if(!usuarioFirebaseActual){

        throw new Error(
            "No existe usuario Firebase conectado"
        );

    }


    return await usuarioFirebaseActual.getIdToken();


}




export async function cerrarSesionFirebase(){

    await signOut(auth);

}

window.firebaseListo = firebaseListo;
window.obtenerTokenFirebase = obtenerTokenFirebase;
window.cerrarSesionFirebase = cerrarSesionFirebase;
