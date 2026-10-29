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


function descartarTodosLosBorradores() {
    if (window.Borradores) {
        const borradores = window.Borradores.obtenerTodos();

        borradores.forEach(borrador => {
            window.Borradores.eliminar(
                borrador.tipo,
                borrador.idRegistro
            );
        });
    }

    // Olvidar el último menú usado para crear fichas.
    // Se ejecuta al cambiar de ventana.
    window.__menuCreacionFicha = null;

    // Limpiar el formulario de Fichas para evitar
    // que un autoguardado pendiente vuelva a crear el borrador.
    const modal = document.getElementById("modalFicha");

    if (modal) {
        modal.style.display = "none";
        modal.dataset.idFicha = "";
        modal.dataset.idMenu = "";
        delete modal.dataset.origenBorrador;
    }
}



// ==========================================================
// CARGAR VENTANAS
// ==========================================================


async function cargarVentana(nombre, mantenerMenu = false) {
    // Solo la navegación más reciente puede continuar.
    const idCarga = (window.__idCargaVentana || 0) + 1;
    window.__idCargaVentana = idCarga;

    const esCargaActual = () =>
        window.__idCargaVentana === idCarga;

    console.log("[NAVEGACIÓN]", {
        nombre,
        mantenerMenu,
        idCarga
    });

    const ventanaActual =
        nombre === "fichas" && mantenerMenu
            ? "fichas-contextual"
            : nombre;

    const ventanaAnterior = window.__ultimaVentanaPanel;

    if (
        ventanaAnterior &&
        ventanaAnterior !== ventanaActual
    ) {
        descartarTodosLosBorradores();

        if (
            ventanaAnterior === "fichas" ||
            ventanaAnterior === "fichas-contextual"
        ) {
            menuSeleccionado = null;
            nombreMenuSeleccionado = "";
        }
    }

    try {
        const respuesta = await fetch(`ventanas/${nombre}.html`);

        if (!esCargaActual()) return;

        if (!respuesta.ok) {
            throw new Error(
                "No se encontró la ventana: " + nombre
            );
        }

        const html = await respuesta.text();

        if (!esCargaActual()) return;

        contenedorPanel.innerHTML = html;

        window.__ultimaVentanaPanel = ventanaActual;

        tituloVentana.textContent =
            nombre.charAt(0).toUpperCase() + nombre.slice(1);

        console.log("Ventana cargada:", nombre);

        await cargarScriptVentana(nombre);

        // Otra navegación pudo empezar mientras cargábamos el script.
        if (!esCargaActual()) return;

        const aplicarPermisosConsulta = () => {
            if (
                window.Permisos &&
                window.usuarioActual?.rol === "consulta"
            ) {
                window.Permisos.ocultarBotonesEdicion();
            }
        };

        if (nombre === "menus") {
            await cargarMenus();
            if (!esCargaActual()) return;

            await cargarSelectPlantillas();
            if (!esCargaActual()) return;

            aplicarPermisosConsulta();
        }

        if (nombre === "fichas") {
            if (!mantenerMenu) {
                menuSeleccionado = null;
                nombreMenuSeleccionado = "";
            }

            await cargarFichas();

            if (!esCargaActual()) return;

            aplicarPermisosConsulta();
        }

        if (nombre === "multimedia") {
            if (!mantenerMenu) {
                fichaSeleccionada = null;
                nombreFichaSeleccionada = "";
            }

            // Esperar la carga y evitar que quede ejecutándose
            // después de abandonar esta ventana.
            await cargarMultimedia();

            if (!esCargaActual()) return;

            aplicarPermisosConsulta();
        }

        if (nombre === "etiquetas") {
            iniciarEtiquetas();

            if (!esCargaActual()) return;

            aplicarPermisosConsulta();
        }

        if (nombre === "plantillas") {
            iniciarPlantillas();

            if (!esCargaActual()) return;

            await cargarPlantillas();

            if (!esCargaActual()) return;

            aplicarPermisosConsulta();
        }

        if (nombre === "dashboard") {
            await cargarDashboard();

            if (!esCargaActual()) return;

            aplicarPermisosConsulta();
        }

        if (nombre === "usuarios") {
            if (typeof iniciarUsuarios === "function") {
                iniciarUsuarios();
            }

            if (!esCargaActual()) return;

            await cargarUsuarios();

            if (!esCargaActual()) return;

            aplicarPermisosConsulta();
        }

        if (nombre === "configuracion") {
            iniciarConfiguracion();
        }

        if (!esCargaActual()) return;

        actualizarIconos();
        activarAccesosRapidos();

    } catch (error) {
        // No mostrar errores de navegaciones que ya quedaron obsoletas.
        if (!esCargaActual()) return;

        console.error("Error cargando ventana:", error);

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

    const usuarioCargado = await cargarUsuarioActual();

    if (!usuarioCargado) {
        if (window.authRedirigiendoLogin) {
            return;
        }

        const errorAuth = window.errorInicializacionAuth;
        const estado = errorAuth?.status;

        if (estado === 403) {
            window.alert(
                errorAuth?.mensaje ||
                "Tu cuenta no tiene permiso para acceder al panel."
            );
            return;
        }

        const reintentar = window.confirm(
            (errorAuth?.mensaje ||
                "No se pudo verificar tu sesión por un problema de conexión.") +
            "\n¿Querés volver a intentar?"
        );

        if (reintentar) {
            window.location.reload();
        }

        return;
    }

    await cargarScriptVentana("borradores");

    await cargarScriptVentana("configuracion");

    if (window.usuarioActual?.rol === "admin") {
        await aplicarConfiguracionAdminGuardada();
    }

    activarNavegacion();

    cargarVentana("dashboard");

    console.log(
        "Panel Administrativo iniciado correctamente."
    );

}


/* =========================================================
   EVITAR CIERRE DE MODALES AL SELECCIONAR TEXTO
========================================================= */

let seleccionTextoDesdeCampo = false;
let soltoSobreFondoModal = false;

document.addEventListener("mousedown", function (evento) {
    const objetivo = evento.target;

    seleccionTextoDesdeCampo =
        objetivo instanceof Element &&
        objetivo.matches(
            'input:not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]'
        );

    soltoSobreFondoModal = false;
}, true);

document.addEventListener("mouseup", function (evento) {
    if (!seleccionTextoDesdeCampo) {
        return;
    }

    const objetivo = evento.target;

    if (
        objetivo instanceof Element &&
        objetivo.matches(
            '.modal, .modal-plantilla, .modal-multimedia, [id^="modal"], #ventanaEmergente'
        )
    ) {
        soltoSobreFondoModal = true;
    }
}, true);

document.addEventListener("click", function (evento) {
    if (!soltoSobreFondoModal) {
        seleccionTextoDesdeCampo = false;
        return;
    }

    const objetivo = evento.target;

    if (
        objetivo instanceof Element &&
        objetivo.matches(
            '.modal, .modal-plantilla, .modal-multimedia, [id^="modal"], #ventanaEmergente'
        )
    ) {
        evento.preventDefault();
        evento.stopPropagation();
        evento.stopImmediatePropagation();
    }

    seleccionTextoDesdeCampo = false;
    soltoSobreFondoModal = false;
}, true);


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

async function cargarUsuarioActual() {
    try {
        console.log("Cargando usuario actual...");

        // Reutilizar el perfil verificado durante la inicializacion.
        const usuario = await window.supabaseAuthReady;

        if (!usuario || usuario.__errorInicializacionAuth) {
            return false;
        }

        window.usuarioActual = usuario;

        console.log("USUARIO SQL:", usuario);
        console.log("ROL:", usuario.rol);

        // Aplicar permisos sin modificar la logica existente.
        if (window.Permisos) {
            window.Permisos.ocultarSecciones();
        }

        console.log("Permisos aplicados");

        const nombre = document.getElementById("nombreUsuario");

        if (nombre) {
            nombre.textContent = usuario.nombre;
        }

        return true;

    } catch (error) {
        console.error("ERROR USUARIO:", error);

        window.errorInicializacionAuth = window.errorInicializacionAuth || {
            status: null,
            mensaje: "No se pudo verificar la sesion. Intenta nuevamente."
        };

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





async function confirmarCerrarSesion() {
    if (window.Borradores) {
        ["menus", "fichas"].forEach(tipo => {
            const borradores = window.Borradores.obtenerTodos(tipo);

            borradores.forEach(borrador => {
                window.Borradores.eliminar(tipo, borrador.idRegistro);
            });
        });
    }

    await window.cerrarSesionSupabase();
    window.location.href = "index.html";
}




function activarAccesosRapidos() {
    const accesos = document.querySelectorAll(
        ".acceso-dashboard"
    );

    accesos.forEach(acceso => {
        // Evitar registrar el mismo evento dos veces
        // sobre un mismo elemento.
        if (acceso.dataset.navegacionRegistrada === "true") {
            return;
        }

        acceso.dataset.navegacionRegistrada = "true";

        acceso.addEventListener("click", () => {
            const ventana = acceso.dataset.acceso;

            if (!ventana) return;

            const botonSidebar = document.querySelector(
                `.sidebar .item[data-ventana="${ventana}"]`
            );

            document.querySelectorAll(".sidebar .item")
                .forEach(item => {
                    item.classList.remove("activo");
                });

            if (botonSidebar) {
                botonSidebar.classList.add("activo");
            }

            cargarVentana(ventana);
        });
    });
}

iniciarPanel();
