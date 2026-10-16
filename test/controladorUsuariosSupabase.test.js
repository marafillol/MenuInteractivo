const test = require("node:test");
const assert = require("node:assert/strict");

const usuarioPath = require.resolve("../src/modelos/usuario");
const authConfigPath = require.resolve("../src/config/supabaseAuth");
const controllerPath = require.resolve("../src/controladores/usuarios");

test("los endpoints administrativos de usuarios usan Supabase Auth", async (t) => {
    const anteriores = new Map([
        [usuarioPath, require.cache[usuarioPath]],
        [authConfigPath, require.cache[authConfigPath]],
        [controllerPath, require.cache[controllerPath]]
    ]);

    const llamadas = [];
    let perfil = {
        id_usuario: 12,
        supabase_uid: "uid-existente",
        nombre: "Usuario",
        email: "actual@example.com",
        rol: "editor",
        activo: 1
    };
    let fallarAltaPerfil = false;
    let fallarActualizacionPerfil = false;
    let fallarEliminacionPerfil = false;
    let resultadoEliminarAuth = null;

    const usuarioFalso = {
        async obtenerPorEmail(email) {
            return email === perfil.email ? perfil : null;
        },
        async obtenerMiUsuario() { return perfil; },
        async obtenerUsuarios() { return [perfil]; },
        async obtenerPorId(id) {
            return perfil && Number(perfil.id_usuario) === Number(id) ? perfil : null;
        },
        async crearUsuario(datos) {
            llamadas.push({ tipo: "crearPerfil", datos });
            if (fallarAltaPerfil) throw new Error("fallo simulado al guardar perfil");
            return { id_usuario: 20 };
        },
        async actualizarUsuario(id, datos) {
            llamadas.push({ tipo: "actualizarPerfil", id, datos });
            if (fallarActualizacionPerfil) throw new Error("fallo simulado al editar perfil");
        },
        async eliminarUsuario(id) {
            llamadas.push({ tipo: "eliminarPerfil", id });
            if (fallarEliminacionPerfil) throw new Error("fallo simulado al borrar perfil");
        },
        async contarAdministradoresActivos() { return 2; }
    };

    const authAdmin = {
        async createUser(datos) {
            llamadas.push({ tipo: "crearAuth", datos });
            return { data: { user: { id: "uid-nuevo" } }, error: null };
        },
        async updateUserById(id, cambios) {
            llamadas.push({ tipo: "actualizarAuth", id, cambios });
            return { data: { user: { id } }, error: null };
        },
        async deleteUser(id) {
            llamadas.push({ tipo: "eliminarAuth", id });
            return resultadoEliminarAuth || { data: { user: { id } }, error: null };
        }
    };

    require.cache[usuarioPath] = {
        id: usuarioPath, filename: usuarioPath, loaded: true, exports: usuarioFalso
    };
    require.cache[authConfigPath] = {
        id: authConfigPath, filename: authConfigPath, loaded: true,
        exports: {
            estaSupabaseAuthConfigurado: true,
            obtenerClienteSupabaseAdmin: () => ({ auth: { admin: authAdmin } })
        }
    };
    delete require.cache[controllerPath];
    const controlador = require("../src/controladores/usuarios");

    const respuestaFalsa = () => ({
        statusCode: 200,
        body: null,
        status(codigo) { this.statusCode = codigo; return this; },
        json(body) { this.body = body; return this; }
    });

    t.after(() => {
        for (const [path, modulo] of anteriores) {
            if (modulo) require.cache[path] = modulo;
            else delete require.cache[path];
        }
    });

    await t.test("crear usuario crea primero la identidad Auth y enlaza el perfil", async () => {
        llamadas.length = 0;
        fallarAltaPerfil = false;
        const res = respuestaFalsa();

        await controlador.crearUsuario({
            body: {
                nombre: "Nuevo",
                email: "NUEVO@EXAMPLE.COM",
                password: "temporal-seguro-123",
                rol: "editor",
                activo: 1
            }
        }, res);

        assert.equal(res.statusCode, 201);
        assert.ok(llamadas.some((x) => x.tipo === "crearAuth" &&
            x.datos.email === "nuevo@example.com" && x.datos.email_confirm === true));
        assert.ok(llamadas.some((x) => x.tipo === "crearPerfil" &&
            x.datos.supabase_uid === "uid-nuevo" && x.datos.rol === "editor"));
    });

    await t.test("si falla el alta del perfil, borra la identidad Auth creada", async () => {
        llamadas.length = 0;
        fallarAltaPerfil = true;
        const res = respuestaFalsa();

        await controlador.crearUsuario({
            body: {
                nombre: "Nuevo",
                email: "nuevo@example.com",
                password: "temporal-seguro-123",
                rol: "editor",
                activo: 1
            }
        }, res);

        assert.equal(res.statusCode, 500);
        assert.ok(llamadas.some((x) => x.tipo === "eliminarAuth" && x.id === "uid-nuevo"));
        fallarAltaPerfil = false;
    });

    await t.test("cambiar correo actualiza Supabase Auth y luego el perfil", async () => {
        llamadas.length = 0;
        perfil = {
            id_usuario: 12, supabase_uid: "uid-existente", nombre: "Usuario",
            email: "actual@example.com", rol: "editor", activo: 1
        };
        const res = respuestaFalsa();

        await controlador.actualizarUsuario({
            params: { id: "12" },
            body: {
                nombre: "Usuario",
                email: "nuevo-correo@example.com",
                rol: "editor",
                activo: 1
            }
        }, res);

        assert.equal(res.statusCode, 200);
        assert.ok(llamadas.some((x) => x.tipo === "actualizarAuth" &&
            x.id === "uid-existente" && x.cambios.email === "nuevo-correo@example.com"));
        assert.ok(llamadas.some((x) => x.tipo === "actualizarPerfil"));
    });

    await t.test("no cambia el correo si falta vincular la identidad Supabase", async () => {
        llamadas.length = 0;
        perfil = {
            id_usuario: 12, supabase_uid: null, nombre: "Usuario",
            email: "actual@example.com", rol: "editor", activo: 1
        };
        const res = respuestaFalsa();

        await controlador.actualizarUsuario({
            params: { id: "12" },
            body: {
                nombre: "Usuario",
                email: "nuevo-correo@example.com",
                rol: "editor",
                activo: 1
            }
        }, res);

        assert.equal(res.statusCode, 409);
        assert.equal(llamadas.some((x) => x.tipo === "actualizarAuth"), false);
        assert.equal(llamadas.some((x) => x.tipo === "actualizarPerfil"), false);
    });

    await t.test("cambiar contraseña usa el endpoint administrativo de Supabase Auth", async () => {
        llamadas.length = 0;
        perfil = {
            id_usuario: 12, supabase_uid: "uid-existente", nombre: "Usuario",
            email: "actual@example.com", rol: "editor", activo: 1
        };
        const res = respuestaFalsa();

        await controlador.cambiarPassword({
            params: { id: "12" },
            body: { password: "nueva-clave-segura" }
        }, res);

        assert.equal(res.statusCode, 200);
        assert.ok(llamadas.some((x) => x.tipo === "actualizarAuth" &&
            x.id === "uid-existente" && x.cambios.password === "nueva-clave-segura"));
    });

    await t.test("si Supabase Auth no puede borrar la identidad, conserva el perfil para reintentar", async () => {
        llamadas.length = 0;
        perfil = {
            id_usuario: 12, supabase_uid: "uid-existente", nombre: "Usuario",
            email: "actual@example.com", rol: "editor", activo: 1
        };
        resultadoEliminarAuth = { data: null, error: { code: "unexpected_failure", status: 500 } };
        const res = respuestaFalsa();

        await controlador.eliminarUsuario({
            params: { id: "12" },
            usuario: { id_usuario: 99, rol: "admin", activo: 1 }
        }, res);

        assert.equal(res.statusCode, 502);
        assert.equal(llamadas.some((x) => x.tipo === "eliminarAuth"), true);
        assert.equal(llamadas.some((x) => x.tipo === "eliminarPerfil"), false);
        resultadoEliminarAuth = null;
    });

    await t.test("si Auth ya no encuentra la identidad, permite reintentar la eliminación del perfil", async () => {
        llamadas.length = 0;
        perfil = {
            id_usuario: 12, supabase_uid: "uid-existente", nombre: "Usuario",
            email: "actual@example.com", rol: "editor", activo: 1
        };
        resultadoEliminarAuth = { data: null, error: { code: "user_not_found", status: 404 } };
        const res = respuestaFalsa();

        await controlador.eliminarUsuario({
            params: { id: "12" },
            usuario: { id_usuario: 99, rol: "admin", activo: 1 }
        }, res);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(
            llamadas.filter((x) => ["eliminarAuth", "eliminarPerfil"].includes(x.tipo)).map((x) => x.tipo),
            ["eliminarAuth", "eliminarPerfil"]
        );
        resultadoEliminarAuth = null;
    });

    await t.test("si falla el borrado del perfil luego de eliminar Auth, un segundo intento puede completar la limpieza", async () => {
        llamadas.length = 0;
        perfil = {
            id_usuario: 12, supabase_uid: "uid-existente", nombre: "Usuario",
            email: "actual@example.com", rol: "editor", activo: 1
        };
        fallarEliminacionPerfil = true;
        const primeraRespuesta = respuestaFalsa();

        await controlador.eliminarUsuario({
            params: { id: "12" },
            usuario: { id_usuario: 99, rol: "admin", activo: 1 }
        }, primeraRespuesta);

        assert.equal(primeraRespuesta.statusCode, 502);
        assert.deepEqual(
            llamadas.filter((x) => ["eliminarAuth", "eliminarPerfil"].includes(x.tipo)).map((x) => x.tipo),
            ["eliminarAuth", "eliminarPerfil"]
        );

        fallarEliminacionPerfil = false;
        llamadas.length = 0;
        resultadoEliminarAuth = { data: null, error: { code: "user_not_found", status: 404 } };
        const segundaRespuesta = respuestaFalsa();

        await controlador.eliminarUsuario({
            params: { id: "12" },
            usuario: { id_usuario: 99, rol: "admin", activo: 1 }
        }, segundaRespuesta);

        assert.equal(segundaRespuesta.statusCode, 200);
        assert.deepEqual(
            llamadas.filter((x) => ["eliminarAuth", "eliminarPerfil"].includes(x.tipo)).map((x) => x.tipo),
            ["eliminarAuth", "eliminarPerfil"]
        );
        fallarEliminacionPerfil = false;
        resultadoEliminarAuth = null;
    });
});
