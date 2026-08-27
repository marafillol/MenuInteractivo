console.log("Modulo multimedia cargado");

let multimediaEditando = null;
let multimediaEliminar = null;

async function cargarMultimedia(){

    const panel =
        document.getElementById("panelFichaMultimedia");

    const vistaGeneral =
        document.getElementById("vistaGeneralMultimedia");

    const cabeceraGeneral =
        document.getElementById("cabeceraMultimediaGeneral");

    const cabeceraFicha =
        document.getElementById("cabeceraMultimediaFicha");

    const botonNuevo =
        document.getElementById("nuevoMultimedia");

    const titulo =
        document.getElementById("tituloMultimedia");

    const subtitulo =
        document.getElementById("subtituloMultimedia");


    try{

        let url = "/api/multimedia";


        /* =================================================
           MULTIMEDIA ASOCIADA A UNA FICHA
        ================================================= */

        if(fichaSeleccionada){

            url = `/api/multimedia/ficha/${fichaSeleccionada}`;

            /* ==========================================
               MOSTRAR CABECERA DE LA FICHA
            ========================================== */

            panel.style.display = "block";

            vistaGeneral.style.display = "none";

            cabeceraGeneral.style.display = "none";

            cabeceraFicha.style.display = "flex";

            botonNuevo.style.display = "none";

            const botonNuevoFicha =
                document.getElementById("nuevoMultimediaFicha");

            if(botonNuevoFicha){
                botonNuevoFicha.style.display = "inline-flex";
            }


            /* ==========================================
               OBTENER NOMBRE DE LA FICHA
            ========================================== */

            try{

                const respuestaFicha =
                    await window.fetchProtegido(
                        `/api/fichas/${fichaSeleccionada}`
                    );

                const ficha =
                    await respuestaFicha.json();


                const tituloFicha =
                    document.getElementById(
                        "tituloFichaMultimedia"
                    );

                const nombreFicha =
                    document.getElementById(
                        "nombreFichaMultimedia"
                    );


                if(tituloFicha){

                    tituloFicha.textContent =
                        "Multimedia asociada a la ficha";

                }


                if(nombreFicha){

                    nombreFicha.textContent =
                        ficha.titulo || "Ficha sin nombre";

                }


            }catch(error){

                console.error(
                    "Error obteniendo nombre de la ficha:",
                    error
                );

            }

        }


        /* =================================================
           MULTIMEDIA GENERAL
        ================================================= */

        else{

            const botonNuevoFicha =
                document.getElementById("nuevoMultimediaFicha");

            if(botonNuevoFicha){
                botonNuevoFicha.style.display = "none";
            }

            panel.style.display = "none";

            vistaGeneral.style.display = "block";

            cabeceraGeneral.style.display = "flex";

            cabeceraFicha.style.display = "none";

            botonNuevo.style.display = "inline-flex";


            titulo.textContent =
                "Gestión de Multimedia";





            document.getElementById(
                "listaMultimedia"
            ).innerHTML = "";

        }


        /* =================================================
           CONSULTAR MULTIMEDIA
        ================================================= */

        console.log(
            "Consultando:",
            url
        );


        const respuesta =
            await window.fetchProtegido(url);


        if(!respuesta.ok){

            throw new Error(
                `Error HTTP ${respuesta.status}`
            );

        }


        const multimedia =
            await respuesta.json();


        console.log(
            "Multimedia recibida:",
            multimedia
        );


        const esConsulta =
            window.usuarioActual?.rol === "consulta";


        /* =================================================
           ELEGIR CONTENEDOR
        ================================================= */

        let contenedor;


        if(fichaSeleccionada){

            contenedor =
                document.getElementById(
                    "listaMultimedia"
                );

        }else{

            contenedor =
                document.getElementById(
                    "listaMultimediaGeneral"
                );

        }


        if(!contenedor){

            console.error(
                "No existe el contenedor de multimedia"
            );

            return;

        }


        contenedor.innerHTML = "";


        /* =================================================
           SIN MULTIMEDIA
        ================================================= */

        if(!Array.isArray(multimedia) || multimedia.length === 0){

            contenedor.innerHTML = `

                <div class="sin-multimedia">

                    <span class="sin-multimedia-icono">

                        <i
                            data-lucide="images"
                            aria-hidden="true">
                        </i>

                    </span>


                    <div>

                        <strong>
                            No hay multimedia asociada
                        </strong>

                        <p>
                            Esta ficha todavía no tiene
                            archivos multimedia asociados.
                        </p>

                    </div>

                </div>

            `;


            if(window.lucide){

                window.lucide.createIcons();

            }


            return;

        }


        /* =================================================
           CREAR TARJETAS
        ================================================= */

        multimedia.forEach(item => {

            let vista = "";


            /* ---------------------------------------------
               IMAGEN
            --------------------------------------------- */

            if(item.tipo_multi === "imagen"){

                vista = `

                    <img
                        src="/${item.ruta_archivo}"
                        class="thumb-multi"
                        onerror="
                            this.src='/imagenes/default.png'
                        ">

                `;

            }


            /* ---------------------------------------------
               VIDEO
            --------------------------------------------- */

            else if(item.tipo_multi === "video"){

                vista = `

                    <video
                        class="thumb-multi"
                        muted
                        preload="metadata">

                        <source
                            src="/${item.ruta_archivo}"
                            type="video/mp4">

                    </video>

                `;

            }


            /* ---------------------------------------------
               AUDIO
            --------------------------------------------- */

            else if(item.tipo_multi === "audio"){

                vista = `

                    <div class="thumb-audio">

                        <i
                            data-lucide="music"
                            aria-hidden="true">
                        </i>

                    </div>

                `;

            }


            /* ---------------------------------------------
               PDF
            --------------------------------------------- */

            else{

                vista = `

                    <div class="thumb-pdf">

                        <i
                            data-lucide="file-text"
                            aria-hidden="true">
                        </i>

                    </div>

                `;

            }


            const iconosPorTipo = {

                imagen: "image",
                video: "video",
                audio: "music",
                pdf: "file-text"

            };


            const icono =
                iconosPorTipo[item.tipo_multi] ||
                "folder";


            /* ---------------------------------------------
               TARJETA
            --------------------------------------------- */

            contenedor.innerHTML += `

                <article class="tarjeta-multimedia">


                    <div class="multimedia-preview">

                        ${vista}

                    </div>


                    <div class="info-multimedia">


                        <div class="encabezado-multimedia">


                            <span class="icono-multimedia">

                                <i
                                    data-lucide="${icono}"
                                    aria-hidden="true">
                                </i>

                            </span>


                            <div>

                                <h3 class="titulo-multimedia">

                                    ${
                                        item.tipo_multi
                                            .charAt(0)
                                            .toUpperCase()
                                        +
                                        item.tipo_multi.slice(1)
                                    }

                                </h3>


                                <small class="descripcion-tipo">

                                    ${
                                        item.descripcion ||
                                        "Sin descripción"
                                    }

                                </small>

                            </div>


                        </div>


                        <div class="datos-multimedia">


                            <small>

                                <i
                                    data-lucide="folder"
                                    aria-hidden="true">
                                </i>

                                Ficha #${item.id_ficha}

                            </small>


                            <small>

                                <i
                                    data-lucide="calendar"
                                    aria-hidden="true">
                                </i>

                                ${item.creado || "-"}

                            </small>


                        </div>


                        <div class="acciones-multimedia">


                            <button
                                class="btn-vista"
                                onclick="
                                    vistaPreviaMultimedia(
                                        ${item.id_multi}
                                    )
                                ">

                                Vista previa

                            </button>


                            ${!esConsulta ? `

                                <button
                                    class="btn-editar"
                                    onclick="
                                        editarMultimedia(
                                            ${item.id_multi}
                                        )
                                    ">

                                    Editar

                                </button>


                                <button
                                    class="btn-eliminar"
                                    onclick="
                                        eliminarMultimedia(
                                            ${item.id_multi}
                                        )
                                    ">

                                    Eliminar

                                </button>

                            ` : ""}


                        </div>


                    </div>


                </article>

            `;

        });


        /* =================================================
           ICONOS
        ================================================= */

        if(window.lucide){

            window.lucide.createIcons();

        }


    }catch(error){

        console.error(
            "Error cargando multimedia:",
            error
        );

    }

}

