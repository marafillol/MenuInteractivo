
/* =========================================================
   USUARIOS
   Museo Malvinas
   Gestión de usuarios / Firebase
========================================================= */

console.log("usuarios.js cargado");


/* =========================================================
   VARIABLES
========================================================= */

let usuarioEditandoUsuarios = null;
let usuarioPasswordUsuarios = null;
let idUsuarioEliminarUsuarios = null;


/* =========================================================
   CARGAR USUARIOS
========================================================= */

async function cargarUsuarios() {

    try {

        const token =
            await window.obtenerTokenFirebase();

        const respuesta =
            await window.fetchProtegido(
                "/api/usuarios",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const datos =
            await respuesta.json();

        if (!respuesta.ok) {

            cerrarModalUsuarioUsuarios();

            mostrarMensajeUsuarios(
                "Acción no permitida",
                datos.error
            );

            return;
        }

        const tabla =
            document.getElementById(
                "tablaUsuarios"
            );

        if (!tabla) {
            return;
        }

        tabla.innerHTML = "";

        datos.forEach(usuario => {

            tabla.innerHTML += `

                <tr class="${
                    usuario.activo
                        ? ""
                        : "usuario-inactivo"
                }">

                    <td>
                        ${usuario.nombre}
                    </td>

                    <td>
                        ${usuario.email}
                    </td>

                    <td>
                        ${usuario.rol}
                    </td>

                    <td>
                        ${usuario.activo
                            ? "Activo"
                            : "Inactivo"}
                    </td>

                    <td>

                        <button
                            type="button"
                            onclick="editarUsuarioUsuarios(${usuario.id_usuario})">

                            Editar

                        </button>

                        <button
                            type="button"
                            onclick="abrirCambioPasswordUsuarios(${usuario.id_usuario})">

                            Cambiar contraseña

                        </button>

                        <button
                            type="button"
                            onclick="abrirModalEliminarUsuarios(
                                ${usuario.id_usuario},
                                '${usuario.nombre}'
                            )">

                            Eliminar

                        </button>

                    </td>

                </tr>

            `;

        });

    } catch (error) {

        console.error(
            "Error cargando usuarios:",
            error
        );

        mostrarMensajeUsuarios(
            "Error",
            "No se pudieron cargar los usuarios."
        );
    }
}


/* =========================================================
   MODAL ELIMINAR
========================================================= */

function abrirModalEliminarUsuarios(id, nombre) {

    idUsuarioEliminarUsuarios = id;

    const texto =
        document.getElementById(
            "textoEliminarUsuarios"
        );

    if (texto) {

        texto.innerHTML = `
            ¿Estás seguro de que querés eliminar
            al usuario <strong>${nombre}</strong>?
            <br><br>
            Esta acción eliminará el usuario
            del sistema y de Firebase.
        `;
    }

    const modal =
        document.getElementById(
            "modalEliminarUsuarios"
        );

    if (modal) {
        modal.style.display = "flex";
    }
}


function cerrarModalEliminarUsuarios() {

    idUsuarioEliminarUsuarios = null;

    const modal =
        document.getElementById(
            "modalEliminarUsuarios"
        );

    if (modal) {
        modal.style.display = "none";
    }
}


/* =========================================================
   CONFIRMAR ELIMINACIÓN
========================================================= */

async function confirmarEliminarUsuarioUsuarios() {

    if (!idUsuarioEliminarUsuarios) {
        return;
    }

    try {

        const respuesta =
            await window.fetchProtegido(
                `/api/usuarios/${idUsuarioEliminarUsuarios}`,
                {
                    method: "DELETE"
                }
            );

        const datos =
            await respuesta.json();

        cerrarModalEliminarUsuarios();

        if (!respuesta.ok) {

            mostrarMensajeUsuarios(
                "No se puede eliminar",
                datos.error
            );

            return;
        }

        mostrarMensajeUsuarios(
            "Usuario eliminado",
            "El usuario fue eliminado correctamente del sistema."
        );

        cargarUsuarios();

    } catch (error) {

        console.error(
            "Error eliminando usuario:",
            error
        );

        cerrarModalEliminarUsuarios();

        mostrarMensajeUsuarios(
            "Error",
            "No se pudo eliminar el usuario."
        );
    }
}


/* =========================================================
   ABRIR MODAL NUEVO / EDITAR
========================================================= */

function abrirModalUsuarioUsuarios() {

    if (!usuarioEditandoUsuarios) {

        document.getElementById(
            "nombreUsuarioNuevo"
        ).value = "";

        document.getElementById(
            "emailUsuarioNuevo"
        ).value = "";

        document.getElementById(
            "contenedorPassword"
        ).style.display = "block";

        document.getElementById(
            "rolUsuarioNuevo"
        ).value = "consulta";

        document.getElementById(
            "activoUsuarioNuevo"
        ).checked = true;

        document.getElementById(
            "passwordUsuarioNuevo"
        ).value = "";

        document.getElementById(
            "passwordUsuarioNuevo"
        ).style.display = "block";
    }

    document.getElementById(
        "modalUsuarioUsuarios"
    ).style.display = "flex";
}


/* =========================================================
   CERRAR MODAL USUARIO
========================================================= */

function cerrarModalUsuarioUsuarios() {

    const modal =
        document.getElementById(
            "modalUsuarioUsuarios"
        );

    if (modal) {
        modal.style.display = "none";
    }

    usuarioEditandoUsuarios = null;

    document.getElementById(
        "tituloModalUsuarioUsuarios"
    ).innerText = "Nuevo Usuario";

    document.getElementById(
        "contenedorPassword"
    ).style.display = "block";

    document.getElementById(
        "nombreUsuarioNuevo"
    ).value = "";

    document.getElementById(
        "emailUsuarioNuevo"
    ).value = "";

    document.getElementById(
        "passwordUsuarioNuevo"
    ).value = "";

    document.getElementById(
        "rolUsuarioNuevo"
    ).value = "consulta";

    document.getElementById(
        "activoUsuarioNuevo"
    ).checked = true;
}


/* =========================================================
   GUARDAR / CREAR / EDITAR USUARIO
========================================================= */

async function guardarUsuarioUsuarios() {

    const nombre =
        document.getElementById(
            "nombreUsuarioNuevo"
        ).value.trim();

    const email =
        document.getElementById(
            "emailUsuarioNuevo"
        ).value.trim();

    const rol =
        document.getElementById(
            "rolUsuarioNuevo"
        ).value;

    const password =
        document.getElementById(
            "passwordUsuarioNuevo"
        ).value.trim();

    const activo =
        document.getElementById(
            "activoUsuarioNuevo"
        ).checked
            ? 1
            : 0;


    /* -------------------------
       VALIDACIONES
    ------------------------- */

    if (!nombre) {

        mostrarMensajeUsuarios(
            "Datos incompletos",
            "Debe ingresar el nombre del usuario."
        );

        return;
    }

    if (!email) {

        mostrarMensajeUsuarios(
            "Datos incompletos",
            "Debe ingresar el correo electrónico."
        );

        return;
    }

    if (
        !usuarioEditandoUsuarios &&
        !password
    ) {

        mostrarMensajeUsuarios(
            "Datos incompletos",
            "Debe ingresar una contraseña para crear el usuario."
        );

        return;
    }

    if (
        !usuarioEditandoUsuarios &&
        password.length < 6
    ) {

        mostrarMensajeUsuarios(
            "Contraseña inválida",
            "La contraseña debe tener al menos 6 caracteres."
        );

        return;
    }


    try {

        const token =
            await window.obtenerTokenFirebase();

        let url = "/api/usuarios";
        let metodo = "POST";
        let datos;


        /* -------------------------
           EDITAR
        ------------------------- */

        if (usuarioEditandoUsuarios) {

            url =
                `/api/usuarios/${usuarioEditandoUsuarios}`;

            metodo = "PUT";

            datos = {
                nombre,
                email,
                rol,
                activo
            };

        }

        /* -------------------------
           CREAR
        ------------------------- */

        else {

            datos = {
                nombre,
                email,
                password,
                rol,
                activo
            };
        }


        const respuesta =
            await window.fetchProtegido(
                url,
                {
                    method: metodo,

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`
                    },

                    body:
                        JSON.stringify(datos)
                }
            );


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            let mensaje =
                resultado.error ||
                "Ocurrió un error inesperado.";


            if (
                mensaje.includes(
                    "email address is already in use"
                )
            ) {

                mensaje =
                    "El correo electrónico ingresado ya pertenece a otro usuario del sistema.";
            }


            mostrarMensajeUsuarios(
                "No se pudo guardar el usuario",
                mensaje
            );

            return;
        }


        const editando =
            Boolean(
                usuarioEditandoUsuarios
            );


        cerrarModalUsuarioUsuarios();

        mostrarMensajeUsuarios(
            editando
                ? "Usuario actualizado"
                : "Usuario creado",

            editando
                ? "Los datos del usuario fueron modificados correctamente."
                : "El usuario fue creado correctamente en el sistema."
        );

        cargarUsuarios();

    } catch (error) {

        console.error(
            "Error guardando usuario:",
            error
        );

        mostrarMensajeUsuarios(
            "Error del sistema",
            "No se pudo conectar con el servidor."
        );
    }
}


/* =========================================================
   EDITAR USUARIO
========================================================= */

async function editarUsuarioUsuarios(id) {

    usuarioEditandoUsuarios = id;

    try {

        const token =
            await window.obtenerTokenFirebase();

        const respuesta =
            await window.fetchProtegido(
                "/api/usuarios",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );


        const usuarios =
            await respuesta.json();


        if (!respuesta.ok) {

            mostrarMensajeUsuarios(
                "Error",
                "No se pudieron cargar los usuarios."
            );

            return;
        }


        const usuario =
            usuarios.find(
                u =>
                    u.id_usuario === id
            );


        if (!usuario) {

            mostrarMensajeUsuarios(
                "Error",
                "No se encontró el usuario."
            );

            return;
        }


        document.getElementById(
            "nombreUsuarioNuevo"
        ).value =
            usuario.nombre;


        document.getElementById(
            "emailUsuarioNuevo"
        ).value =
            usuario.email;


        document.getElementById(
            "rolUsuarioNuevo"
        ).value =
            usuario.rol;


        document.getElementById(
            "activoUsuarioNuevo"
        ).checked =
            usuario.activo === 1;


        document.getElementById(
            "contenedorPassword"
        ).style.display =
            "none";


        document.getElementById(
            "tituloModalUsuarioUsuarios"
        ).innerText =
            "Editar Usuario";


        abrirModalUsuarioUsuarios();

    } catch (error) {

        console.error(
            "Error editando usuario:",
            error
        );

        mostrarMensajeUsuarios(
            "Error",
            "No se pudo cargar el usuario."
        );
    }
}


/* =========================================================
   CAMBIAR CONTRASEÑA
========================================================= */

function abrirCambioPasswordUsuarios(id) {

    usuarioPasswordUsuarios = id;

    const modal =
        document.getElementById(
            "modalPasswordUsuarios"
        );

    if (modal) {
        modal.style.display = "flex";
    }
}


async function guardarPasswordUsuarios() {

    const password =
        document.getElementById(
            "nuevaPassword"
        ).value;


    if (!password) {

        mostrarMensajeUsuarios(
            "Datos incompletos",
            "Debe ingresar una nueva contraseña."
        );

        return;
    }


    if (password.length < 6) {

        mostrarMensajeUsuarios(
            "Contraseña inválida",
            "La contraseña debe tener al menos 6 caracteres."
        );

        return;
    }


    if (!usuarioPasswordUsuarios) {
        return;
    }


    try {

        const token =
            await window.obtenerTokenFirebase();


        const respuesta =
            await window.fetchProtegido(
                `/api/usuarios/${usuarioPasswordUsuarios}/password`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`
                    },

                    body:
                        JSON.stringify({
                            password
                        })
                }
            );


        const datos =
            await respuesta.json();


        if (!respuesta.ok) {

            mostrarMensajeUsuarios(
                "Error",
                datos.error
            );

            return;
        }


        cerrarModalPasswordUsuarios();

        document.getElementById(
            "nuevaPassword"
        ).value = "";


        mostrarMensajeUsuarios(
            "Contraseña modificada",
            "La contraseña fue actualizada correctamente."
        );

    } catch (error) {

        console.error(
            "Error cambiando contraseña:",
            error
        );

        mostrarMensajeUsuarios(
            "Error del sistema",
            "No se pudo modificar la contraseña."
        );
    }
}


