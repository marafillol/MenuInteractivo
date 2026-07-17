/*
==========================================================
PANEL ADMINISTRATIVO
MenuInteractivo
==========================================================
*/

// ==========================================================
// ELEMENTOS
// ==========================================================

const fechaActual = document.getElementById("fechaActual");
const botonCerrarSesion = document.getElementById("cerrarSesion");


const contenedorPanel = document.getElementById("contenido");
const tituloVentana = document.getElementById("tituloVentana");

let menuSeleccionado = null;
let fichaSeleccionada = null;
let nombreMenuSeleccionado = "";
let nombreFichaSeleccionada = "";
// ==========================================================
// FECHA
// ==========================================================

function actualizarFecha() {

    const ahora = new Date();

    const opciones = {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    };

    fechaActual.textContent =
        ahora.toLocaleDateString("es-AR", opciones);

}





// ==========================================================
// CARGAR SCRIPT DE VENTANA
// ==========================================================

function cargarScriptVentana(nombre){

    return new Promise((resolve, reject)=>{

        const ruta = `js/${nombre}.js`;

        const existente =
        document.querySelector(
            `script[src="${ruta}"]`
        );

        if(existente){
            resolve();
            return;
        }

        const script =
        document.createElement("script");

        script.src = ruta;

        script.onload = ()=>{

            console.log(
                "Script cargado:",
                ruta
            );

            resolve();

        };

        script.onerror = ()=>{

            console.warn(
                "No existe script:",
                ruta
            );

            reject();

        };

        document.body.appendChild(script);

    });

}


// ==========================================================
// CARGAR VENTANAS
// ==========================================================

async function cargarVentana(nombre, mantenerMenu=false){

    try {

        const respuesta =
        await fetch(
            `ventanas/${nombre}.html`
        );

        if (!respuesta.ok) {

            throw new Error(
                "No se encontró la ventana: " + nombre
            );

        }

        const html =
        await respuesta.text();

        contenedorPanel.innerHTML = html;

        tituloVentana.textContent =
            nombre.charAt(0).toUpperCase() +
            nombre.slice(1);

        console.log(
            "Ventana cargada:",
            nombre
        );

        // Cargar el script de la ventana
        await cargarScriptVentana(nombre);

        const aplicarPermisosConsulta = ()=>{

            if(
                window.Permisos &&
                window.usuarioActual?.rol === "consulta"
            ){

                Permisos.ocultarBotonesEdicion();

            }

        };

        // Ejecutar función correspondiente

        if(nombre === "menus"){

            cargarMenus();

            cargarSelectPlantillas();

            aplicarPermisosConsulta();

        }

        if(nombre === "fichas"){

            if(!mantenerMenu){
                menuSeleccionado = null;
            }

            cargarFichas();

            aplicarPermisosConsulta();

        }

        if(nombre === "multimedia"){

            // Si entra desde el menú lateral,
            // mostrar todas las multimedias.
            // Si entra desde una ficha,
            // conservar la ficha seleccionada.

            if(!mantenerMenu){

                fichaSeleccionada = null;
                nombreFichaSeleccionada = "";

            }

            cargarMultimedia();

            aplicarPermisosConsulta();

        }

        if(nombre === "etiquetas"){
            iniciarEtiquetas();
            aplicarPermisosConsulta();
        }

        if(nombre === "plantillas"){

            cargarPlantillas();
            aplicarPermisosConsulta();

        }

        if(nombre === "dashboard"){

            cargarDashboard();

            aplicarPermisosConsulta();

        }

        if(nombre === "usuarios"){

            setTimeout(()=>{

                cargarUsuarios();

            },100);

            aplicarPermisosConsulta();

        }

    }

    catch(error){

        console.error(error);

        contenedorPanel.innerHTML = `
            <h2>Error cargando ventana</h2>
        `;

    }

}


// ==========================================================
// NAVEGACIÓN SIDEBAR
// ==========================================================

function activarNavegacion() {

    const botones =
    document.querySelectorAll(".item");

    botones.forEach(boton=>{

        boton.addEventListener("click",()=>{

            botones.forEach(
                b=>b.classList.remove("activo")
            );

            boton.classList.add("activo");

            const ventana =
            boton.dataset.ventana;

            cargarVentana(
                ventana
            );

        });

    });

}


// ==========================================================
// EVENTOS
// ==========================================================

botonCerrarSesion.addEventListener(
    "click",
    abrirModalCerrarSesion
);

// ==========================================================
// INICIALIZACIÓN
// ==========================================================

async function iniciarPanel(){

    actualizarFecha();


    const usuarioValido =
    await cargarUsuarioActual();


    if(!usuarioValido){

        window.location.href="index.html";

        return;

    }


    activarNavegacion();


    cargarVentana("dashboard");


}

window.addEventListener("click", function(e){

    if(!e.target.classList.contains("modal")){
        return;
    }

    switch(e.target.id){

        case "modalVistaMultimedia":
            cerrarVistaMultimedia();
            break;

        case "modalEliminarPlantilla":
            cerrarEliminarPlantilla();
            break;

        case "modalMensajePlantilla":
            cerrarMensajePlantilla();
            break;

        case "modalPlantilla":
            cerrarPlantilla();
            break;

        case "modalCampo":
            cerrarCampo();
            break;

        case "modalEliminarCampo":
            cerrarEliminarCampo();
            break;

        case "modalVistaPlantilla":
            cerrarVistaPlantilla();
            break;

        default:
            e.target.style.display = "none";
    }

});






// ==========================================================
// CARGAR USUARIO LOGUEADO
// ==========================================================

async function cargarUsuarioActual(){

    try{


        console.log("Cargando usuario actual...");


        const respuesta =
            await window.fetchProtegido(
                "/api/usuarios/me"
            );



        const usuario =
        await respuesta.json();



        if(!respuesta.ok){

            mostrarMensaje(
                "Acceso denegado",
                usuario.error
            );

            return false;

        }


        return true;



        window.usuarioActual = usuario;

        if(window.Permisos){

            Permisos.ocultarSecciones();

        }


        console.log(
            "Usuario cargado:",
            usuario
        );



        const nombre =
        document.getElementById(
            "nombreUsuario"
        );


        if(nombre){

            nombre.textContent =
            usuario.nombre;

        }

        return true;


    }catch(error){


         console.error(
             "ERROR USUARIO:",
             error
         );


         return false;

     }

}
function abrirModalCerrarSesion(){


    document
    .getElementById("modalCerrarSesion")
    .style.display="flex";


}



function cerrarModalCerrarSesion(){


    document
    .getElementById("modalCerrarSesion")
    .style.display="none";


}



async function confirmarCerrarSesion(){


    await window.cerrarSesionFirebase();


    window.location.href="index.html";


}

iniciarPanel();