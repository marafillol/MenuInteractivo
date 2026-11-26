const test = require("node:test");
const assert = require("node:assert/strict");

process.env.LOCAL_AUTH_SECRET = "clave-de-prueba-local-con-mas-de-treinta-y-dos-caracteres";

const {
    hashearPassword,
    verificarPassword,
    crearToken,
    verificarToken
} = require("../src/servicios/autenticacionLocal");

test("las contraseñas locales se verifican sin conservar texto plano", async () => {
    const hash = await hashearPassword("ClaveSegura123");

    assert.notEqual(hash, "ClaveSegura123");
    assert.equal(await verificarPassword("ClaveSegura123", hash), true);
    assert.equal(await verificarPassword("OtraClave456", hash), false);
});

test("las sesiones locales firmadas identifican al usuario y rechazan cambios", () => {
    const token = crearToken({
        id_usuario: 8,
        email: "admin@museo.local"
    });

    assert.deepEqual(verificarToken(token).sub, 8);
    assert.equal(verificarToken(token).email, "admin@museo.local");

    const [carga, firma] = token.split(".");
    const firmaAlterada = `${firma.slice(0, -1)}${firma.endsWith("a") ? "b" : "a"}`;
    assert.equal(verificarToken(`${carga}.${firmaAlterada}`), null);
});
