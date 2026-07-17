// =======================================
// CONFIGURACIÓN FIREBASE
// =======================================

import {
    initializeApp
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";


import {
    getAuth
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";




// =======================================
// DATOS DEL PROYECTO FIREBASE
// =======================================

const firebaseConfig = {

    apiKey: "AIzaSyBnGJdBDazEx8mxB4t1RgEefU6Aiv3itHs",

    authDomain:
    "menuinteractivo-2bcb4.firebaseapp.com",

    projectId:
    "menuinteractivo-2bcb4",

    storageBucket:
    "menuinteractivo-2bcb4.firebasestorage.app",

    messagingSenderId:
    "509867198395",

    appId:
    "1:509867198395:web:8db70e36df9de41e1f269e"

};




// =======================================
// INICIALIZAR FIREBASE
// =======================================

const app =
initializeApp(firebaseConfig);




// =======================================
// AUTH FIREBASE
// =======================================

const auth =
getAuth(app);




// =======================================
// EXPORTAR
// =======================================

export {
    auth
};