// ===================================
// VISTA PREVIA MULTIMEDIA
// ===================================

async function vistaPreviaMultimedia(id_multi) {

    try {

        const respuesta =
            await window.fetchProtegido(
                `/api/multimedia/${id_multi}`
            );

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const item = await respuesta.json();

        if (!item) {

            alert("No se encontró el archivo.");
            return;

        }


        /* =================================================
           RUTA
        ================================================= */

        const ruta =
            "/" + item.ruta_archivo.replace("public/", "");


        /* =================================================
           VISOR DEL ARCHIVO
        ================================================= */

        let visor = "";


        switch (item.tipo_multi) {


            /* ---------------------------------------------
               IMAGEN
            --------------------------------------------- */

            case "imagen":

                visor = `
                    <img
                        src="${ruta}"
                        class="preview-imagen-multi"
                        alt="Imagen multimedia"
                        onerror="this.src='/imagenes/default.png'">
                `;

                break;


            /* ---------------------------------------------
               VIDEO
            --------------------------------------------- */

            case "video":

                visor = `
                    <video
                        controls
                        preload="metadata"
                        class="preview-video-multi">

                        <source src="${ruta}">

                        Tu navegador no soporta video.

                    </video>
                `;

                break;


            /* ---------------------------------------------
               AUDIO
            --------------------------------------------- */

            case "audio":

                visor = `
                    <div class="preview-audio-contenedor">

                        <div class="preview-audio-icono">

                            <i
                                data-lucide="music"
                                aria-hidden="true">
                            </i>

                        </div>

                        <audio
                            controls
                            class="preview-audio-multi">

                            <source src="${ruta}">

                            Tu navegador no soporta audio.

                        </audio>

                    </div>
                `;

                break;


            /* ---------------------------------------------
               PDF
            --------------------------------------------- */

            case "pdf":

                visor = `
                    <div class="preview-pdf-contenedor">

                        <iframe
                            src="${ruta}"
                            class="preview-pdf-multi">
                        </iframe>

                    </div>
                `;

                break;


            /* ---------------------------------------------
               OTRO
            --------------------------------------------- */

            default:

                visor = `
                    <div class="preview-archivo-generico">

                        <i
                            data-lucide="file"
                            aria-hidden="true">
                        </i>

                        <span>
                            Archivo multimedia
                        </span>

                    </div>
                `;

        }


        /* =================================================
           CONTENIDO COMPLETO DEL MODAL
        ================================================= */

        document.getElementById(
            "contenidoVistaMultimedia"
        ).innerHTML = `


            <div class="vista-previa-multimedia-panel">


                <!-- =================================================
                     DOCUMENTO / ARCHIVO
                ================================================= -->

                <section class="visor-multimedia-panel">


                    <div class="titulo-visor-multimedia">

                        <span>
                            ${item.tipo_multi.toUpperCase()}
                        </span>

                    </div>


                    <div class="visor-contenido-multimedia">

                        ${visor}

                    </div>


                </section>



                <!-- =================================================
                     DATOS
                ================================================= -->

                <section class="informacion-multimedia-panel">


                    <div class="titulo-informacion-multimedia">

                        <div class="icono-info-multimedia">

                            <i
                                data-lucide="file-text"
                                aria-hidden="true">
                            </i>

                        </div>

                        <div>

                            <span>
                                INFORMACIÓN
                            </span>

                            <h3>
                                Datos del archivo
                            </h3>

                        </div>

                    </div>


                    <div class="datos-multimedia-grid">


                        <div class="dato-multimedia">

                            <span>
                                ID Multimedia
                            </span>

                            <strong>
                                ${item.id_multi}
                            </strong>

                        </div>


                        <div class="dato-multimedia">

                            <span>
                                Ficha asociada
                            </span>

                            <strong>
                                Ficha #${item.id_ficha}
                            </strong>

                        </div>


                        <div class="dato-multimedia">

                            <span>
                                Tipo
                            </span>

                            <strong>
                                ${
                                    item.tipo_multi
                                        .charAt(0)
                                        .toUpperCase()
                                    +
                                    item.tipo_multi.slice(1)
                                }
                            </strong>

                        </div>


                        <div class="dato-multimedia dato-descripcion">

                            <span>
                                Descripción
                            </span>

                            <strong>
                                ${item.descripcion || "Sin descripción"}
                            </strong>

                        </div>


                        <div class="dato-multimedia">

                            <span>
                                Estado
                            </span>

                            <strong>
                                ${item.activo == 1
                                    ? "Activo"
                                    : "Inactivo"}
                            </strong>

                        </div>


                        <div class="dato-multimedia">

                            <span>
                                Creado
                            </span>

                            <strong>
                                ${item.creado || "-"}
                            </strong>

                        </div>


                        <div class="dato-multimedia">

                            <span>
                                Actualizado
                            </span>

                            <strong>
                                ${item.actualizado || "-"}
                            </strong>

                        </div>


                    </div>


                    <!-- UBICACIÓN -->

                    <div class="ruta-multimedia">

                        <span>
                            Ubicación del archivo
                        </span>

                        <code>
                            ${item.ruta_archivo}
                        </code>

                    </div>


                </section>


            </div>

        `;


        /* =================================================
           ICONOS
        ================================================= */

        if (window.lucide) {

            window.lucide.createIcons();

        }


        /* =================================================
           ABRIR MODAL
        ================================================= */

        document.getElementById(
            "modalVistaMultimedia"
        ).style.display = "flex";


    } catch (error) {

        console.error(
            "Error mostrando vista previa:",
            error
        );

    }

}

