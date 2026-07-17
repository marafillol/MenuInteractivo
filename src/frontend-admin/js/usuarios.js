console.log("usuarios.js cargado");


let usuarioEditando = null;

let usuarioPassword = null;



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

        console.error(
            usuarios.error
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


            </td>


        </tr>

        `;


    });


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


        alert(
            usuarioEditando
            ?
            "Usuario actualizado correctamente"
            :
            "Usuario creado correctamente"
        );


        cerrarModalUsuario();


        cargarUsuarios();



    }else{


        alert(resultado.error);


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


alert(datos.mensaje);


}


function cerrarModalPassword(){

    document
    .getElementById("modalPassword")
    .style.display="none";


    usuarioPassword=null;

}