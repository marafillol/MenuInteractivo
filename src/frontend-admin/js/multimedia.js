/* =========================================================
   MULTIMEDIA.JS
   Museo Malvinas
   Gestión de archivos multimedia
   Versión limpia y consolidada
========================================================= */

console.log("Modulo multimedia cargado");


/* =========================================================
   VARIABLES
========================================================= */

let multimediaEditando = null;
let multimediaEliminar = null;


/* =========================================================
   UTILIDADES
========================================================= */

/**
 * Inicializa los iconos Lucide si están disponibles.
 */
function actualizarIconosLucide() {

    if (window.lucide) {
        window.lucide.createIcons();
    }

}


/**
 * Obtiene un elemento por ID.
 */
function obtenerElemento(id) {

    return document.getElementById(id);

}


/**
 * Convierte una ruta de archivo de la base de datos
 * en una ruta utilizable desde el navegador.
 */
function obtenerRutaMultimedia(ruta) {

    if (!ruta) {
        return "";
    }

    return "/" + ruta.replace(/^public\//, "");

}


/* =========================================================
   CARGAR MULTIMEDIA
========================================================= */

async function cargarMultimedia() {

    const panel =
        obtenerElemento("panelFichaMultimedia");

    const vistaGeneral =
        obtenerElemento("vistaGeneralMultimedia");

    const cabeceraGeneral =
        obtenerElemento("cabeceraMultimediaGeneral");

    const cabeceraFicha =
        obtenerElemento("cabeceraMultimediaFicha");

    const botonNuevo =
        obtenerElemento("nuevoMultimedia");

    const botonNuevoFicha =
        obtenerElemento("nuevoMultimediaFicha");

    const titulo =
        obtenerElemento("tituloMultimedia");


    try {

        let url = "/api/multimedia";


        /* =================================================
           MULTIMEDIA DE UNA FICHA
        ================================================= */

        if (fichaSeleccionada) {

            url =
                `/api/multimedia/ficha/${fichaSeleccionada}`;


            if (panel) {
                panel.style.display = "block";
            }

            if (vistaGeneral) {
                vistaGeneral.style.display = "none";
            }

            if (cabeceraGeneral) {
                cabeceraGeneral.style.display = "none";
            }

            if (cabeceraFicha) {
                cabeceraFicha.style.display = "flex";
            }

            if (botonNuevo) {
                botonNuevo.style.display = "none";
            }

            if (botonNuevoFicha) {
                botonNuevoFicha.style.display = "inline-flex";
            }


            /* =============================================
               OBTENER NOMBRE DE LA FICHA
            ============================================= */

            try {

                const respuestaFicha =
                    await window.fetchProtegido(
                        `/api/fichas/${fichaSeleccionada}`
                    );


                if (!respuestaFicha.ok) {
                    throw new Error(
                        `Error HTTP ${respuestaFicha.status}`
                    );
                }


                const ficha =
                    await respuestaFicha.json();


                const tituloFicha =
                    obtenerElemento(
                        "tituloFichaMultimedia"
                    );

                const nombreFicha =
                    obtenerElemento(
                        "nombreFichaMultimedia"
                    );


                if (tituloFicha) {

                    tituloFicha.textContent =
                        "Multimedia asociada a la ficha";

                }


                if (nombreFicha) {

                    nombreFicha.textContent =
                        ficha.titulo ||
                        "Ficha sin nombre";

                }


            } catch (error) {

                console.error(
                    "Error obteniendo nombre de la ficha:",
                    error
                );

            }

        }


        /* =================================================
           MULTIMEDIA GENERAL
        ================================================= */

        else {

            if (botonNuevoFicha) {
                botonNuevoFicha.style.display = "none";
            }

            if (panel) {
                panel.style.display = "none";
            }

            if (vistaGeneral) {
                vistaGeneral.style.display = "block";
            }

            if (cabeceraGeneral) {
                cabeceraGeneral.style.display = "flex";
            }

            if (cabeceraFicha) {
                cabeceraFicha.style.display = "none";
            }

            if (botonNuevo) {
                botonNuevo.style.display = "inline-flex";
            }

            if (titulo) {
                titulo.textContent =
                    "Gestión de Multimedia";
            }


            const listaGeneral =
                obtenerElemento(
                    "listaMultimedia"
                );

            if (listaGeneral) {
                listaGeneral.innerHTML = "";
            }

        }


        /* =================================================
           CONSULTAR API
        ================================================= */

        console.log(
            "Consultando:",
            url
        );


        const respuesta =
            await window.fetchProtegido(url);


        if (!respuesta.ok) {

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
           CONTENEDOR
        ================================================= */

        const contenedor =
            fichaSeleccionada
                ? obtenerElemento("listaMultimedia")
                : obtenerElemento("listaMultimediaGeneral");


        if (!contenedor) {

            console.error(
                "No existe el contenedor de multimedia"
            );

            return;

        }


        contenedor.innerHTML = "";


        /* =================================================
           SIN MULTIMEDIA
        ================================================= */

        if (
            !Array.isArray(multimedia) ||
            multimedia.length === 0
        ) {

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


            actualizarIconosLucide();

            return;

        }


        /* =================================================
           CREAR TARJETAS
        ================================================= */

        multimedia.forEach(item => {

            const vista =
                generarVistaMiniatura(item);


            const icono =
                obtenerIconoMultimedia(
                    item.tipo_multi
                );


            const tipo =
                item.tipo_multi
                    ? item.tipo_multi.charAt(0).toUpperCase()
                        + item.tipo_multi.slice(1)
                    : "Archivo";


            const descripcion =
                item.descripcion ||
                "Sin descripción";


            contenedor.innerHTML += `

                <article class="tarjeta-multimedia ${item.activo == 0 ? "multimedia-desactivada" : ""}">


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

                                    ${tipo}

                                </h3>


                                <small class="descripcion-tipo">

                                    ${descripcion}

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
                                type="button"
                                class="btn-vista"
                                onclick="
                                    vistaPreviaMultimedia(
                                        ${item.id_multi}
                                    )
                                ">

                                Vista previa

                            </button>


                            ${
                                !esConsulta
                                    ? `

                                        <button
                                            type="button"
                                            class="btn-editar"
                                            onclick="
                                                editarMultimedia(
                                                    ${item.id_multi}
                                                )
                                            ">

                                            Editar

                                        </button>


                                        <button
                                            type="button"
                                            class="btn-eliminar"
                                            onclick="
                                                eliminarMultimedia(
                                                    ${item.id_multi}
                                                )
                                            ">

                                            Eliminar

                                        </button>

                                    `
                                    : ""
                            }


                        </div>


                    </div>


                </article>

            `;

        });


        actualizarIconosLucide();


    } catch (error) {

        console.error(
            "Error cargando multimedia:",
            error
        );

    }

}


/* =========================================================
   MINIATURAS
========================================================= */

function generarVistaMiniatura(item) {

    const ruta =
        obtenerRutaMultimedia(
            item.ruta_archivo
        );


    switch (item.tipo_multi) {

        case "imagen":

            return `

                <img
                    src="${ruta}"
                    class="thumb-multi"
                    alt="Imagen multimedia"
                    onerror="
                        this.src='/imagenes/default.png'
                    ">

            `;


        case "video":

            return `

                <video
                    class="thumb-multi"
                    muted
                    preload="metadata">

                    <source
                        src="${ruta}"
                        type="video/mp4">

                </video>

            `;


        case "audio":

            return `

                <div class="thumb-audio">

                    <i
                        data-lucide="music"
                        aria-hidden="true">
                    </i>

                </div>

            `;


        case "pdf":

            return `

                <div class="thumb-pdf">

                    <i
                        data-lucide="file-text"
                        aria-hidden="true">
                    </i>

                </div>

            `;


        default:

            return `

                <div class="thumb-pdf">

                    <i
                        data-lucide="folder"
                        aria-hidden="true">
                    </i>

                </div>

            `;

    }

}


/* =========================================================
   ICONO SEGÚN TIPO
========================================================= */

function obtenerIconoMultimedia(tipo) {

    const iconos = {

        imagen: "image",
        video: "video",
        audio: "music",
        pdf: "file-text"

    };


    return iconos[tipo] || "folder";

}


/* =========================================================
   VISTA PREVIA MULTIMEDIA
========================================================= */

async function vistaPreviaMultimedia(id_multi) {

    try {

        const respuesta =
            await window.fetchProtegido(
                `/api/multimedia/${id_multi}`
            );


        if (!respuesta.ok) {

            throw new Error(
                `Error HTTP ${respuesta.status}`
            );

        }


        const item =
            await respuesta.json();


        if (!item) {

            mostrarMensaje(
                "Archivo no encontrado",
                "No se encontró el archivo multimedia."
            );

            return;

        }


        const ruta =
            obtenerRutaMultimedia(
                item.ruta_archivo
            );


        let visor = "";


        /* =================================================
           IMAGEN
        ================================================= */

        if (item.tipo_multi === "imagen") {

            visor = `

                <img
                    src="${ruta}"
                    class="preview-imagen-multi"
                    alt="Imagen multimedia"
                    onerror="
                        this.src='/imagenes/default.png'
                    ">

            `;

        }


        /* =================================================
           VIDEO
        ================================================= */

        else if (item.tipo_multi === "video") {

            visor = `

                <video
                    controls
                    preload="metadata"
                    class="preview-video-multi">

                    <source src="${ruta}">

                    Tu navegador no soporta video.

                </video>

            `;

        }


        /* =================================================
           AUDIO
        ================================================= */

        else if (item.tipo_multi === "audio") {

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

        }


        /* =================================================
           PDF
        ================================================= */

        else if (item.tipo_multi === "pdf") {

            visor = `

                <div class="preview-pdf-contenedor">

                    <iframe
                        src="${ruta}"
                        class="preview-pdf-multi">
                    </iframe>

                </div>

            `;

        }


        /* =================================================
           OTRO
        ================================================= */

        else {

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
           CONTENIDO DEL MODAL
        ================================================= */

        const contenido =
            obtenerElemento(
                "contenidoVistaMultimedia"
            );


        if (!contenido) {

            console.error(
                "No existe contenidoVistaMultimedia"
            );

            return;

        }


        contenido.innerHTML = `

            <div class="vista-previa-multimedia-panel">


                <section class="visor-multimedia-panel">


                    <div class="titulo-visor-multimedia">

                        <span>
                            ${(
                                item.tipo_multi ||
                                "archivo"
                            ).toUpperCase()}
                        </span>

                    </div>


                    <div class="visor-contenido-multimedia">

                        ${visor}

                    </div>


                </section>


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
                                        ? item.tipo_multi.charAt(0).toUpperCase()
                                            + item.tipo_multi.slice(1)
                                        : "Archivo"
                                }
                            </strong>

                        </div>


                        <div class="dato-multimedia dato-descripcion">

                            <span>
                                Descripción
                            </span>

                            <strong>
                                ${
                                    item.descripcion ||
                                    "Sin descripción"
                                }
                            </strong>

                        </div>


                        <div class="dato-multimedia">

                            <span>
                                Estado
                            </span>

                            <strong>
                                ${
                                    item.activo == 1
                                        ? "Activo"
                                        : "Inactivo"
                                }
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


                    <div class="ruta-multimedia">

                        <span>
                            Ubicación del archivo
                        </span>

                        <code>
                            ${item.ruta_archivo || "-"}
                        </code>

                    </div>


                </section>


            </div>

        `;


        actualizarIconosLucide();


        /* =================================================
           ABRIR MODAL
        ================================================= */

        const modal =
            obtenerElemento(
                "modalVistaMultimedia"
            );


        if (modal) {

            modal.style.display = "flex";

        }


    } catch (error) {

        console.error(
            "Error mostrando vista previa:",
            error
        );

    }

}


/* =========================================================
   CERRAR VISTA PREVIA
========================================================= */

function cerrarVistaMultimedia() {

    const modal =
        obtenerElemento(
            "modalVistaMultimedia"
        );


    if (!modal) {
        return;
    }


    /* Detener videos */

    modal
        .querySelectorAll("video")
        .forEach(video => {

            video.pause();
            video.currentTime = 0;

        });


    /* Detener audios */

    modal
        .querySelectorAll("audio")
        .forEach(audio => {

            audio.pause();
            audio.currentTime = 0;

        });


    /* Eliminar contenido */

    const contenido =
        obtenerElemento(
            "contenidoVistaMultimedia"
        );


    if (contenido) {

        contenido.innerHTML = "";

    }


    modal.style.display = "none";


    /* Limpiar preview de archivo actual */

    const preview =
        obtenerElemento(
            "previewArchivoActual"
        );


    if (preview) {

        preview.style.display = "none";
        preview.innerHTML = "";

    }

}


/* =========================================================
   NUEVO MULTIMEDIA — GENERAL
========================================================= */

function nuevoMultimedia() {

    const modal =
        obtenerElemento(
            "modalMultimediaNuevo"
        );


    if (!modal) {

        console.error(
            "No se encontró modalMultimediaNuevo"
        );

        return;

    }


    window.multimediaFichaActual = false;

    multimediaEditando = null;


    /* Mostrar selector de ficha */

    const contenedorFicha =
        obtenerElemento(
            "contenedorFichaMultimedia"
        );


    if (contenedorFicha) {

        contenedorFicha.style.display = "block";

    }


    /* Cargar fichas */

    cargarFichasMultimedia();


    /* Título */

    const titulo =
        modal.querySelector("h3");


    if (titulo) {

        titulo.textContent =
            "Nuevo archivo";

    }


    modal.style.display = "flex";

}


/* =========================================================
   CARGAR FICHAS PARA SELECTOR
========================================================= */

async function cargarFichasMultimedia() {

    try {

        const respuesta =
            await window.fetchProtegido(
                "/api/fichas"
            );


        if (!respuesta.ok) {

            throw new Error(
                `Error HTTP ${respuesta.status}`
            );

        }


        const fichas =
            await respuesta.json();


        const select =
            obtenerElemento(
                "multiFicha"
            );


        if (!select) {

            console.error(
                "No existe el selector multiFicha"
            );

            return;

        }


        select.innerHTML = "";


        if (!Array.isArray(fichas)) {
            return;
        }


        fichas.forEach(ficha => {

            select.innerHTML += `

                <option value="${ficha.id_ficha}">

                    ${ficha.titulo}

                </option>

            `;

        });


    } catch (error) {

        console.error(
            "Error cargando fichas:",
            error
        );

    }

}


/* =========================================================
   GUARDAR MULTIMEDIA
========================================================= */

async function guardarMultimedia() {

    const archivoInput =
        obtenerElemento(
            "multiArchivo"
        );


    const archivo =
        archivoInput?.files[0];


    /* =================================================
       VALIDAR ARCHIVO
    ================================================= */

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


    /* =================================================
       DETERMINAR FICHA
    ================================================= */

    let idFicha;


    if (window.multimediaFichaActual) {

        idFicha =
            fichaSeleccionada;

    } else {

        const selectFicha =
            obtenerElemento(
                "multiFicha"
            );

        idFicha =
            selectFicha?.value;

    }


    /* =================================================
       VALIDAR FICHA
    ================================================= */

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
            fichaDesdeSeleccion:
                window.multimediaFichaActual,
            archivo: archivo?.name
        }
    );


    /* =================================================
       FORM DATA
    ================================================= */

    const formulario =
        new FormData();


    formulario.append(
        "id_ficha",
        idFicha
    );


    formulario.append(
        "descripcion",
        obtenerElemento(
            "multiDescripcion"
        )?.value || ""
    );


    formulario.append(
        "tipo_multi",
        obtenerElemento(
            "multiTipo"
        )?.value || ""
    );


    formulario.append(
        "activo",
        obtenerElemento(
            "multiActivo"
        )?.checked
            ? 1
            : 0
    );


    if (archivo) {

        formulario.append(
            "archivo",
            archivo
        );

    }


    /* =================================================
       URL Y MÉTODO
    ================================================= */

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


        /* =================================================
           RESPUESTA SEGURA
        ================================================= */

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


        /* =================================================
           ERROR HTTP
        ================================================= */

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


        /* =================================================
           GUARDADO CORRECTO
        ================================================= */

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


/* =========================================================
   MENSAJES
========================================================= */

function mostrarMensaje(titulo, mensaje) {

    const modal =
        obtenerElemento(
            "modalMensaje"
        );


    if (!modal) {

        alert(
            `${titulo}\n\n${mensaje}`
        );

        return;

    }


    const tituloElemento =
        obtenerElemento(
            "tituloMensaje"
        );


    const textoElemento =
        obtenerElemento(
            "textoMensaje"
        );


    if (tituloElemento) {

        tituloElemento.textContent =
            titulo;

    }


    if (textoElemento) {

        textoElemento.textContent =
            mensaje;

    }


    modal.style.display = "flex";

}


function cerrarMensaje() {

    const modal =
        obtenerElemento(
            "modalMensaje"
        );


    if (modal) {

        modal.style.display = "none";

    }

}


/* =========================================================
   CERRAR NUEVO / EDITAR MULTIMEDIA
========================================================= */

function cerrarNuevoMultimedia() {

    multimediaEditando = null;


    const modal =
        obtenerElemento(
            "modalMultimediaNuevo"
        );


    if (modal) {

        modal.style.display = "none";

    }


    /* =================================================
       RESTAURAR SELECTOR DE FICHA
    ================================================= */

    const contenedorFicha =
        obtenerElemento(
            "contenedorFichaMultimedia"
        );


    if (contenedorFicha) {

        if (fichaSeleccionada) {

            contenedorFicha.style.display = "none";

        } else {

            contenedorFicha.style.display = "block";

        }

    }


    window.multimediaFichaActual = false;


    /* =================================================
       LIMPIAR CAMPOS
    ================================================= */

    const ficha =
        obtenerElemento(
            "multiFicha"
        );


    if (ficha) {
        ficha.selectedIndex = 0;
    }


    const descripcion =
        obtenerElemento(
            "multiDescripcion"
        );


    if (descripcion) {
        descripcion.value = "";
    }


    const tipo =
        obtenerElemento(
            "multiTipo"
        );


    if (tipo) {
        tipo.selectedIndex = 0;
    }


    const activo =
        obtenerElemento(
            "multiActivo"
        );


    if (activo) {
        activo.checked = true;
    }


    const archivo =
        obtenerElemento(
            "multiArchivo"
        );


    if (archivo) {
        archivo.value = "";
    }


    /* =================================================
       ELIMINAR PREVIEW
    ================================================= */

    const preview =
        obtenerElemento(
            "previewArchivoActual"
        );


    if (preview) {

        preview.style.display = "none";
        preview.innerHTML = "";

    }


    const infoArchivo =
        obtenerElemento(
            "archivoActual"
        );


    if (infoArchivo) {

        infoArchivo.remove();

    }


    /* =================================================
       RESTAURAR TÍTULO
    ================================================= */

    const titulo =
        document.querySelector(
            "#modalMultimediaNuevo h3"
        );


    if (titulo) {

        titulo.textContent =
            "Nuevo archivo";

    }

}


/* =========================================================
   EDITAR MULTIMEDIA
========================================================= */

async function editarMultimedia(id) {

    try {

        multimediaEditando = id;


        const respuesta =
            await window.fetchProtegido(
                `/api/multimedia/${id}`
            );


        if (!respuesta.ok) {

            throw new Error(
                `Error HTTP ${respuesta.status}`
            );

        }


        const item =
            await respuesta.json();


        await cargarFichasMultimedia();


        /* =================================================
           CAMPOS
        ================================================= */

        const ficha =
            obtenerElemento(
                "multiFicha"
            );


        if (ficha) {

            ficha.value =
                item.id_ficha;

        }


        const descripcion =
            obtenerElemento(
                "multiDescripcion"
            );


        if (descripcion) {

            descripcion.value =
                item.descripcion || "";

        }


        const tipo =
            obtenerElemento(
                "multiTipo"
            );


        if (tipo) {

            tipo.value =
                item.tipo_multi;

        }


        const activo =
            obtenerElemento(
                "multiActivo"
            );


        if (activo) {

            activo.checked =
                item.activo == 1;

        }


        const archivo =
            obtenerElemento(
                "multiArchivo"
            );


        if (archivo) {

            archivo.value = "";

        }


        /* =================================================
           PREVIEW ARCHIVO ACTUAL
        ================================================= */

        let preview =
            obtenerElemento(
                "previewArchivoActual"
            );


        if (!preview) {

            preview =
                document.createElement("div");


            preview.id =
                "previewArchivoActual";


            preview.className =
                "preview-archivo-actual";


            if (archivo?.parentNode) {

                archivo.parentNode.appendChild(
                    preview
                );

            }

        }


        const ruta =
            obtenerRutaMultimedia(
                item.ruta_archivo
            );


        const vista =
            generarVistaEdicion(
                item,
                ruta
            );


        preview.innerHTML = `

            <hr>

            <h4 style="margin-bottom:12px;">

                Archivo actual

            </h4>

            <p>

                <strong>Ficha asociada:</strong>

                ${item.ficha || "-"}

            </p>

            ${vista}

            <p
                style="
                    margin-top:15px;
                    color:#666;
                "
            >

                Si seleccionás otro archivo,
                reemplazará al actual.

            </p>

        `;


        preview.style.display = "block";


        actualizarIconosLucide();


        /* =================================================
           TÍTULO
        ================================================= */

        const titulo =
            document.querySelector(
                "#modalMultimediaNuevo h3"
            );


        if (titulo) {

            titulo.textContent =
                "Editar multimedia";

        }


        /* =================================================
           ABRIR MODAL
        ================================================= */

        const modal =
            obtenerElemento(
                "modalMultimediaNuevo"
            );


        if (modal) {

            modal.style.display = "flex";

        }


    } catch (error) {

        console.error(
            "Error editando multimedia:",
            error
        );


        mostrarMensaje(
            "Error",
            "No se pudo cargar la multimedia para editar."
        );

    }

}


/* =========================================================
   PREVIEW PARA EDICIÓN
========================================================= */

function generarVistaEdicion(item, ruta) {

    switch (item.tipo_multi) {

        case "imagen":

            return `

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
                    "
                    alt="Archivo actual">

            `;


        case "video":

            return `

                <video
                    controls
                    style="
                        width:320px;
                        max-width:100%;
                        border-radius:10px;
                        display:block;
                        margin:auto;
                    ">

                    <source src="${ruta}">

                </video>

            `;


        case "audio":

            return `

                <div style="text-align:center">

                    <div
                        style="
                            font-size:60px;
                            margin-bottom:10px;
                        "
                    >

                        <i
                            data-lucide="music"
                            aria-hidden="true">
                        </i>

                    </div>


                    <audio
                        controls
                        style="width:100%;">

                        <source src="${ruta}">

                    </audio>

                </div>

            `;


        case "pdf":

            return `

                <iframe
                    src="${ruta}"
                    style="
                        width:100%;
                        height:350px;
                        border:none;
                        border-radius:8px;
                        background:white;
                    "
                    title="PDF actual">
                </iframe>

            `;


        default:

            return `

                <div
                    style="
                        text-align:center;
                        font-size:60px;
                    "
                >

                    <i
                        data-lucide="folder"
                        aria-hidden="true">
                    </i>

                </div>

            `;

    }

}


/* =========================================================
   NUEVO MULTIMEDIA DESDE UNA FICHA
========================================================= */

function nuevoMultimediaDesdeFicha() {

    const modal =
        obtenerElemento(
            "modalMultimediaNuevo"
        );


    if (!modal) {

        console.error(
            "No se encontró modalMultimediaNuevo"
        );

        return;

    }


    /* =================================================
       VERIFICAR FICHA
    ================================================= */

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


    /* =================================================
       ESTADO
    ================================================= */

    window.multimediaFichaActual = true;

    multimediaEditando = null;


    /* =================================================
       OCULTAR SELECTOR
    ================================================= */

    const contenedorFicha =
        obtenerElemento(
            "contenedorFichaMultimedia"
        );


    if (contenedorFicha) {

        contenedorFicha.style.display =
            "none";

    }


    /* =================================================
       LIMPIAR FORMULARIO
    ================================================= */

    const descripcion =
        obtenerElemento(
            "multiDescripcion"
        );


    const tipo =
        obtenerElemento(
            "multiTipo"
        );


    const archivo =
        obtenerElemento(
            "multiArchivo"
        );


    const activo =
        obtenerElemento(
            "multiActivo"
        );


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


    /* =================================================
       OCULTAR ARCHIVO ACTUAL
    ================================================= */

    const preview =
        obtenerElemento(
            "previewArchivoActual"
        );


    if (preview) {

        preview.style.display = "none";
        preview.innerHTML = "";

    }


    /* =================================================
       TÍTULO
    ================================================= */

    const titulo =
        modal.querySelector("h3");


    if (titulo) {

        titulo.textContent =
            "Nuevo archivo";

    }


    /* =================================================
       ABRIR MODAL
    ================================================= */

    modal.style.display = "flex";

}


/* =========================================================
   MULTIMEDIA GENERAL
========================================================= */

function cargarMultimediaGeneral() {

    fichaSeleccionada = null;

    cargarMultimedia();

}


/* =========================================================
   ELIMINAR MULTIMEDIA
========================================================= */

function eliminarMultimedia(id_multi) {

    multimediaEliminar =
        id_multi;


    const modal =
        obtenerElemento(
            "modalEliminarMultimedia"
        );


    if (modal) {

        modal.style.display =
            "flex";

    }

}


/* =========================================================
   CERRAR ELIMINACIÓN
========================================================= */

function cerrarEliminarMultimedia() {

    multimediaEliminar =
        null;


    const modal =
        obtenerElemento(
            "modalEliminarMultimedia"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


/* =========================================================
   CONFIRMAR ELIMINACIÓN
========================================================= */

async function confirmarEliminarMultimedia() {

    if (!multimediaEliminar) {
        return;
    }


    try {

        const respuesta =
            await window.fetchProtegido(

                `/api/multimedia/${multimediaEliminar}`,

                {
                    method: "DELETE"
                }

            );


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            cerrarEliminarMultimedia();


            mostrarMensaje(
                "Error",
                resultado.error ||
                "No se pudo eliminar la multimedia."
            );


            return;

        }


        cerrarEliminarMultimedia();


        await cargarMultimedia();


    } catch (error) {

        console.error(
            "Error eliminando multimedia:",
            error
        );


        mostrarMensaje(
            "Error",
            "Ocurrió un error al eliminar la multimedia."
        );

    }

}


/* =========================================================
   DOCUMENTO COMPLETO
========================================================= */

function abrirDocumentoCompleto(ruta) {

    const visor =
        obtenerElemento(
            "visorDocumentoCompleto"
        );


    const modal =
        obtenerElemento(
            "modalDocumentoCompleto"
        );


    if (visor) {

        visor.src =
            ruta;

    }


    if (modal) {

        modal.style.display =
            "flex";

    }

}


function cerrarDocumentoCompleto() {

    const visor =
        obtenerElemento(
            "visorDocumentoCompleto"
        );


    const modal =
        obtenerElemento(
            "modalDocumentoCompleto"
        );


    if (visor) {

        visor.src =
            "";

    }


    if (modal) {

        modal.style.display =
            "none";

    }

}


/* =========================================================
   VOLVER A FICHA
========================================================= */

function volverFicha() {

    cargarVentana(
        "fichas",
        true
    );

}


// =========================================================
// CERRAR MODALES AL HACER CLIC FUERA
// =========================================================

document.addEventListener("click", function (event) {

    const modal = event.target.closest(".modal-multimedia");

    if (!modal) {
        return;
    }

    // Solo si se hizo clic exactamente en el fondo
    if (event.target !== modal) {
        return;
    }


    // =====================================================
    // VISTA PREVIA
    // =====================================================

    if (modal.id === "modalVistaMultimedia") {

        cerrarVistaMultimedia();

        return;
    }


    // =====================================================
    // NUEVO / EDITAR
    // =====================================================

    if (modal.id === "modalMultimediaNuevo") {

        cerrarNuevoMultimedia();

        return;
    }


    // =====================================================
    // ELIMINAR
    // =====================================================

    if (modal.id === "modalEliminarMultimedia") {

        cerrarEliminarMultimedia();

        return;
    }


    // =====================================================
    // MENSAJE
    // =====================================================

    if (modal.id === "modalMensaje") {

        cerrarMensaje();

        return;
    }


    // =====================================================
    // DOCUMENTO COMPLETO
    // =====================================================

    if (modal.id === "modalDocumentoCompleto") {

        cerrarDocumentoCompleto();

        return;
    }

});