function cerrarVistaMultimedia(){

    const modal =
    document.getElementById("modalVistaMultimedia");

    // Detener videos
    modal.querySelectorAll("video").forEach(video=>{

        video.pause();
        video.currentTime = 0;

    });

    // Detener audios
    modal.querySelectorAll("audio").forEach(audio=>{

        audio.pause();
        audio.currentTime = 0;

    });

    // Vaciar el contenido para destruir el reproductor
    document.getElementById(
        "contenidoVistaMultimedia"
    ).innerHTML = "";

    modal.style.display = "none";

    const preview =
    document.getElementById("previewArchivoActual");

    if(preview){

        preview.style.display = "none";

        preview.innerHTML = "";

    }

}

function nuevoMultimedia() {

    const modal =
        document.getElementById("modalMultimediaNuevo");

    if (!modal) {
        console.error("No se encontró modalMultimediaNuevo");
        return;
    }

    // Estamos en multimedia general
    window.multimediaFichaActual = false;

    // Mostrar selector de ficha
    const contenedorFicha =
        document.getElementById("contenedorFichaMultimedia");

    if (contenedorFicha) {
        contenedorFicha.style.display = "block";
    }

    // Cargar fichas
    cargarFichasMultimedia();

    // Estado nuevo
    multimediaEditando = null;

    document.querySelector(
        "#modalMultimediaNuevo h3"
    ).textContent = "Nuevo archivo";

    modal.style.display = "flex";
}

