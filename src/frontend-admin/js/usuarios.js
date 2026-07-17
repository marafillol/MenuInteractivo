console.log("usuarios.js cargado");


let usuarioEditando = null;

let usuarioPassword = null;

let idUsuarioEliminar = null;



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


        cerrarModalUsuario();


        mostrarMensaje(

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
                onclick="editarUsuario(${usuario.id_usuario})">
                    Editar
                </button>


                <button
                onclick="abrirCambioPassword(${usuario.id_usuario})">
                    Cambiar contraseña
                </button>

                <button onclick="abrirModalEliminar(${usuario.id_usuario}, '${usuario.nombre}')">
                    Eliminar
                </button>


            </td>


        </tr>

        `;


    });


}


function abrirModalEliminar(id, nombre){

    idUsuarioEliminar = id;

    document.getElementById("textoEliminar").innerHTML =

        `¿Estás seguro de que querés eliminar al usuario <strong>${nombre}</strong>?<br><br>
        Esta acción eliminará el usuario del sistema y de Firebase.`;

    document.getElementById("modalEliminar").style.display = "flex";

}

function cerrarModalEliminar(){

    idUsuarioEliminar = null;

    document.getElementById("modalEliminar").style.display = "none";

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

        mostrarMensaje(

                "Operación no permitida",

                datos.error

            );

        return;

    }


    mostrarMensaje(

        "Usuario eliminado",

        "El usuario fue eliminado correctamente del sistema."

    );


    cargarUsuarios();

}

async function confirmarEliminarUsuario(){

    if(!idUsuarioEliminar){

        return;

    }


    const respuesta = await fetchProtegido(

        `/api/usuarios/${idUsuarioEliminar}`,

        {

            method:"DELETE"

        }

    );


    const datos = await respuesta.json();



    cerrarModalEliminar();



    if(!respuesta.ok){


        mostrarMensaje(

            "No se puede eliminar",

            datos.error

        );


        return;

    }



    mostrarMensaje(

        "Usuario eliminado",

        "El usuario fue eliminado correctamente del sistema."

    );


    cargarUsuarios();


}

function abrirModalUsuario(){

    if(!usuarioEditando){

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
    .getElementById("modalUsuario")
    .style.display="flex";

}







function cerrarModalUsuario(){


    document
    .getElementById("modalUsuario")
    .style.display="none";


    usuarioEditando=null;


    document.getElementById(
        "tituloModalUsuario"
    ).innerText="Nuevo Usuario";


}








async function guardarUsuario(){



    const nombre =
    document.getElementById("nombreUsuarioNuevo").value;

    const email =
    document.getElementById("emailUsuarioNuevo").value;

    const rol =
    document.getElementById("rolUsuarioNuevo").value;

    const password =
    document.getElementById("passwordUsuarioNuevo").value;


    const activo =
    document.getElementById(
    "activoUsuarioNuevo"
    ).checked
    ? 1
    : 0;




    const token =
    await window.obtenerTokenFirebase();




    let url =
    "/api/usuarios";



    let metodo =
    "POST";




    let datos = {};




    if(usuarioEditando){


        url =
        `/api/usuarios/${usuarioEditando}`;


        metodo =
        "PUT";



        datos={

            nombre,

            email,

            rol,

            activo

        };



    }else{


        datos={

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


        mostrarMensaje(

            usuarioEditando
            ?
            "Usuario actualizado"
            :
            "Usuario creado",

            usuarioEditando
            ?
            "Los datos del usuario fueron modificados correctamente."
            :
            "El usuario fue creado correctamente en el sistema."

        );


        cerrarModalUsuario();


        cargarUsuarios();



    }else{


         mostrarMensaje(

             "No se pudo crear el usuario",

             resultado.error

         );


    }


}










async function editarUsuario(id){



    usuarioEditando=id;



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
    "tituloModalUsuario"
    ).innerText =
    "Editar Usuario";

    abrirModalUsuario();



}


// ======================================
// MODAL MENSAJES
// ======================================

function mostrarMensaje(titulo, mensaje){

    document.getElementById("tituloMensaje").textContent = titulo;

    document.getElementById("textoMensaje").textContent = mensaje;

    document
        .getElementById("modalMensaje")
        .style.display = "flex";

}


function cerrarMensaje(){

    document
        .getElementById("modalMensaje")
        .style.display = "none";

}




function abrirCambioPassword(id){


    usuarioPassword=id;


    document
    .getElementById("modalPassword")
    .style.display="flex";


}


async function guardarPassword(){


const password =
document.getElementById(
"nuevaPassword"
).value;



const token =
await window.obtenerTokenFirebase();



const respuesta =
await window.fetchProtegido(

`/api/usuarios/${usuarioPassword}/password`,

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


    mostrarMensaje(

        "Contraseña modificada",

        "La contraseña fue actualizada correctamente."

    );


    cerrarModalPassword();


    document.getElementById(
        "nuevaPassword"
    ).value = "";


}else{


    mostrarMensaje(

        "Error",

        datos.error

    );

}


}


document
.getElementById("btnAceptarMensaje")
.addEventListener("click", cerrarMensaje);

document
    .getElementById("btnCancelarEliminar")
    .addEventListener("click", cerrarModalEliminar);

document
.getElementById("btnConfirmarEliminar")
.addEventListener(
    "click",
    confirmarEliminarUsuario
);

function cerrarModalPassword(){

    document
    .getElementById("modalPassword")
    .style.display="none";


    usuarioPassword=null;

}