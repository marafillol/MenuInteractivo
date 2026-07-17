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


const serviceAccount =
require("./serviceAccountKey.json");



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