console.log("usuarios.js cargado");


let usuarioEditandoUsuarios = null;

let usuarioPasswordUsuarios = null;

let idUsuarioEliminarUsuarios  = null;



async function cargarUsuarios(){


    const token =
    await window.obtenerTokenFirebase();



    const respuesta =
    await window.fetchProtegido(
        "/api/usuarios",
        {

            headers:{

                Authorization:
                `Bearer ${token}`

            }

        }
    );



    const usuarios =
    await respuesta.json();



    if(!respuesta.ok){

        const datos =
        await respuesta.json();


        cerrarModalUsuarioUsuarios();


        mostrarMensajeUsuarios(

            "Acción no permitida",

            datos.error

        );


        return;

    }



    const tabla =
    document.getElementById("tablaUsuarios");


    tabla.innerHTML = "";



    usuarios.forEach(usuario=>{


        tabla.innerHTML += `

        <tr>

            <td>${usuario.nombre}</td>

            <td>${usuario.email}</td>

            <td>${usuario.rol}</td>

            <td>
                ${usuario.activo ? "Activo" : "Inactivo"}
            </td>


            <td>

                <button
                onclick="editarUsuarioUsuarios(${usuario.id_usuario})">
                    Editar
                </button>


                <button
                onclick="abrirCambioPasswordUsuarios(${usuario.id_usuario})">
                    Cambiar contraseña
                </button>

                <button onclick="abrirModalEliminarUsuarios(${usuario.id_usuario}, '${usuario.nombre}')">
                    Eliminar
                </button>


            </td>


        </tr>

        `;


    });


}


function abrirModalEliminarUsuarios(id, nombre){

    idUsuarioEliminarUsuarios  = id;

    document.getElementById("textoEliminarUsuarios").innerHTML =

        `¿Estás seguro de que querés eliminar al usuario <strong>${nombre}</strong>?<br><br>
        Esta acción eliminará el usuario del sistema y de Firebase.`;

    document.getElementById("modalEliminarUsuarios").style.display = "flex";

}

function cerrarModalEliminarUsuarios(){

    idUsuarioEliminarUsuarios  = null;

    document.getElementById("modalEliminarUsuarios").style.display = "none";

}

async function eliminarUsuario(id){

    if(!confirm("¿Seguro que querés eliminar este usuario?"))
        return;


    const respuesta =
    await fetchProtegido(
        `/api/usuarios/${id}`,
        {
            method:"DELETE"
        }
    );


    const datos =
    await respuesta.json();

    if(!respuesta.ok){

        mostrarMensajeUsuarios(

                "Operación no permitida",

                datos.error

            );

        return;

    }


    mostrarMensajeUsuarios(

        "Usuario eliminado",

        "El usuario fue eliminado correctamente del sistema."

    );


    cargarUsuarios();

}

