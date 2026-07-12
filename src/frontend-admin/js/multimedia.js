console.log("Modulo multimedia cargado");

let multimediaEditando = null;
let multimediaEliminar = null;
// ===================================
// CARGAR TODA LA MULTIMEDIA
// ===================================
async function cargarMultimedia(){


    const panel =
    document.getElementById("panelFichaMultimedia");

    const vistaGeneral =
    document.getElementById("vistaGeneralMultimedia");

    const volver =
    document.getElementById("barraVolverFicha");

    const botonNuevo =
    document.getElementById("nuevoMultimedia");

    const titulo =
    document.getElementById("tituloMultimedia");

    const subtitulo =
    document.getElementById("subtituloMultimedia");


    try{

        let url = "/api/multimedia";


        if(fichaSeleccionada){

            url = `/api/multimedia/ficha/${fichaSeleccionada}`;

            panel.style.display = "grid";

            vistaGeneral.style.display = "none";

            volver.style.display = "inline-block";

            botonNuevo.style.display = "none";

            titulo.textContent =
                `🎞 Multimedia de ${nombreFichaSeleccionada}`;

            await cargarResumenFicha();

        }else{

             // Ocultar completamente el panel de ficha
             panel.style.display = "none";

             // Mostrar únicamente la vista general
             vistaGeneral.style.display = "block";

             volver.style.display = "none";

             botonNuevo.style.display = "inline-block";

             titulo.textContent = "Gestión de Multimedia";

             subtitulo.textContent = "";

             // Limpiar el contenido del panel de ficha
             document.getElementById("tarjetaFichaMultimedia").innerHTML = "";
             document.getElementById("listaMultimedia").innerHTML = "";

        }


        const respuesta =
        await fetch(url);

        const multimedia =
        await respuesta.json();

        let contenedor;

        if(fichaSeleccionada){

            contenedor =
            document.getElementById("listaMultimedia");

        }else{

            contenedor =
            document.getElementById("listaMultimediaGeneral");

        }

        if(!contenedor){

            console.error("No existe listaMultimedia");
            return;

        }

        contenedor.innerHTML = "";

        if(multimedia.length === 0){

            contenedor.innerHTML =
            "<p>No hay multimedia cargada.</p>";

            return;

        }

        multimedia.forEach(item=>{

            console.log(item.ruta_archivo);
            let vista = "";


            if(item.tipo_multi === "imagen"){

                vista = `
                    <img
                        src="/${item.ruta_archivo}"
                        class="thumb-multi"
                        onerror="this.src='/imagenes/default.png'">
                `;

            }
            else if(item.tipo_multi === "video"){

                vista = `
                    <video
                        class="thumb-multi"
                        muted
                        preload="metadata">

                        <source src="/${item.ruta_archivo}" type="video/mp4">

                    </video>


                `;

            }
            else if(item.tipo_multi === "audio"){

                vista = `
                    <div class="thumb-audio">
                        🎵
                    </div>
                `;

            }
            else{

                vista = `
                    <div class="thumb-pdf">
                        📄
                    </div>
                `;

            }
            const icono = item.miniatura || "📁";


            contenedor.innerHTML += `

                <article class="tarjeta-multimedia">

                    <div class="multimedia-preview">

                        ${vista}

                    </div>

                    <div class="info-multimedia">

                        <div class="encabezado-multimedia">

                            <span class="emoji-multimedia">
                                ${icono}
                            </span>

                            <div>

                                <h3 class="titulo-multimedia">
                                    ${item.tipo_multi.charAt(0).toUpperCase() + item.tipo_multi.slice(1)}
                                </h3>

                                <small class="descripcion-tipo">
                                    ${item.descripcion || "Sin descripción"}
                                </small>

                            </div>

                        </div>

                        <div class="datos-multimedia">

                            <small>
                                📁 Ficha #${item.id_ficha}
                            </small>

                            <small>
                                📅 ${item.creado || "-"}
                            </small>

                        </div>

                        <div class="acciones-menu">

                            <button
                                class="btn-vista"
                                onclick="vistaPreviaMultimedia(${item.id_multi})">

                                Vista previa

                            </button>

                            <button
                                class="btn-editar"
                                onclick="editarMultimedia(${item.id_multi})">

                                Editar

                            </button>

                            <button
                                class="btn-eliminar"
                                onclick="eliminarMultimedia(${item.id_multi})">

                                Eliminar

                            </button>

                        </div>

                    </div>

                </article>

            `;

        });

    }catch(error){

        console.error(
            "Error cargando multimedia:",
            error
        );

    }

}



