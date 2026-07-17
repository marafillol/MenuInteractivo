import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signOut
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

function mostrarMensajeLogin(titulo,texto){


    document
    .getElementById("tituloLoginMensaje")
    .textContent = titulo;



    document
    .getElementById("textoLoginMensaje")
    .textContent = texto;



    document
    .getElementById("modalLoginMensaje")
    .style.display="flex";


}

function mensajeErrorFirebase(error){


    switch(error.code){


        case "auth/invalid-credential":

            return "El usuario o la contraseña son incorrectos.";


        case "auth/user-not-found":

            return "No existe un usuario registrado con ese correo.";


        case "auth/wrong-password":

            return "La contraseña ingresada es incorrecta.";


        case "auth/too-many-requests":

            return "Demasiados intentos fallidos. Intentá nuevamente más tarde.";


        default:

            return "No se pudo iniciar sesión. Verifique los datos ingresados.";

    }


}

document
.getElementById("btnAceptarLogin")
.addEventListener(
    "click",
    async()=>{


        document
        .getElementById("modalLoginMensaje")
        .style.display="none";


        await signOut(auth);


    }
);

document
.getElementById("formLogin")
.addEventListener("submit", async(e)=>{


    e.preventDefault();



    const email =
    document.getElementById("usuario").value;



    const password =
    document.getElementById("password").value;



    try{


        // ==========================
        // LOGIN FIREBASE
        // ==========================

        const credencial =
        await signInWithEmailAndPassword(

            auth,
            email,
            password

        );



        console.log(
            "Login Firebase correcto"
        );



        // ==========================
        // OBTENER TOKEN
        // ==========================

        const token =
        await credencial.user.getIdToken();




        // ==========================
        // VALIDAR USUARIO SISTEMA
        // ==========================

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




        // ==========================
        // USUARIO BLOQUEADO
        // ==========================

        if(!respuesta.ok){


            mostrarMensajeLogin(

                "Acceso denegado",

                datos.error

            );


            return;


        }




        // ==========================
        // TODO OK
        // ==========================

        console.log(
            "Usuario autorizado:",
            datos
        );



        window.location.href =
        "panel.html";



    }catch(error){


         console.error(
             "Error login:",
             error
         );



         mostrarMensajeLogin(

             "Error de acceso",

             mensajeErrorFirebase(error)

         );


    }


});