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


    onAuthStateChanged(auth,(usuario)=>{


        usuarioFirebaseActual = usuario;


        if(usuario){

            console.log(
                "Usuario Firebase conectado:",
                usuario.email
            );

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
