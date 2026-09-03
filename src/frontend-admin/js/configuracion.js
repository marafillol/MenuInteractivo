// =========================================================
// CONFIGURACIÓN GENERAL
// Museo Malvinas
//
// Esta configuración maneja solamente:
// • Orientación del tótem
// • Presentación del contenido
// =========================================================


async function leerRespuestaConfiguracion(respuesta){

    const contenido = await respuesta.text();

    try{

        return JSON.parse(contenido);

    }catch(error){

        throw new Error(
            "La configuración no recibió una respuesta válida del servidor. Recargá la página e iniciá nuevamente la aplicación."
        );

    }

}


// =========================================================
// CONFIGURACIÓN DEL VISITANTE
// =========================================================

async function cargarConfiguracionEstilo(){

    const respuesta = await window.fetchProtegido(
        "/api/configuracion/estilo-visitante"
    );

    const configuracion =
        await leerRespuestaConfiguracion(respuesta);

    if(!respuesta.ok){

        throw new Error(
            configuracion.error ||
            "No se pudo cargar la configuración."
        );

    }


    // -----------------------------------------------------
    // PRESENTACIÓN DEL CONTENIDO
    // -----------------------------------------------------

    const densidad =
        document.getElementById(
            "densidadTarjetasConfiguracion"
        );

    if(densidad){

        densidad.value =
            configuracion.densidadTarjetas ||
            "normal";

    }


    // -----------------------------------------------------
    // ORIENTACIÓN DEL TÓTEM
    // -----------------------------------------------------

    const selectTotem =
        document.getElementById(
            "orientacionTotemConfiguracion"
        );

    if(selectTotem){

        selectTotem.value =
            configuracion.orientacionTotem ||
            localStorage.getItem("totemMode") ||
            "horizontal";

    }

}


// =========================================================
// MENSAJE DE CONFIGURACIÓN
// =========================================================

function mostrarMensajeConfiguracion(
    mensaje,
    esError = false
){

    const elemento =
        document.getElementById(
            "mensajeConfiguracion"
        );

    if(!elemento){

        return;

    }

    elemento.textContent = mensaje;

    elemento.style.color =
        esError
            ? "#8b3a3a"
            : "#163A61";

}


// =========================================================
// GUARDAR CONFIGURACIÓN DEL VISITANTE
// =========================================================

async function guardarConfiguracionEstilo(evento){

    evento.preventDefault();


    // -----------------------------------------------------
    // ORIENTACIÓN DEL TÓTEM
    // -----------------------------------------------------

    const selectTotem =
        document.getElementById(
            "orientacionTotemConfiguracion"
        );

    const orientacionTotem =
        selectTotem
            ? selectTotem.value
            : "horizontal";


    // Guardamos también localmente para que
    // el tótem pueda reaccionar inmediatamente.

    localStorage.setItem(
        "totemMode",
        orientacionTotem
    );


    // -----------------------------------------------------
    // PRESENTACIÓN DEL CONTENIDO
    // -----------------------------------------------------

    const densidad =
        document.getElementById(
            "densidadTarjetasConfiguracion"
        );


    const configuracion = {

        orientacionTotem:

            orientacionTotem,

        densidadTarjetas:

            densidad
                ? densidad.value
                : "normal"

    };


    try{

        const respuesta =
            await window.fetchProtegido(
                "/api/configuracion/estilo-visitante",
                {
                    method:"PUT",

                    headers:{
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            configuracion
                        )
                }
            );


        const resultado =
            await leerRespuestaConfiguracion(
                respuesta
            );


        if(!respuesta.ok){

            throw new Error(
                resultado.error ||
                "No se pudo guardar la configuración."
            );

        }


        mostrarMensajeConfiguracion(
            "Configuración guardada correctamente."
        );


    }catch(error){

        mostrarMensajeConfiguracion(
            error.message,
            true
        );

    }

}


// =========================================================
// CONFIGURACIÓN DEL ADMIN
// =========================================================
//
// Se mantiene solamente la configuración necesaria para
// la presentación del contenido.
//
// Ya NO se manejan:
// • colores
// • fondos
// • fuentes
// • apariencia visual
// =========================================================