function cerrarModalPasswordUsuarios() {

    const modal =
        document.getElementById(
            "modalPasswordUsuarios"
        );

    if (modal) {
        modal.style.display = "none";
    }

    usuarioPasswordUsuarios = null;
}


/* =========================================================
   MODAL DE MENSAJES
========================================================= */

function mostrarMensajeUsuarios(titulo, mensaje) {

    cerrarModalUsuarioUsuarios();
    cerrarModalPasswordUsuarios();
    cerrarModalEliminarUsuarios();


    const tituloElemento =
        document.getElementById(
            "tituloMensajeUsuarios"
        );

    const textoElemento =
        document.getElementById(
            "textoMensajeUsuarios"
        );

    const modal =
        document.getElementById(
            "modalMensajeUsuarios"
        );


    if (tituloElemento) {
        tituloElemento.textContent =
            titulo;
    }

    if (textoElemento) {
        textoElemento.textContent =
            mensaje;
    }

    if (modal) {
        modal.style.display = "flex";
    }
}


function cerrarMensajeUsuarios() {

    const modal =
        document.getElementById(
            "modalMensajeUsuarios"
        );

    if (modal) {
        modal.style.display = "none";
    }
}


/* =========================================================
   INICIALIZAR USUARIOS
========================================================= */

function iniciarUsuarios() {

    const btnAceptar =
        document.getElementById(
            "btnAceptarMensajeUsuarios"
        );

    if (btnAceptar) {

        btnAceptar.addEventListener(
            "click",
            cerrarMensajeUsuarios
        );
    }


    const btnCancelar =
        document.getElementById(
            "btnCancelarEliminarUsuarios"
        );

    if (btnCancelar) {

        btnCancelar.addEventListener(
            "click",
            cerrarModalEliminarUsuarios
        );
    }


    const btnConfirmar =
        document.getElementById(
            "btnConfirmarEliminarUsuarios"
        );

    if (btnConfirmar) {

        btnConfirmar.addEventListener(
            "click",
            confirmarEliminarUsuarioUsuarios
        );
    }
}


/* =========================================================
   CERRAR MODALES AL HACER CLICK AFUERA
========================================================= */

document.addEventListener("click", function (evento) {

    const modales = [
        "modalUsuarioUsuarios",
        "modalPasswordUsuarios",
        "modalMensajeUsuarios",
        "modalEliminarUsuarios"
    ];

    modales.forEach(id => {

        const modal = document.getElementById(id);

        if (!modal) {
            return;
        }

        /*
         * Si el click fue directamente sobre
         * el fondo del modal y no sobre su contenido,
         * se cierra.
         */
        if (evento.target === modal) {

            modal.style.display = "none";

            // Limpiar estados correspondientes
            if (id === "modalUsuarioUsuarios") {
                usuarioEditandoUsuarios = null;
            }

            if (id === "modalPasswordUsuarios") {
                usuarioPasswordUsuarios = null;
            }

            if (id === "modalEliminarUsuarios") {
                idUsuarioEliminarUsuarios = null;
            }
        }

    });

});
