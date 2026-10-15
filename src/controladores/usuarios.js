const Usuario =
require("../modelos/usuario");

const {
    estaSupabaseAuthConfigurado,
    obtenerClienteSupabaseAdmin
} = require("../config/supabaseAuth");

const exigirClienteAuth = () => {
    if (!estaSupabaseAuthConfigurado) {
        const error = new Error("La autenticación de Supabase no está configurada.");
        error.status = 503;
        throw error;
    }
    return obtenerClienteSupabaseAdmin();
};

const exigirUidSupabase = (usuario) => {
    if (!usuario?.supabase_uid) {
        const error = new Error("La cuenta no está vinculada a Supabase Auth. Primero hay que importar las cuentas y ejecutar la migración de usuarios.");
        error.status = 409;
        throw error;
    }
    return usuario.supabase_uid;
};



// =======================================================
// OBTENER USUARIO POR EMAIL
// =======================================================

const obtenerUsuarioPorEmail = async(req,res)=>{

    try{

        const usuario =
        await Usuario.obtenerPorEmail(
            req.params.email
        );

        res.json(usuario);

    }catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};



// =======================================================
// OBTENER USUARIO AUTENTICADO
// =======================================================

const obtenerMiUsuario = async(req,res)=>{
    try {
        const { supabase_uid, ...perfilPublico } = req.usuario;
        res.json(perfilPublico);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



// =======================================================
// OBTENER TODOS LOS USUARIOS
// =======================================================

const obtenerUsuarios = async(req,res)=>{

    try{

        const usuarios =
        await Usuario.obtenerUsuarios();

        res.json(usuarios);

    }catch(error){

        res.status(500).json({

            error:error.message

        });

    }

};



// =======================================================
// CREAR USUARIO
// =======================================================

const crearUsuario = async (req, res) => {
    let usuarioAuthCreado = null;

    try {
        const { nombre, email, password, rol, activo } = req.body || {};
        if (!String(nombre || "").trim() || !String(email || "").trim() ||
            typeof password !== "string" || password.length < 6 ||
            !["admin", "editor", "consulta"].includes(rol)) {
            return res.status(400).json({
                error: "Completá nombre, correo, una contraseña de al menos 6 caracteres y un rol válido."
            });
        }

        const cliente = exigirClienteAuth();
        const { data, error } = await cliente.auth.admin.createUser({
            email: String(email).trim().toLowerCase(),
            password,
            email_confirm: true,
            user_metadata: { nombre: String(nombre).trim() }
        });

        if (error) {
            if (/already|registered|exists/i.test(error.message || "") || error.code === "email_exists") {
                return res.status(400).json({
                    error: "Ese correo ya está registrado en Supabase Auth."
                });
            }
            console.error("Error creando cuenta de autenticación; código=", error.code || "sin_codigo");
            return res.status(400).json({ error: "No se pudo crear la cuenta de autenticación." });
        }

        usuarioAuthCreado = data?.user;
        if (!usuarioAuthCreado?.id) {
            throw new Error("Supabase Auth no devolvió el identificador de la cuenta.");
        }

        try {
            await Usuario.crearUsuario({
                supabase_uid: usuarioAuthCreado.id,
                nombre: String(nombre).trim(),
                email: String(email).trim().toLowerCase(),
                rol,
                activo: activo === undefined ? 1 : activo
            });
        } catch (errorBD) {
            // Compensa el alta remota si no se pudo crear el perfil de la aplicación.
            try {
                await cliente.auth.admin.deleteUser(usuarioAuthCreado.id);
            } catch (errorCompensacion) {
                console.error("No se pudo compensar el alta en Supabase Auth; código=", errorCompensacion.code || "sin_codigo");
            }
            throw errorBD;
        }

        return res.status(201).json({ mensaje: "Usuario creado correctamente." });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === "23505" || /unique constraint|already exists/i.test(error.message || "")) {
            return res.status(400).json({ error: "Ya existe un usuario con ese correo." });
        }
        console.error("Error creando usuario; código=", error.code || "sin_codigo");
        return res.status(500).json({ error: "No se pudo crear el usuario." });
    }
};

const actualizarUsuario = async (req, res) => {
    try {
        const id = req.params.id;
        const usuario = await Usuario.obtenerPorId(id);

        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }

        // No dejar que el sistema quede sin un administrador activo.
        if (usuario.rol === "admin" && Number(usuario.activo) === 1 &&
            Number(req.body.activo) === 0) {
            const cantidadAdmins = await Usuario.contarAdministradoresActivos();
            if (cantidadAdmins <= 1) {
                return res.status(400).json({
                    error: "No se puede desactivar el último administrador activo."
                });
            }
        }

        if (usuario.rol === "admin" && Number(usuario.activo) === 1 &&
            req.body.rol !== "admin") {
            const cantidadAdmins = await Usuario.contarAdministradoresActivos();
            if (cantidadAdmins <= 1) {
                return res.status(400).json({
                    error: "No se puede cambiar el rol del último administrador activo."
                });
            }
        }

        const emailAnterior = usuario.email;
        const emailNuevo = String(req.body.email || "").trim().toLowerCase();
        let authId = null;
        let cambioEmailAuth = false;
        const cliente = exigirClienteAuth();

        if (emailNuevo && emailNuevo !== emailAnterior) {
            authId = exigirUidSupabase(usuario);
            const { error } = await cliente.auth.admin.updateUserById(authId, {
                email: emailNuevo
            });
            if (error) {
                console.error("Error actualizando correo de autenticación; código=", error.code || "sin_codigo");
                return res.status(400).json({ error: "No se pudo actualizar el correo de la cuenta en Supabase Auth." });
            }
            cambioEmailAuth = true;
        }

        try {
            await Usuario.actualizarUsuario(id, {
                ...req.body,
                email: emailNuevo || emailAnterior
            });
        } catch (errorBD) {
            if (cambioEmailAuth && authId) {
                try {
                    await cliente.auth.admin.updateUserById(authId, { email: emailAnterior });
                } catch (errorCompensacion) {
                    console.error("No se pudo restaurar el correo de autenticación; código=", errorCompensacion.code || "sin_codigo");
                }
            }
            throw errorBD;
        }

        return res.json({ mensaje: "Usuario actualizado correctamente." });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === "23505" || /unique constraint|already exists/i.test(error.message || "")) {
            return res.status(400).json({ error: "Ya existe un usuario con ese correo." });
        }
        console.error("Error actualizando usuario; código=", error.code || "sin_codigo");
        return res.status(500).json({ error: "No se pudo actualizar el usuario." });
    }
};