async function confirmarEliminarUsuarioUsuarios(){

    if(!idUsuarioEliminarUsuarios){

        return;

    }


    const respuesta = await fetchProtegido(

        `/api/usuarios/${idUsuarioEliminarUsuarios }`,

        {

            method:"DELETE"

        }

    );


    const datos = await respuesta.json();



    cerrarModalEliminarUsuarios();



    if(!respuesta.ok){


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


}

function abrirModalUsuarioUsuarios(){

    if(!usuarioEditandoUsuarios ){

        document.getElementById(
            "nombreUsuarioNuevo"
        ).value="";


        document.getElementById(
            "emailUsuarioNuevo"
        ).value="";


        document.getElementById(
            "passwordUsuarioNuevo"
        ).value="";


        document.getElementById(
            "rolUsuarioNuevo"
        ).value="consulta";


        document.getElementById(
            "activoUsuarioNuevo"
        ).checked=true;


        document.getElementById(
            "passwordUsuarioNuevo"
        ).style.display="block";


    }


    document
    .getElementById("modalUsuarioUsuarios")
    .style.display="flex";

}







function cerrarModalUsuarioUsuarios(){


    document
    .getElementById("modalUsuarioUsuarios")
    .style.display="none";


    usuarioEditandoUsuarios =null;


    document.getElementById(
        "tituloModalUsuarioUsuarios"
    ).innerText="Nuevo Usuario";


}








async function guardarUsuarioUsuarios(){


    const nombre =
    document.getElementById("nombreUsuarioNuevo")
    .value
    .trim();


    const email =
    document.getElementById("emailUsuarioNuevo")
    .value
    .trim();


    const rol =
    document.getElementById("rolUsuarioNuevo")
    .value;


    const password =
    document.getElementById("passwordUsuarioNuevo")
    .value
    .trim();



    const activo =
    document.getElementById(
        "activoUsuarioNuevo"
    ).checked
    ? 1
    : 0;



    // ==================================
    // VALIDACIONES DEL FORMULARIO
    // ==================================


    if(!nombre){

        mostrarMensajeUsuarios(

            "Datos incompletos",

            "Debe ingresar el nombre del usuario."

        );

        return;

    }



    if(!email){

        mostrarMensajeUsuarios(

            "Datos incompletos",

            "Debe ingresar el correo electrónico."

        );

        return;

    }



    // Solo controla contraseña cuando es usuario nuevo

    if(!usuarioEditandoUsuarios && !password){

        mostrarMensajeUsuarios(

            "Datos incompletos",

            "Debe ingresar una contraseña para crear el usuario."

        );

        return;

    }



    if(!usuarioEditandoUsuarios && password.length < 6){

        mostrarMensajeUsuarios(

            "Contraseña inválida",

            "La contraseña debe tener al menos 6 caracteres."

        );

        return;

    }




    const token =
    await window.obtenerTokenFirebase();





    let url =
    "/api/usuarios";



    let metodo =
    "POST";




    let datos = {};





    // ==================================
    // EDITAR USUARIO
    // ==================================


    if(usuarioEditandoUsuarios){


        url =
        `/api/usuarios/${usuarioEditandoUsuarios}`;


        metodo =
        "PUT";



        datos={

            nombre,

            email,

            rol,

            activo

        };



    }


    // ==================================
    // CREAR USUARIO
    // ==================================


    else{


        datos={

            nombre,

            email,

            password,

            rol,

            activo

        };


    }







    try{


        const respuesta =
        await window.fetchProtegido(

            url,

            {


                method:metodo,


                headers:{


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






        if(respuesta.ok){



            mostrarMensajeUsuarios(


                usuarioEditandoUsuarios

                ?

                "Usuario actualizado"

                :

                "Usuario creado",



                usuarioEditandoUsuarios

                ?

                "Los datos del usuario fueron modificados correctamente."

                :

                "El usuario fue creado correctamente en el sistema."


            );



            cerrarModalUsuarioUsuarios();



            cargarUsuarios();



        }



        else{


            let mensaje =
            resultado.error ||
            "Ocurrió un error inesperado.";



            if(
                mensaje.includes(
                    "email address is already in use"
                )
            ){

                mensaje =
                "El correo electrónico ingresado ya pertenece a otro usuario del sistema.";

            }



            mostrarMensajeUsuarios(


                "No se pudo guardar el usuario",


                mensaje


            );


        }



    }


    catch(error){


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






async function editarUsuarioUsuarios(id){



    usuarioEditandoUsuarios =id;



    const token =
    await window.obtenerTokenFirebase();



    const respuesta =
    await window.fetchProtegido(
        "/api/usuarios",
        {


            headers:{


                Authorization:
                `Bearer ${token}`


            }


        }
    );




    const usuarios =
    await respuesta.json();




    const usuario =
    usuarios.find(
        u=>u.id_usuario===id
    );




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
        "passwordUsuarioNuevo"
    ).style.display="none";


    document.getElementById(
    "tituloModalUsuarioUsuarios"
    ).innerText =
    "Editar Usuario";

    abrirModalUsuarioUsuarios();



}


// ======================================
// MODAL MENSAJES
// ======================================

function mostrarMensajeUsuarios(titulo, mensaje){

    document.getElementById("tituloMensajeUsuarios").textContent = titulo;

    document.getElementById("textoMensajeUsuarios").textContent = mensaje;

    document
        .getElementById("modalMensajeUsuarios")
        .style.display = "flex";

}


function cerrarMensajeUsuarios(){

    document
        .getElementById("modalMensajeUsuarios")
        .style.display = "none";

}




function abrirCambioPasswordUsuarios(id){


    usuarioPasswordUsuarios =id;


    document
    .getElementById("modalPasswordUsuarios")
    .style.display="flex";


}


async function guardarPasswordUsuarios(){


const password =
document.getElementById(
"nuevaPassword"
).value;



const token =
await window.obtenerTokenFirebase();



const respuesta =
await window.fetchProtegido(

`/api/usuarios/${usuarioPasswordUsuarios }/password`,

{

method:"PUT",

headers:{

"Content-Type":"application/json",

Authorization:
`Bearer ${token}`

},

body:JSON.stringify({

password

})

}

);



const datos =
await respuesta.json();


if(respuesta.ok){


    mostrarMensajeUsuarios(

        "Contraseña modificada",

        "La contraseña fue actualizada correctamente."

    );


    cerrarModalPasswordUsuarios();


    document.getElementById(
        "nuevaPassword"
    ).value = "";


}else{


    mostrarMensajeUsuarios(

        "Error",

        datos.error

    );

}


}


document
.getElementById("btnAceptarMensajeUsuarios")
.addEventListener("click", cerrarMensajeUsuarios);

document
.getElementById("btnCancelarEliminarUsuarios")
.addEventListener(
"click",
cerrarModalEliminarUsuarios
);

document
.getElementById("btnConfirmarEliminarUsuarios")
.addEventListener(
    "click",
    confirmarEliminarUsuarioUsuarios
);

function cerrarModalPasswordUsuarios(){

    document
    .getElementById("modalPasswordUsuarios")
    .style.display="none";


    usuarioPasswordUsuarios =null;

}