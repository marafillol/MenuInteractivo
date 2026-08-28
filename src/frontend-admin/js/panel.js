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

const iconosNavegacion = {
    dashboard: "layout-dashboard",
    menus: "folder-open",
    fichas: "file-text",
    multimedia: "image",
    etiquetas: "tag",
    plantillas: "files",
    usuarios: "users-round",
    configuracion: "settings"
};

function actualizarIconos(){

    document
    .querySelectorAll(".sidebar .item")
    .forEach(boton=>{

        const nombreSeccion = boton.textContent.trim();

        boton.setAttribute("aria-label", nombreSeccion);
        boton.setAttribute("title", nombreSeccion);

        const icono =
        iconosNavegacion[boton.dataset.ventana];

        const marcador =
        boton.querySelector("span");

        if(icono && marcador){
            marcador.outerHTML =
            `<i class="icono-navegacion" data-lucide="${icono}" aria-hidden="true"></i>`;
        }

    });



    const cerrarSesion =
    document.getElementById("cerrarSesion");

    if(cerrarSesion && !cerrarSesion.querySelector("svg")){
        cerrarSesion.innerHTML =
        '<i data-lucide="log-out" aria-hidden="true"></i><span>Cerrar sesi&oacute;n</span>';
    }

    const iconosDashboard = [
        "folder-open",
        "file-text",
        "files",
        "image",
        "tag"
    ];

    document
    .querySelectorAll(".ventana.dashboard .icono-dashboard")
    .forEach((contenedor, indice)=>{

        if(iconosDashboard[indice]){
            contenedor.innerHTML =
            `<i data-lucide="${iconosDashboard[indice]}" aria-hidden="true"></i>`;
        }

    });

    const titulosDashboard = [
        ["file-text", "&Uacute;ltimas fichas"],
        ["folder-open", "&Uacute;ltimos men&uacute;s"],
        ["image", "Multimedia"],
        ["bar-chart-3", "Fichas por men&uacute;"],
        ["image", "Tipos de multimedia"],
        ["eye", "Estado del contenido"]
    ];

    document
    .querySelectorAll(".ventana.dashboard .bloque-dashboard > h3")
    .forEach((titulo, indice)=>{

        const configuracion = titulosDashboard[indice];

        if(configuracion){
            titulo.innerHTML =
            `<i data-lucide="${configuracion[0]}" aria-hidden="true"></i>${configuracion[1]}`;
        }

    });

    if(window.lucide){
        window.lucide.createIcons();
    }

}

window.actualizarIconos = actualizarIconos;

function iniciarSidebarPlegable(){

    const panelAdmin = document.querySelector(".panel-admin");
    const boton = document.getElementById("botonAlternarSidebar");

    if(!panelAdmin || !boton){
        return;
    }

    const actualizarEstado = (plegada)=>{

        panelAdmin.classList.toggle("sidebar-plegada", plegada);

        boton.setAttribute("aria-expanded", String(!plegada));

        const accion = plegada ? "Expandir" : "Contraer";

        boton.setAttribute("aria-label", `${accion} menu lateral`);
        boton.setAttribute("title", `${accion} menu lateral`);

    };

    actualizarEstado(
        localStorage.getItem("sidebarPlegada") === "true"
    );

    boton.addEventListener("click", ()=>{

        const plegada =
        !panelAdmin.classList.contains("sidebar-plegada");

        actualizarEstado(plegada);

        localStorage.setItem("sidebarPlegada", String(plegada));

    });

}
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

        console.log("INTENTANDO CARGAR SCRIPT:", ruta);

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

    console.log(
        "======================================"
    );

    console.log(
        "CARGAR VENTANA:",
        nombre,
        "mantenerMenu:",
        mantenerMenu,
        "menuSeleccionado ANTES:",
        menuSeleccionado
    );

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

        console.log("HTML CARGADO:", nombre);
        console.log(html);

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

            console.log(
                "ENTRANDO A FICHAS",
                {
                    mantenerMenu,
                    menuSeleccionadoAntes: menuSeleccionado
                }
            );

            if(!mantenerMenu){

                console.log(
                    "⚠️ SE VA A RESETEAR menuSeleccionado"
                );

                menuSeleccionado = null;

            }

            console.log(
                "menuSeleccionado DESPUÉS:",
                menuSeleccionado
            );

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

            iniciarPlantillas();

            cargarPlantillas();

            aplicarPermisosConsulta();

        }

        if(nombre === "dashboard"){

            await cargarDashboard();

            aplicarPermisosConsulta();

        }

        if(nombre === "usuarios"){

            if(typeof iniciarUsuarios === "function"){
                iniciarUsuarios();
            }

            cargarUsuarios();

            aplicarPermisosConsulta();

        }

        if(nombre === "configuracion"){

            iniciarConfiguracion();

        }

        actualizarIconos();
        activarAccesosRapidos();

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

    iniciarSidebarPlegable();

    actualizarFecha();

    await cargarUsuarioActual();

    await cargarScriptVentana("configuracion");
    aplicarConfiguracionAdminGuardada();

    activarNavegacion();

    cargarVentana("dashboard");

    console.log(
        "Panel Administrativo iniciado correctamente."
    );

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



        // Guardar usuario globalmente

        window.usuarioActual = usuario;



        console.log(
            "USUARIO SQL:",
            usuario
        );


        console.log(
            "ROL:",
            usuario.rol
        );



        // Aplicar permisos

        if(window.Permisos){

            Permisos.ocultarSecciones();

        }



        console.log(
            "Permisos aplicados"
        );



        // Mostrar nombre arriba

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

    document.getElementById(
        "modalCerrarSesion"
    ).style.display="flex";

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


function activarAccesosRapidos(){

    const accesos =
        document.querySelectorAll(
            ".acceso-dashboard"
        );

    accesos.forEach(acceso => {

        acceso.addEventListener("click", () => {

            const ventana =
                acceso.dataset.acceso;

            if(!ventana){
                return;
            }

            // Marcar como activo el botón correspondiente
            const botonSidebar =
                document.querySelector(
                    `.sidebar .item[data-ventana="${ventana}"]`
                );

            document
                .querySelectorAll(".sidebar .item")
                .forEach(item => {
                    item.classList.remove("activo");
                });

            if(botonSidebar){
                botonSidebar.classList.add("activo");
            }

            // Cargar la ventana
            cargarVentana(ventana);

        });

    });

}

iniciarPanel();