async function cargarFichasMultimedia(){

    const respuesta=
    await window.fetchProtegido("/api/fichas");

    const fichas=
    await respuesta.json();

    const select=
    document.getElementById("multiFicha");

    select.innerHTML="";

    fichas.forEach(f=>{

        select.innerHTML += `

            <option value="${f.id_ficha}">

                ${f.titulo}

            </option>

        `;

    });

}



async function guardarMultimedia() {

    const archivoInput =
        document.getElementById("multiArchivo");

    const archivo =
        archivoInput?.files[0];


    // ==========================================
    // VALIDAR ARCHIVO
    // ==========================================

    if (!multimediaEditando && !archivo) {

        mostrarMensaje(
            "Campo obligatorio",
            "Debe seleccionar un archivo multimedia."
        );

        if (archivoInput) {
            archivoInput.focus();
        }

        return;
    }


    // ==========================================
    // DETERMINAR FICHA
    // ==========================================

    let idFicha;


    /*
     * Si estamos entrando desde una ficha,
     * usamos directamente fichaSeleccionada.
     */

    if (window.multimediaFichaActual) {

        idFicha = fichaSeleccionada;

    }

    /*
     * Si estamos en multimedia general,
     * usamos el selector.
     */

    else {

        const selectFicha =
            document.getElementById("multiFicha");

        idFicha =
            selectFicha?.value;

    }


    // ==========================================
    // VALIDAR FICHA
    // ==========================================

    if (!idFicha) {

        mostrarMensaje(
            "Ficha obligatoria",
            "Debe seleccionar una ficha para asociar el archivo."
        );

        return;
    }


    console.log(
        "Guardando multimedia:",
        {
            idFicha,
            fichaDesdeSeleccion: window.multimediaFichaActual,
            archivo: archivo?.name
        }
    );


    // ==========================================
    // CREAR FORM DATA
    // ==========================================

    const formulario =
        new FormData();


    formulario.append(
        "id_ficha",
        idFicha
    );


    formulario.append(
        "descripcion",
        document.getElementById(
            "multiDescripcion"
        ).value
    );


    formulario.append(
        "tipo_multi",
        document.getElementById(
            "multiTipo"
        ).value
    );


    formulario.append(
        "activo",
        document.getElementById(
            "multiActivo"
        ).checked
            ? 1
            : 0
    );


    if (archivo) {

        formulario.append(
            "archivo",
            archivo
        );

    }


    // ==========================================
    // URL Y MÉTODO
    // ==========================================

    const url =
        multimediaEditando
            ? `/api/multimedia/${multimediaEditando}`
            : "/api/multimedia";


    const metodo =
        multimediaEditando
            ? "PUT"
            : "POST";


    try {

        const respuesta =
            await window.fetchProtegido(
                url,
                {
                    method: metodo,
                    body: formulario
                }
            );


        // ======================================
        // LEER RESPUESTA DE FORMA SEGURA
        // ======================================

        const texto =
            await respuesta.text();


        let resultado = {};

        try {

            resultado =
                texto
                    ? JSON.parse(texto)
                    : {};

        } catch (errorJSON) {

            console.error(
                "El servidor no devolvió JSON:",
                texto
            );

            throw new Error(
                `El servidor respondió HTTP ${respuesta.status}`
            );

        }


        // ======================================
        // ERROR HTTP
        // ======================================

        if (!respuesta.ok) {

            console.error(
                "Error del servidor:",
                resultado
            );

            mostrarMensaje(
                "Error",
                resultado.error ||
                "No se pudo guardar la multimedia."
            );

            return;
        }


        // ======================================
        // GUARDADO CORRECTO
        // ======================================

        console.log(
            "Multimedia guardada correctamente:",
            resultado
        );


        multimediaEditando = null;


        const titulo =
            document.querySelector(
                "#modalMultimediaNuevo h3"
            );

        if (titulo) {

            titulo.textContent =
                "Nuevo archivo";

        }


        cerrarNuevoMultimedia();


        // Recargar multimedia
        await cargarMultimedia();


    } catch (error) {

        console.error(
            "Error guardando multimedia:",
            error
        );


        mostrarMensaje(
            "Error",
            error.message ||
            "Ocurrió un error al guardar la multimedia."
        );

    }

}



