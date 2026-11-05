require("dotenv").config();

const db = require("../src/database");
const Usuario = require("../src/modelos/usuario");
const { esModoLocal } = require("../src/config/modoServidor");
const { hashearPassword } = require("../src/servicios/autenticacionLocal");

const [nombre, emailOriginal, password] = process.argv.slice(2);

const obtenerColumnas = () => new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(usuario)", (error, columnas) => {
        if (error) {
            reject(error);
            return;
        }

        resolve(columnas);
    });
});

async function esperarTablaLista() {
    for (let intento = 0; intento < 30; intento += 1) {
        const columnas = await obtenerColumnas();
        if (columnas.some((columna) => columna.name === "password_hash")) {
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error("La tabla local de usuarios no pudo prepararse.");
}

async function main() {
    if (!esModoLocal) {
        throw new Error("Este comando requiere MODO_SERVIDOR=local en el archivo .env.");
    }

    const email = String(emailOriginal || "").trim().toLowerCase();
    if (!String(nombre || "").trim() || !email || typeof password !== "string" || password.length < 8) {
        throw new Error("Uso: npm run crear-admin-local -- \"Nombre\" correo@ejemplo.com contraseña-de-8-caracteres");
    }

    await esperarTablaLista();

    const usuarioExistente = await Usuario.obtenerPorEmail(email);
    const password_hash = await hashearPassword(password);

    if (usuarioExistente) {
        await Usuario.actualizarUsuario(usuarioExistente.id_usuario, {
            nombre: String(nombre).trim(),
            email,
            rol: "admin",
            activo: 1
        });
        await Usuario.actualizarPasswordHash(usuarioExistente.id_usuario, password_hash);
        console.log("El administrador local existente fue actualizado.");
        return;
    }

    await Usuario.crearUsuarioLocal({
        nombre: String(nombre).trim(),
        email,
        rol: "admin",
        activo: 1,
        password_hash
    });
    console.log("Administrador local creado correctamente.");
}

main()
    .catch((error) => {
        console.error("No se pudo preparar el administrador local:", error.message);
        process.exitCode = 1;
    })
    .finally(() => {
        if (typeof db.close === "function") {
            db.close();
        }
    });