const eliminarUsuario = async (req, res) => {
    try {
        const id = req.params.id;
        const usuario = await Usuario.obtenerPorId(id);

        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }

        if (Number(req.usuario.id_usuario) === Number(usuario.id_usuario)) {
            return res.status(400).json({
                error: "No podés eliminar tu propio usuario mientras estás usando el panel."
            });
        }

        if (usuario.rol === "admin" && Number(usuario.activo) === 1) {
            const cantidadAdmins = await Usuario.contarAdministradoresActivos();
            if (cantidadAdmins <= 1) {
                return res.status(400).json({ error: "No se puede eliminar el último administrador." });
            }
        }

        const authId = exigirUidSupabase(usuario);
        const cliente = exigirClienteAuth();

        // Eliminar primero el perfil evita que una cuenta remanente conserve permisos en la aplicación.
        await Usuario.eliminarUsuario(id);

        const { error } = await cliente.auth.admin.deleteUser(authId);
        if (error) {
            console.error("El perfil se eliminó, pero no se pudo eliminar la cuenta Auth; código=", error.code || "sin_codigo");
            return res.status(502).json({
                error: "Se eliminó el perfil del sistema, pero no se pudo eliminar la cuenta Auth. Contactá al administrador."
            });
        }

        return res.json({ mensaje: "Usuario eliminado correctamente." });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error("Error eliminando usuario; código=", error.code || "sin_codigo");
        return res.status(500).json({ error: "No se pudo eliminar el usuario." });
    }
};

const cambiarPassword = async (req, res) => {
    try {
        const password = req.body?.password;
        if (typeof password !== "string" || password.length < 6) {
            return res.status(400).json({
                error: "La contraseña debe tener al menos 6 caracteres."
            });
        }

        const usuario = await Usuario.obtenerPorId(req.params.id);
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }

        const authId = exigirUidSupabase(usuario);
        const cliente = exigirClienteAuth();
        const { error } = await cliente.auth.admin.updateUserById(authId, { password });

        if (error) {
            console.error("Error cambiando contraseña; código=", error.code || "sin_codigo");
            return res.status(400).json({ error: "No se pudo cambiar la contraseña de la cuenta." });
        }

        return res.json({ mensaje: "Contraseña actualizada." });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error("Error cambiando contraseña; código=", error.code || "sin_codigo");
        return res.status(500).json({ error: "No se pudo cambiar la contraseña." });
    }
};

// =======================================================
// EXPORTAR
// =======================================================

module.exports = {

    obtenerUsuarioPorEmail,

    obtenerMiUsuario,

    obtenerUsuarios,

    crearUsuario,

    actualizarUsuario,

    eliminarUsuario,

    cambiarPassword

};