// ===================================
// RESUMEN DE LA FICHA SELECCIONADA
// ===================================
async function cargarResumenFicha(){

    if(!fichaSeleccionada){
        return;
    }

    try{

        const respuesta =
        await fetch(`/api/fichas/${fichaSeleccionada}`);

        const ficha =
        await respuesta.json();

        const tarjeta =
        document.getElementById("tarjetaFichaMultimedia");

        tarjeta.innerHTML = `

            <div class="tarjeta-ficha-lateral">

                <img
                    src="/${(ficha.imagen || "").replace("public/","")}"
                    class="imagen-ficha-lateral"
                    onerror="this.src='/imagenes/default.png'">

                <h2>
                    ${ficha.titulo}
                </h2>

                <p class="resumen-ficha-lateral">
                    ${ficha.resumen || "Sin resumen"}
                </p>

                <hr>

                <p>
                    <strong>Menú</strong><br>
                    ${ficha.menu || ficha.id_menu}
                </p>

                <p>
                    <strong>ID de la ficha</strong><br>
                    ${ficha.id_ficha}
                </p>

                <p>
                    <strong>Estado</strong><br>
                    ${ficha.visible == 1 ? "Visible" : "Oculta"}
                </p>

                <p>
                    <strong>Multimedia asociada</strong><br>
                    Archivos relacionados con esta ficha
                </p>

            </div>

        `;

    }catch(error){

        console.error(
            "Error cargando ficha:",
            error
        );

    }

}