function cerrarMensaje(){

    document
        .getElementById("modalMensaje")
        .style.display = "none";

}

function cerrarNuevoMultimedia(){

    multimediaEditando = null;

    const modal =
        document.getElementById("modalMultimediaNuevo");

    if(modal){
        modal.style.display = "none";
    }


    // ==========================================
    // RESTAURAR SELECTOR DE FICHA
    // ==========================================

    const contenedorFicha =
        document.getElementById("contenedorFichaMultimedia");

    if(contenedorFicha){

        /*
           Si seguimos dentro de una ficha,
           permanece oculto.

           Si estamos en multimedia general,
           vuelve a mostrarse.
        */

        if(fichaSeleccionada){

            contenedorFicha.style.display = "none";

        }else{

            contenedorFicha.style.display = "block";

        }

    }


    window.multimediaFichaActual = false;


    // ==========================================
    // LIMPIAR CAMPOS
    // ==========================================

    const ficha =
        document.getElementById("multiFicha");

    if(ficha){
        ficha.selectedIndex = 0;
    }


    const descripcion =
        document.getElementById("multiDescripcion");

    if(descripcion){
        descripcion.value = "";
    }


    const tipo =
        document.getElementById("multiTipo");

    if(tipo){
        tipo.selectedIndex = 0;
    }


    const activo =
        document.getElementById("multiActivo");

    if(activo){
        activo.checked = true;
    }


    const archivo =
        document.getElementById("multiArchivo");

    if(archivo){
        archivo.value = "";
    }


    // ==========================================
    // ELIMINAR PREVIEW
    // ==========================================

    const preview =
        document.getElementById("previewArchivoActual");

    if(preview){

        preview.style.display = "none";

        preview.innerHTML = "";

    }


    const infoArchivo =
        document.getElementById("archivoActual");

    if(infoArchivo){
        infoArchivo.remove();
    }


    const titulo =
        document.querySelector(
            "#modalMultimediaNuevo h3"
        );

    if(titulo){
        titulo.textContent = "Nuevo archivo";
    }

}