async function cargarConfiguracionAdmin(){

    const respuesta =
        await window.fetchProtegido(
            "/api/configuracion/estilo-admin"
        );


    const configuracion =
        await leerRespuestaConfiguracion(
            respuesta
        );


    if(!respuesta.ok){

        throw new Error(
            configuracion.error ||
            "No se pudo cargar la configuración del panel."
        );

    }


    const densidad =
        document.getElementById(
            "densidadAdminConfiguracion"
        );


    if(densidad){

        densidad.value =
            configuracion.densidad ||
            "normal";

    }

}


// =========================================================
// MENSAJE CONFIGURACIÓN ADMIN
// =========================================================

function mostrarMensajeConfiguracionAdmin(
    mensaje,
    esError = false
){

    const elemento =
        document.getElementById(
            "mensajeConfiguracionAdmin"
        );


    if(!elemento){

        return;

    }


    elemento.textContent =
        mensaje;


    elemento.style.color =
        esError
            ? "#8b3a3a"
            : "#163A61";

}


// =========================================================
// GUARDAR CONFIGURACIÓN ADMIN
// =========================================================

async function guardarConfiguracionAdmin(evento){

    evento.preventDefault();


    const densidad =
        document.getElementById(
            "densidadAdminConfiguracion"
        );


    const configuracion = {

        densidad:
            densidad
                ? densidad.value
                : "normal"

    };


    try{

        const respuesta =
            await window.fetchProtegido(
                "/api/configuracion/estilo-admin",
                {
                    method:"PUT",

                    headers:{
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            configuracion
                        )
                }
            );


        const resultado =
            await leerRespuestaConfiguracion(
                respuesta
            );


        if(!respuesta.ok){

            throw new Error(
                resultado.error ||
                "No se pudo guardar la configuración."
            );

        }


        mostrarMensajeConfiguracionAdmin(
            "Configuración guardada correctamente."
        );


    }catch(error){

        mostrarMensajeConfiguracionAdmin(
            error.message,
            true
        );

    }

}


// =========================================================
// APLICAR CONFIGURACIÓN ADMIN GUARDADA
// =========================================================
//
// Ya no aplica colores ni estilos visuales.
// Solamente queda disponible para cargar la
// configuración guardada si otro archivo la necesita.
// =========================================================

async function aplicarConfiguracionAdminGuardada(){

    try{

        const respuesta =
            await window.fetchProtegido(
                "/api/configuracion/estilo-admin"
            );


        const configuracion =
            await leerRespuestaConfiguracion(
                respuesta
            );


        if(!respuesta.ok){

            return;

        }


        // La configuración queda disponible
        // sin modificar visualmente el panel.

        return configuracion;


    }catch(error){

        console.warn(
            "No se pudo cargar la configuración del panel."
        );

    }

}


window.aplicarConfiguracionAdminGuardada =
    aplicarConfiguracionAdminGuardada;


// =========================================================
// INICIAR CONFIGURACIÓN
// =========================================================

function iniciarConfiguracion(){

    const formulario =
        document.getElementById(
            "formularioEstiloVisitante"
        );


    const formularioAdmin =
        document.getElementById(
            "formularioEstiloAdmin"
        );


    // -----------------------------------------------------
    // VISITANTE
    // -----------------------------------------------------

    if(formulario){

        formulario.addEventListener(
            "submit",
            guardarConfiguracionEstilo
        );


        cargarConfiguracionEstilo()
            .catch(
                error =>
                    mostrarMensajeConfiguracion(
                        error.message,
                        true
                    )
            );

    }


    // -----------------------------------------------------
    // ADMIN
    // -----------------------------------------------------

    if(formularioAdmin){

        formularioAdmin.addEventListener(
            "submit",
            guardarConfiguracionAdmin
        );


        cargarConfiguracionAdmin()
            .catch(
                error =>
                    mostrarMensajeConfiguracionAdmin(
                        error.message,
                        true
                    )
            );

    }

}