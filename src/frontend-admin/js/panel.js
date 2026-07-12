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
// CERRAR SESIÓN
// ==========================================================

function cerrarSesion() {

    const confirmar = confirm(
        "¿Desea cerrar la sesión?"
    );

    if (!confirmar) return;

    localStorage.removeItem("usuario");

    window.location.href = "index.html";

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

        // Ejecutar función correspondiente

        if(nombre === "menus"){

            cargarMenus();

            cargarPlantillas();

        }

        if(nombre === "fichas"){

            if(!mantenerMenu){
                menuSeleccionado = null;
            }

            cargarFichas();

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

        }

        if(nombre === "etiquetas"){
            iniciarEtiquetas();
        }

        if(nombre === "plantillas"){

            cargarPlantillas();

        }

        if(nombre === "dashboard"){

            cargarDashboard();

        }

        //if(nombre === "usuarios"){
        //    cargarUsuarios();
        //}

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
    cerrarSesion
);


// ==========================================================
// INICIALIZACIÓN
// ==========================================================

function iniciarPanel(){

    actualizarFecha();

    activarNavegacion();

    cargarVentana(
        "dashboard"
    );

    console.log(
        "Panel Administrativo iniciado correctamente."
    );

}

window.addEventListener("click", function(e){

    if(!e.target.classList.contains("modal")){
        return;
    }

    // Si es el modal de vista previa multimedia,
    // usar su función de cierre
    if(e.target.id === "modalVistaMultimedia"){

        cerrarVistaMultimedia();
        return;

    }

    e.target.style.display = "none";

});
iniciarPanel();