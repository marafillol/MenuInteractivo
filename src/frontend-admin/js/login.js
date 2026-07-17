import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


document
.getElementById("formLogin")
.addEventListener("submit", async(e)=>{

    e.preventDefault();

    const email =
    document.getElementById("usuario").value;


    const password =
    document.getElementById("password").value;


    try{

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        console.log("Login Firebase correcto");


        window.location.href="panel.html";


    }catch(error){

        console.error(
            "Error login:",
            error
        );

        alert(error.message);

    }

});