function volverFicha(){

    cargarVentana(
        "fichas",
        true
    );

}


// ===================================
// ELIMINAR MULTIMEDIA
// ===================================
function eliminarMultimedia(id_multi){

    multimediaEliminar = id_multi;

    document
    .getElementById("modalEliminarMultimedia")
    .style.display = "flex";

}

function cerrarEliminarMultimedia(){

    multimediaEliminar = null;

    document
    .getElementById("modalEliminarMultimedia")
    .style.display = "none";

}

async function confirmarEliminarMultimedia(){

    if(!multimediaEliminar){
        return;
    }

    try{

        const respuesta =
        await window.fetchProtegido(

            `/api/multimedia/${multimediaEliminar}`,

            {
                method:"DELETE"
            }

        );

        const resultado =
        await respuesta.json();

        if(!respuesta.ok){

            cerrarEliminarMultimedia();

            alert(resultado.error);

            return;

        }

        cerrarEliminarMultimedia();

        cargarMultimedia();

    }catch(error){

        console.error(error);

    }

}


function abrirDocumentoCompleto(ruta){

    document.getElementById(
        "visorDocumentoCompleto"
    ).src = ruta;

    document.getElementById(
        "modalDocumentoCompleto"
    ).style.display = "flex";

}

function cerrarDocumentoCompleto(){

    document.getElementById(
        "visorDocumentoCompleto"
    ).src = "";

    document.getElementById(
        "modalDocumentoCompleto"
    ).style.display = "none";

}



function mostrarMensaje(titulo, mensaje){

    const modal =
    document.getElementById("modalMensaje");


    if(!modal){

        alert(`${titulo}\n\n${mensaje}`);
        return;

    }


    document.getElementById("tituloMensaje")
    .textContent = titulo;


    document.getElementById("textoMensaje")
    .textContent = mensaje;


    modal.style.display = "flex";

}


