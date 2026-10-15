const test = require("node:test");
const assert = require("node:assert/strict");

const middlewarePath = require.resolve("../src/middleware/autenticarSupabase");
const usuarioPath = require.resolve("../src/modelos/usuario");
const authConfigPath = require.resolve("../src/config/supabaseAuth");

async function ejecutarMiddleware({ configurado = true, authorization, authResult, usuario } = {}) {
    const anteriores = new Map([
        [middlewarePath, require.cache[middlewarePath]],
        [usuarioPath, require.cache[usuarioPath]],
        [authConfigPath, require.cache[authConfigPath]]
    ]);
    let tokenVerificado = null;
    let nextLlamado = false;

    const clienteFalso = {
        auth: {
            async getUser(token) {
                tokenVerificado = token;
                return authResult || { data: { user: { id: "uid-prueba" } }, error: null };
            }
        }
    };
    require.cache[usuarioPath] = {
        id: usuarioPath, filename: usuarioPath, loaded: true,
        exports: {
            async obtenerPorSupabaseUID(uid) {
                assert.equal(uid, "uid-prueba");
                return usuario === undefined
                    ? { id_usuario: 5, nombre: "Prueba", email: "prueba@example.invalid", rol: "admin", activo: 1 }
                    : usuario;
            }
        }
    };
    require.cache[authConfigPath] = {
        id: authConfigPath, filename: authConfigPath, loaded: true,
        exports: {
            estaSupabaseAuthConfigurado: configurado,
            obtenerClienteSupabaseAdmin: () => clienteFalso
        }
    };
    delete require.cache[middlewarePath];

    const middleware = require("../src/middleware/autenticarSupabase");
    const req = { headers: { authorization: authorization || "" } };
    const res = {
        statusCode: 200, body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };

    try {
        await middleware(req, res, () => { nextLlamado = true; });
        return { req, res, tokenVerificado, nextLlamado };
    } finally {
        for (const [path, modulo] of anteriores) {
            if (modulo) require.cache[path] = modulo;
            else delete require.cache[path];
        }
    }
}

test("devuelve 503 si Supabase Auth no está configurado", async () => {
    const r = await ejecutarMiddleware({ configurado: false, authorization: "Bearer token" });
    assert.equal(r.res.statusCode, 503);
    assert.equal(r.nextLlamado, false);
});

test("rechaza peticiones sin token", async () => {
    const r = await ejecutarMiddleware();
    assert.equal(r.res.statusCode, 401);
    assert.equal(r.nextLlamado, false);
});

test("rechaza tokens inválidos", async () => {
    const r = await ejecutarMiddleware({
        authorization: "Bearer no-valido",
        authResult: { data: { user: null }, error: new Error("invalid") }
    });
    assert.equal(r.res.statusCode, 401);
    assert.equal(r.tokenVerificado, "no-valido");
});

test("rechaza cuentas Auth sin perfil del sistema", async () => {
    const r = await ejecutarMiddleware({ authorization: "Bearer correcto", usuario: null });
    assert.equal(r.res.statusCode, 403);
});

test("rechaza perfiles desactivados", async () => {
    const r = await ejecutarMiddleware({
        authorization: "Bearer correcto",
        usuario: { id_usuario: 7, nombre: "Desactivado", email: "x@example.invalid", rol: "editor", activo: 0 }
    });
    assert.equal(r.res.statusCode, 403);
});

test("acepta un token válido y conserva el rol del perfil de aplicación", async () => {
    const r = await ejecutarMiddleware({ authorization: "Bearer correcto" });
    assert.equal(r.res.statusCode, 200);
    assert.equal(r.nextLlamado, true);
    assert.equal(r.req.usuario.rol, "admin");
    assert.equal(r.req.supabaseUser.id, "uid-prueba");
});
