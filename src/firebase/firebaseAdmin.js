const {
    initializeApp,
    getApps,
    cert
} = require("firebase-admin/app");

const { getAuth } = require("firebase-admin/auth");
const fs = require("fs");
const path = require("path");

const rutaClaveLocal = path.join(__dirname, "serviceAccountKey.json");
const rutaClaveRender = "/etc/secrets/serviceAccountKey.json";
const rutaClaveFirebase = fs.existsSync(rutaClaveLocal)
    ? rutaClaveLocal
    : rutaClaveRender;

let auth = null;

if (fs.existsSync(rutaClaveFirebase)) {
    const serviceAccount = JSON.parse(
        fs.readFileSync(rutaClaveFirebase, "utf8")
    );

    if (getApps().length === 0) {
        initializeApp({
            credential: cert(serviceAccount)
        });
    }

    auth = getAuth();
} else if (getApps().length > 0) {
    // Si otro módulo inicializó Firebase Admin, reutilizar la app existente.
    auth = getAuth();
} else {
    // Permite iniciar rutas públicas en entornos locales sin la clave.
    // El middleware protegido responde 503 mientras Firebase no esté configurado.
    console.warn(
        "Firebase Admin no está configurado en este entorno; las rutas protegidas no estarán disponibles."
    );
}

module.exports = { auth };