async function editarMultimedia(id){

    try{

        multimediaEditando = id;

        const respuesta =
        await window.fetchProtegido(`/api/multimedia/${id}`);

        const item =
        await respuesta.json();

        await cargarFichasMultimedia();

        document.getElementById("multiFicha").value =
            item.id_ficha;

        document.getElementById("multiDescripcion").value =
            item.descripcion || "";

        document.getElementById("multiTipo").value =
            item.tipo_multi;

        document.getElementById("multiActivo").checked =
            item.activo == 1;

        document.getElementById("multiArchivo").value = "";

        let preview =
        document.getElementById("previewArchivoActual");

        if(!preview){

            preview = document.createElement("div");

            preview.id = "previewArchivoActual";

            preview.className = "preview-archivo-actual";

            document
                .getElementById("multiArchivo")
                .parentNode
                .appendChild(preview);

        }

        const ruta =
        "/" + item.ruta_archivo.replace("public/","");

        let vista = "";

        switch(item.tipo_multi){

            case "imagen":

                vista = `
                    <img
                        src="${ruta}"
                        class="preview-imagen-multi"
                        style="
                            max-width:260px;
                            max-height:220px;
                            border-radius:10px;
                            border:2px solid #705438;
                            display:block;
                            margin:auto;
                        ">
                `;
                break;

            case "video":

                vista = `
                    <video
                        controls
                        style="
                            width:320px;
                            border-radius:10px;
                            display:block;
                            margin:auto;
                        ">

                        <source src="${ruta}">

                    </video>
                `;
                break;

            case "audio":

                vista = `
                    <div style="text-align:center">

                        <div style="font-size:60px;margin-bottom:10px;">
                            <i data-lucide="music" aria-hidden="true"></i>
                        </div>

                        <audio controls style="width:100%;">

                            <source src="${ruta}">

                        </audio>

                    </div>
                `;
                break;

            case "pdf":

                vista = `
                    <iframe
                        src="${ruta}"
                        style="
                            width:100%;
                            height:350px;
                            border:none;
                            border-radius:8px;
                            background:white;
                        ">
                    </iframe>
                `;
                break;

            default:

                vista = `
                    <div style="
                        text-align:center;
                        font-size:60px;
                    ">
                        <i data-lucide="folder" aria-hidden="true"></i>
                    </div>
                `;

        }

        preview.innerHTML = `

            <hr>

            <h4 style="margin-bottom:12px;">

                Archivo actual

            </h4>

            <p>

                <strong>Ficha asociada:</strong>

                ${item.ficha}

            </p>

            ${vista}

            <p style="margin-top:15px;color:#666;">

                Si seleccionás otro archivo,
                reemplazará al actual.

            </p>

        `;

        preview.style.display = "block";

        if(window.lucide){
            window.lucide.createIcons();
        }

        document.querySelector(
            "#modalMultimediaNuevo h3"
        ).textContent = "Editar multimedia";

        document.getElementById(
            "modalMultimediaNuevo"
        ).style.display = "flex";

    }catch(error){

        console.error(error);

    }

}

function cargarMultimediaGeneral(){

    fichaSeleccionada = null;

    cargarMultimedia();

}


function nuevoMultimediaDesdeFicha() {

    const modal =
        document.getElementById("modalMultimediaNuevo");

    if (!modal) {
        console.error("No se encontró modalMultimediaNuevo");
        return;
    }

    // ==========================================
    // VERIFICAR FICHA ACTUAL
    // ==========================================

    if (!fichaSeleccionada) {

        console.error(
            "No hay una ficha seleccionada."
        );

        mostrarMensaje(
            "Error",
            "No se pudo determinar la ficha asociada."
        );

        return;
    }


    console.log(
        "Nuevo multimedia para ficha:",
        fichaSeleccionada
    );


    // ==========================================
    // ESTAMOS CREANDO DESDE UNA FICHA
    // ==========================================

    window.multimediaFichaActual = true;

    multimediaEditando = null;


    // ==========================================
    // OCULTAR SELECTOR DE FICHA
    // ==========================================

    const contenedorFicha =
        document.getElementById(
            "contenedorFichaMultimedia"
        );

    if (contenedorFicha) {

        contenedorFicha.style.display = "none";

    }


    // ==========================================
    // LIMPIAR FORMULARIO
    // ==========================================

    const descripcion =
        document.getElementById("multiDescripcion");

    const tipo =
        document.getElementById("multiTipo");

    const archivo =
        document.getElementById("multiArchivo");

    const activo =
        document.getElementById("multiActivo");


    if (descripcion) {

        descripcion.value = "";

    }


    if (tipo) {

        tipo.value = "imagen";

    }


    if (archivo) {

        archivo.value = "";

    }


    if (activo) {

        activo.checked = true;

    }


    // ==========================================
    // OCULTAR ARCHIVO ACTUAL
    // ==========================================

    const preview =
        document.getElementById(
            "previewArchivoActual"
        );

    if (preview) {

        preview.style.display = "none";

        preview.innerHTML = "";

    }


    // ==========================================
    // TÍTULO
    // ==========================================

    const titulo =
        document.querySelector(
            "#modalMultimediaNuevo h3"
        );

    if (titulo) {

        titulo.textContent =
            "Nuevo archivo";

    }


    // ==========================================
    // ABRIR MODAL
    // ==========================================

    modal.style.display = "flex";

}