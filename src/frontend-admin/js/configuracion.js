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

async function cargarConfiguracionEstilo(){

    const respuesta = await window.fetchProtegido(
        "/api/configuracion/estilo-visitante"
    );

    const estilo = await leerRespuestaConfiguracion(respuesta);

    if(!respuesta.ok){
        throw new Error(estilo.error || "No se pudo cargar la configuracion.");
    }

    document.getElementById("fondoConfiguracionVisitante").value = estilo.fondo;
    document.getElementById("imagenFondoConfiguracion").value = estilo.imagenFondo || "";
    document.getElementById("colorPrimarioConfiguracion").value = estilo.colorPrimario;
    document.getElementById("colorAcentoConfiguracion").value = estilo.colorAcento;
    document.getElementById("colorFondoConfiguracion").value = estilo.colorFondo;
    document.getElementById("mostrarBuscadorConfiguracion").checked = estilo.mostrarBuscador !== false;
    document.getElementById("densidadTarjetasConfiguracion").value = estilo.densidadTarjetas || "normal";
    
    // NUEVO: Cargar la orientación del tótem (prioriza la API, respaldado por localStorage)
    const selectTotem = document.getElementById("orientacionTotemConfiguracion");
    if(selectTotem){
        selectTotem.value = estilo.orientacionTotem || localStorage.getItem("totemMode") || "horizontal";
    }

}

function mostrarMensajeConfiguracion(mensaje, esError = false){

    const elemento = document.getElementById("mensajeConfiguracion");

    elemento.textContent = mensaje;
    elemento.style.color = esError ? "#8b3a3a" : "#163A61";

}

async function guardarConfiguracionEstilo(evento){

    evento.preventDefault();

    const selectTotem = document.getElementById("orientacionTotemConfiguracion");
    const orientacionTotem = selectTotem ? selectTotem.value : "horizontal";

    // NUEVO: Guardar en localStorage para que el tótem local reaccione al instante
    localStorage.setItem("totemMode", orientacionTotem);

    const estilo = {
        fondo: document.getElementById("fondoConfiguracionVisitante").value,
        imagenFondo: document.getElementById("imagenFondoConfiguracion").value,
        colorPrimario: document.getElementById("colorPrimarioConfiguracion").value,
        colorAcento: document.getElementById("colorAcentoConfiguracion").value,
        colorFondo: document.getElementById("colorFondoConfiguracion").value,
        mostrarBuscador: document.getElementById("mostrarBuscadorConfiguracion").checked,
        densidadTarjetas: document.getElementById("densidadTarjetasConfiguracion").value,
        orientacionTotem: orientacionTotem // NUEVO: Enviado al backend
    };

    try{

        const respuesta = await window.fetchProtegido(
            "/api/configuracion/estilo-visitante",
            {
                method:"PUT",
                headers:{ "Content-Type":"application/json" },
                body:JSON.stringify(estilo)
            }
        );

        const resultado = await leerRespuestaConfiguracion(respuesta);

        if(!respuesta.ok){
            throw new Error(resultado.error || "No se pudo guardar el estilo.");
        }

        mostrarMensajeConfiguracion("Estilo y orientación del tótem guardados correctamente.");

    }catch(error){
        mostrarMensajeConfiguracion(error.message, true);
    }

}

function aplicarEstiloAdmin(estilo){

    const panel = document.querySelector(".panel-admin");

    if(!panel){
        return;
    }

    panel.classList.add("tema-admin-personalizado");
    panel.classList.toggle("admin-compacto", estilo.densidad === "compacta");
    panel.style.setProperty("--admin-primario", estilo.colorPrincipal || "#163A61");
    panel.style.setProperty("--admin-acento", estilo.colorAcento || "#DBB060");
    panel.style.setProperty("--admin-fondo", estilo.colorFondo || "#F4EDDB");

}

async function cargarConfiguracionAdmin(){

    const respuesta = await window.fetchProtegido("/api/configuracion/estilo-admin");
    const estilo = await leerRespuestaConfiguracion(respuesta);

    if(!respuesta.ok){
        throw new Error(estilo.error || "No se pudo cargar la configuracion del panel.");
    }

    document.getElementById("colorPrincipalAdmin").value = estilo.colorPrincipal;
    document.getElementById("colorAcentoAdmin").value = estilo.colorAcento;
    document.getElementById("colorFondoAdmin").value = estilo.colorFondo;
    document.getElementById("densidadAdminConfiguracion").value = estilo.densidad || "normal";

}

function mostrarMensajeConfiguracionAdmin(mensaje, esError = false){

    const elemento = document.getElementById("mensajeConfiguracionAdmin");
    elemento.textContent = mensaje;
    elemento.style.color = esError ? "#8b3a3a" : "#163A61";

}

async function guardarConfiguracionAdmin(evento){

    evento.preventDefault();

    const estilo = {
        colorPrincipal:document.getElementById("colorPrincipalAdmin").value,
        colorAcento:document.getElementById("colorAcentoAdmin").value,
        colorFondo:document.getElementById("colorFondoAdmin").value,
        densidad:document.getElementById("densidadAdminConfiguracion").value
    };

    try{
        const respuesta = await window.fetchProtegido("/api/configuracion/estilo-admin", {
            method:"PUT",
            headers:{ "Content-Type":"application/json" },
            body:JSON.stringify(estilo)
        });

        const resultado = await leerRespuestaConfiguracion(respuesta);

        if(!respuesta.ok){
            throw new Error(resultado.error || "No se pudo guardar el estilo del panel.");
        }

        aplicarEstiloAdmin(resultado);
        mostrarMensajeConfiguracionAdmin("Estilo del panel guardado correctamente.");
    }catch(error){
        mostrarMensajeConfiguracionAdmin(error.message, true);
    }

}

async function aplicarConfiguracionAdminGuardada(){

    try{
        const respuesta = await window.fetchProtegido("/api/configuracion/estilo-admin");
        const estilo = await leerRespuestaConfiguracion(respuesta);

        if(respuesta.ok){
            aplicarEstiloAdmin(estilo);
        }
    }catch(error){
        console.warn("No se pudo aplicar la configuracion visual del panel.");
    }

}

window.aplicarConfiguracionAdminGuardada = aplicarConfiguracionAdminGuardada;

function iniciarConfiguracion(){

    const formulario = document.getElementById("formularioEstiloVisitante");
    const formularioAdmin = document.getElementById("formularioEstiloAdmin");

    if(!formulario || !formularioAdmin){
        return;
    }

    formulario.addEventListener("submit", guardarConfiguracionEstilo);
    formularioAdmin.addEventListener("submit", guardarConfiguracionAdmin);

    cargarConfiguracionEstilo()
        .catch(error=>mostrarMensajeConfiguracion(error.message, true));

    cargarConfiguracionAdmin()
        .catch(error=>mostrarMensajeConfiguracionAdmin(error.message, true));

}