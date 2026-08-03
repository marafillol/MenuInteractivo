const {
    initializeApp,
    getApps,
    cert
}
=
require("firebase-admin/app");


const {
    getAuth
}
=
require("firebase-admin/auth");


const fs = require("fs");
const path = require("path");

const rutaClaveLocal =
path.join(__dirname, "serviceAccountKey.json");

const rutaClaveRender =
"/etc/secrets/serviceAccountKey.json";

const rutaClaveFirebase =
fs.existsSync(rutaClaveLocal)
? rutaClaveLocal
: rutaClaveRender;

if(!fs.existsSync(rutaClaveFirebase)){

    throw new Error(
        "No se encontro la clave de Firebase. Configura el secreto serviceAccountKey.json en Render."
    );

}

const serviceAccount =
JSON.parse(
    fs.readFileSync(rutaClaveFirebase, "utf8")
);



// =======================================
// INICIALIZAR FIREBASE ADMIN
// =======================================

if(getApps().length === 0){


    initializeApp({

        credential:
        cert(serviceAccount)

    });


}



// =======================================
// EXPORTAR AUTH
// =======================================

module.exports = {

    auth:
    getAuth()

};
