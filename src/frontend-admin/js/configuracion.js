// =========================================================
// CONFIGURACIÓN GENERAL
// Museo Malvinas
//
// Esta configuración maneja solamente:
// • Orientación del tótem
// • Tiempo de inactividad
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


    // -----------------------------------------------------
    // TIEMPO DE INACTIVIDAD (segundos, 0 = desactivado)
    // -----------------------------------------------------

    const inputInactividad =
        document.getElementById(
            "tiempoInactividadConfiguracion"
        );

    if(inputInactividad){

        inputInactividad.value =
            configuracion.tiempoInactividad ?? 0;

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


    // -----------------------------------------------------
    // TIEMPO DE INACTIVIDAD (segundos, 0 = desactivado)
    // -----------------------------------------------------

    const inputInactividad =
        document.getElementById(
            "tiempoInactividadConfiguracion"
        );

    let tiempoInactividad = 0;

    if(inputInactividad){

        tiempoInactividad =
            Math.floor(
                Number(inputInactividad.value) || 0
            );

        if(
            tiempoInactividad < 0 ||
            (tiempoInactividad > 0 && tiempoInactividad < 10)
        ){

            mostrarMensajeConfiguracion(
                "El tiempo de inactividad debe ser 0 (desactivado) o de al menos 10 segundos.",
                true
            );

            return;

        }

    }


    // Guardamos también localmente para que
    // el tótem pueda reaccionar inmediatamente.

    localStorage.setItem(
        "totemMode",
        orientacionTotem
    );


    const configuracion = {

        orientacionTotem:

            orientacionTotem,

        // Solo se envía si el campo existe en el formulario
        ...(inputInactividad
            ? { tiempoInactividad: tiempoInactividad }
            : {})

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
// COPIA DE SEGURIDAD (base de datos + almacenamiento, en .zip)
// =========================================================

function mostrarMensajeCopiaSeguridad(
    mensaje,
    esError = false
){

    const elemento =
        document.getElementById(
            "mensajeCopiaSeguridad"
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


async function descargarCopiaSeguridad(){

    const boton =
        document.getElementById(
            "btnCopiaSeguridad"
        );

    if(!boton || boton.disabled){

        return;

    }

    boton.disabled = true;

    mostrarMensajeConfiguracion("");

    mostrarMensajeCopiaSeguridad(
        "Generando la copia de seguridad, esto puede tardar varios minutos..."
    );


    try{

        const respuesta =
            await window.fetchProtegido(
                "/api/configuracion/copia-seguridad"
            );


        if(!respuesta.ok){

            let detalle = "";

            try{

                const datos =
                    await respuesta.json();

                detalle =
                    datos.error || "";

            }catch(e){

                // la respuesta de error no era JSON

            }

            throw new Error(
                detalle ||
                "No se pudo generar la copia de seguridad."
            );

        }


        const blob =
            await respuesta.blob();


        const fecha =
            new Date()
                .toISOString()
                .slice(0, 10);

        const enlace =
            document.createElement("a");

        enlace.href =
            URL.createObjectURL(blob);

        enlace.download =
            `copia-seguridad-${fecha}.zip`;

        document.body.appendChild(enlace);

        enlace.click();

        enlace.remove();

        setTimeout(
            () => URL.revokeObjectURL(enlace.href),
            60000
        );


        mostrarMensajeCopiaSeguridad(
            "Copia de seguridad descargada correctamente."
        );

    }catch(error){

        mostrarMensajeCopiaSeguridad(
            error.message,
            true
        );

    }finally{

        boton.disabled = false;

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
    // COPIA DE SEGURIDAD
    // -----------------------------------------------------

    const botonCopia =
        document.getElementById(
            "btnCopiaSeguridad"
        );

    if(botonCopia){

        botonCopia.addEventListener(
            "click",
            descargarCopiaSeguridad
        );

    }

}