// ===================================
// VISTA PREVIA MULTIMEDIA
// ===================================
async function vistaPreviaMultimedia(id_multi){

    try{

        const respuesta =
        await fetch(`/api/multimedia/${id_multi}`);

        const item =
        await respuesta.json();

        if(!item){

            alert("No se encontró el archivo.");
            return;

        }

        const ruta =
        "/" + item.ruta_archivo.replace("public/","");

        let visor = "";

        switch(item.tipo_multi){

            case "imagen":

                visor = `
                    <img
                        src="${ruta}"
                        class="preview-imagen-multi">
                `;
                break;


            case "video":

                visor = `
                    <video
                        controls
                        preload="metadata"
                        class="preview-video-multi">

                        <source
                            src="${ruta}">

                        Tu navegador no soporta video.

                    </video>
                `;
                break;


            case "audio":

                visor = `
                    <audio
                        controls
                        class="preview-audio-multi">

                        <source
                            src="${ruta}">

                        Tu navegador no soporta audio.

                    </audio>
                `;
                break;


            case "pdf":

                visor = `

                    <div class="preview-documento">

                        <div class="encabezado-documento">

                            <div class="icono-documento">
                                📄
                            </div>

                            <div>

                                <h3>Documento PDF</h3>

                                <p>
                                    ${item.descripcion || "Sin descripción"}
                                </p>

                            </div>

                        </div>

                        <iframe
                            src="${ruta}"
                            class="preview-pdf-multi">
                        </iframe>

                        <div class="acciones-documento">

                            <button
                                class="btn-vista"
                                onclick="abrirDocumentoCompleto('${ruta}')">

                                ⛶ Ver documento completo

                            </button>



                        </div>

                    </div>

                `;

                break;


            default:

                visor = `
                    <a
                        href="${ruta}"
                        target="_blank">

                        Descargar archivo

                    </a>
                `;

        }


        document.getElementById("contenidoVistaMultimedia").innerHTML = `

            <div class="vista-previa-multi">

                <div class="visor-simple-multi">

                    ${visor}

                </div>


                <div class="info-simple-multi">

                    <h2>
                        ${item.descripcion || "Sin descripción"}
                    </h2>

                    <div class="datos-simple-multi">

                        <div class="dato-multi">
                            <span>ID Multimedia</span>
                            <strong>${item.id_multi}</strong>
                        </div>

                        <div class="dato-multi">
                            <span>ID Ficha</span>
                            <strong>${item.id_ficha}</strong>
                        </div>

                        <div class="dato-multi">
                            <span>Descripción</span>
                            <strong>${item.descripcion || "-"}</strong>
                        </div>

                        <div class="dato-multi">
                            <span>Ruta del archivo</span>
                            <strong>${item.ruta_archivo || "-"}</strong>
                        </div>

                        <div class="dato-multi">
                            <span>Tipo</span>
                            <strong>${item.tipo_multi || "-"}</strong>
                        </div>

                        <div class="dato-multi">
                            <span>Miniatura</span>
                            <strong>${item.miniatura || "Sin miniatura"}</strong>
                        </div>

                        <div class="dato-multi">
                            <span>Activo</span>
                            <strong>${item.activo == 1 ? "Sí" : "No"}</strong>
                        </div>

                        <div class="dato-multi">
                            <span>Creado</span>
                            <strong>${item.creado || "-"}</strong>
                        </div>

                        <div class="dato-multi">
                            <span>Actualizado</span>
                            <strong>${item.actualizado || "-"}</strong>
                        </div>

                    </div>

                </div>

            </div>

        `;


        document.getElementById(
            "modalVistaMultimedia"
        ).style.display = "flex";

    }catch(error){

        console.error(error);

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

async function nuevoMultimedia(){

    await cargarFichasMultimedia();

    // ==========================
    // Limpiar formulario
    // ==========================

    document.getElementById("multiDescripcion").value = "";

    document.getElementById("multiTipo").selectedIndex = 0;

    document.getElementById("multiArchivo").value = "";

    const ficha =
    document.getElementById("multiFicha");

    if(ficha.options.length > 0){

        ficha.selectedIndex = 0;

    }

    // Abrir modal

    document
    .getElementById("modalMultimediaNuevo")
    .style.display = "flex";

}

async function cargarFichasMultimedia(){

    const respuesta=
    await fetch("/api/fichas");

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
async function guardarMultimedia(){

    const formulario = new FormData();

    formulario.append(
        "id_ficha",
        document.getElementById("multiFicha").value
    );

    formulario.append(
        "descripcion",
        document.getElementById("multiDescripcion").value
    );

    formulario.append(
        "tipo_multi",
        document.getElementById("multiTipo").value
    );

    formulario.append(
        "activo",
        document.getElementById("multiActivo").checked ? 1 : 0
    );

    const archivo =
    document.getElementById("multiArchivo").files[0];

    if(archivo){

        formulario.append(
            "archivo",
            archivo
        );

    }

    try{

        const url =
            multimediaEditando
                ? `/api/multimedia/${multimediaEditando}`
                : "/api/multimedia";

        const metodo =
            multimediaEditando
                ? "PUT"
                : "POST";

        const respuesta = await fetch(
            url,
            {
                method: metodo,
                body: formulario
            }
        );

        const resultado =
        await respuesta.json();

        console.log(resultado);

        multimediaEditando = null;

        document.querySelector(
            "#modalMultimediaNuevo h3"
        ).textContent = "Nuevo archivo";

        cerrarNuevoMultimedia();

        cargarMultimedia();

    }catch(error){

        console.error(
            "Error guardando multimedia:",
            error
        );

    }

}

function cerrarNuevoMultimedia(){

    multimediaEditando = null;

    document.getElementById("modalMultimediaNuevo").style.display = "none";

    document.getElementById("multiFicha").selectedIndex = 0;
    document.getElementById("multiDescripcion").value = "";
    document.getElementById("multiTipo").selectedIndex = 0;
    document.getElementById("multiActivo").checked = true;
    document.getElementById("multiArchivo").value = "";

    const infoArchivo =
    document.getElementById("archivoActual");

    if(infoArchivo){
        infoArchivo.remove();
    }

    document.querySelector(
        "#modalMultimediaNuevo h3"
    ).textContent = "Nuevo archivo";

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
        await fetch(

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

async function editarMultimedia(id){

    try{

        multimediaEditando = id;

        const respuesta =
        await fetch(`/api/multimedia/${id}`);

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
                            🎵
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
                        📁
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