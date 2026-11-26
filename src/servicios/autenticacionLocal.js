const crypto = require("crypto");

const DURACION_SESION_SEGUNDOS = 60 * 60 * 8;
const COSTO_SCRYPT = 64 * 1024;

const obtenerSecreto = () => {
    const secreto = process.env.LOCAL_AUTH_SECRET;

    if (!secreto || secreto.length < 32) {
        const error = new Error(
            "Falta LOCAL_AUTH_SECRET o tiene menos de 32 caracteres. Configuralo para usar el modo local."
        );
        error.status = 503;
        throw error;
    }

    return secreto;
};

const codificar = (valor) => Buffer.from(valor).toString("base64url");
const decodificar = (valor) => Buffer.from(valor, "base64url").toString("utf8");

const derivarClave = (password, sal) => new Promise((resolve, reject) => {
    crypto.scrypt(password, sal, 64, {
        N: COSTO_SCRYPT,
        maxmem: 128 * 1024 * 1024
    }, (error, clave) => {
        if (error) {
            reject(error);
            return;
        }

        resolve(clave);
    });
});

const hashearPassword = async (password) => {
    const sal = crypto.randomBytes(16).toString("base64url");
    const clave = await derivarClave(password, sal);
    return `scrypt$${sal}$${clave.toString("base64url")}`;
};

const verificarPassword = async (password, hash) => {
    if (typeof hash !== "string") {
        return false;
    }

    const [algoritmo, sal, claveGuardada] = hash.split("$");
    if (algoritmo !== "scrypt" || !sal || !claveGuardada) {
        return false;
    }

    const claveEsperada = Buffer.from(claveGuardada, "base64url");
    const claveCalculada = await derivarClave(password, sal);

    return claveEsperada.length === claveCalculada.length &&
        crypto.timingSafeEqual(claveEsperada, claveCalculada);
};

const firmar = (contenido) => crypto
    .createHmac("sha256", obtenerSecreto())
    .update(contenido)
    .digest("base64url");

const crearToken = (usuario) => {
    const ahora = Math.floor(Date.now() / 1000);
    const carga = codificar(JSON.stringify({
        sub: usuario.id_usuario,
        email: usuario.email,
        iat: ahora,
        exp: ahora + DURACION_SESION_SEGUNDOS
    }));

    return `${carga}.${firmar(carga)}`;
};

const verificarToken = (token) => {
    if (typeof token !== "string") {
        return null;
    }

    const [carga, firma] = token.split(".");
    if (!carga || !firma) {
        return null;
    }

    const firmaEsperada = Buffer.from(firmar(carga));
    const firmaRecibida = Buffer.from(firma);

    if (firmaEsperada.length !== firmaRecibida.length ||
        !crypto.timingSafeEqual(firmaEsperada, firmaRecibida)) {
        return null;
    }

    try {
        const datos = JSON.parse(decodificar(carga));
        if (!Number.isInteger(datos.sub) || !datos.exp || datos.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return datos;
    } catch {
        return null;
    }
};

module.exports = {
    hashearPassword,
    verificarPassword,
    crearToken,
    verificarToken
};
