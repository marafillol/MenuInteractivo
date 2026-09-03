// =======================================================
// HISTORIA COMPLETA
// Museo Malvinas · Archivo Histórico
// =======================================================

const CONFIG_HISTORIA = {

    api: "/api/public/fichas",

    contenedor: "historiaCompleta",
    titulo: "tituloHistoria",
    imagen: "imagenHistoria",
    resumen: "resumenHistoria",
    texto: "textoHistoria",
    campos: "camposHistoria",
    etiquetas: "etiquetasHistoria",
    multimedia: "multimediaHistoria",
    relacionadas: "relacionadasHistoria"

};


// =======================================================
// ESTADO
// =======================================================

let historiaFichaActual = null;
let historiaIdActual = null;

let multimediaActual = [];
let multimediaIndiceActual = 0;


// =======================================================
// INICIALIZACIÓN
// =======================================================

document.addEventListener(
    "DOMContentLoaded",
    iniciarHistoriaCompleta
);


function iniciarHistoriaCompleta() {

    console.log("[HISTORIA] Inicializando...");

    prepararEventosHistoria();
    prepararCarruselMultimedia();
    hacerHistoriaMovible();

    console.log("[HISTORIA] Inicialización completa.");

}


// =======================================================
// EVENTOS HISTORIA
// =======================================================

function prepararEventosHistoria() {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.contenedor
        );


    if (!contenedor) {

        console.warn(
            "[HISTORIA] No existe #historiaCompleta."
        );

        return;

    }


    contenedor.addEventListener(
        "click",
        evento => {

            if (
                evento.target === contenedor ||
                evento.target.classList.contains(
                    "historiaFondo"
                )
            ) {

                cerrarHistoriaCompleta();

            }

        }
    );


    document.addEventListener(
        "keydown",
        evento => {

            /*
             * Si el carrusel está abierto,
             * las flechas controlan el multimedia.
             */

            const carrusel =
                document.getElementById(
                    "carruselMultimedia"
                );


            if (
                carrusel &&
                carrusel.classList.contains("activo")
            ) {

                if (evento.key === "Escape") {

                    cerrarCarruselMultimedia();
                    return;

                }

                if (evento.key === "ArrowLeft") {

                    multimediaAnterior();
                    return;

                }

                if (evento.key === "ArrowRight") {

                    multimediaSiguiente();
                    return;

                }

            }


            if (
                evento.key === "Escape"
            ) {

                cerrarHistoriaCompleta();

            }

        }
    );

}


// =======================================================
// ABRIR HISTORIA
// =======================================================

async function abrirHistoriaCompleta(idFicha) {

    if (
        idFicha === undefined ||
        idFicha === null ||
        idFicha === ""
    ) {

        console.warn(
            "[HISTORIA] ID de ficha inválido."
        );

        return;

    }


    console.log(
        "[HISTORIA] Abriendo ficha:",
        idFicha
    );


    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.contenedor
        );


    const cuerpo =
        document.querySelector(
            ".cuerpoHistoria"
        );


    if (!contenedor) return;


    const expedienteYaAbierto =
        contenedor.classList.contains(
            "activo"
        );


    historiaIdActual = idFicha;


    if (expedienteYaAbierto) {

        if (cuerpo) {

            cuerpo.classList.remove(
                "ficha-cargada"
            );

            cuerpo.classList.add(
                "cambiando-ficha"
            );

        }


        try {

            const ficha =
                await obtenerFicha(
                    idFicha
                );


            if (!ficha) {

                throw new Error(
                    "La API no devolvió la ficha."
                );

            }


            historiaFichaActual =
                ficha;


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        180
                    )
            );


            pintarHistoria(
                ficha
            );


            ocultarEstadoHistoria();


            if (cuerpo) {

                cuerpo.classList.remove(
                    "cambiando-ficha"
                );

                void cuerpo.offsetWidth;

                cuerpo.classList.add(
                    "ficha-cargada"
                );

            }

        } catch (error) {

            console.error(
                "[HISTORIA] Error:",
                error
            );

            mostrarHistoriaError();

            if (cuerpo) {

                cuerpo.classList.remove(
                    "cambiando-ficha"
                );

            }

        }

        return;

    }


    mostrarHistoriaCarga();
    mostrarHistoriaCompleta();


    try {

        const ficha =
            await obtenerFicha(
                idFicha
            );


        if (!ficha) {

            throw new Error(
                "La API no devolvió la ficha."
            );

        }


        historiaFichaActual =
            ficha;


        pintarHistoria(
            ficha
        );


        ocultarEstadoHistoria();


        if (cuerpo) {

            cuerpo.classList.remove(
                "cambiando-ficha"
            );

            cuerpo.classList.add(
                "ficha-cargada"
            );

            void cuerpo.offsetWidth;

        }

    } catch (error) {

        console.error(
            "[HISTORIA] Error:",
            error
        );

        mostrarHistoriaError();

    }

}


// =======================================================
// API
// =======================================================

async function obtenerFicha(idFicha) {

    const url =
        `${CONFIG_HISTORIA.api}/${idFicha}`;


    console.log(
        "[HISTORIA] Consultando:",
        url
    );


    const respuesta =
        await fetch(url);


    if (!respuesta.ok) {

        throw new Error(
            `HTTP ${respuesta.status}`
        );

    }


    return await respuesta.json();

}


// =======================================================
// MOSTRAR / CERRAR HISTORIA
// =======================================================

function mostrarHistoriaCompleta() {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.contenedor
        );


    if (!contenedor) return;


    contenedor.classList.add(
        "activo"
    );


    contenedor.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "historia-modal-abierta"
    );

}


function cerrarHistoriaCompleta() {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.contenedor
        );


    if (!contenedor) return;


    /*
     * Si el carrusel está abierto,
     * primero lo cerramos.
     */

    cerrarCarruselMultimedia();


    contenedor.classList.remove(
        "activo"
    );


    contenedor.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "historia-modal-abierta"
    );


    historiaFichaActual = null;
    historiaIdActual = null;

}


// =======================================================
// PINTAR HISTORIA
// =======================================================

function pintarHistoria(ficha) {

    if (!ficha) return;


    limpiarHistoria();

    pintarTitulo(ficha);
    pintarImagen(ficha);
    pintarResumen(ficha);
    pintarTexto(ficha);
    pintarCampos(ficha);
    pintarEtiquetas(ficha);
    pintarMultimedia(ficha);
    pintarRelacionadas(ficha);


    console.log(
        "[HISTORIA] Expediente pintado:",
        ficha.id_ficha
    );

}


// =======================================================
// LIMPIAR
// =======================================================

function limpiarHistoria() {

    limpiarElemento(
        CONFIG_HISTORIA.titulo
    );

    limpiarElemento(
        CONFIG_HISTORIA.resumen
    );

    limpiarElemento(
        CONFIG_HISTORIA.texto
    );

    limpiarElemento(
        CONFIG_HISTORIA.campos
    );

    limpiarElemento(
        CONFIG_HISTORIA.etiquetas
    );

    limpiarElemento(
        CONFIG_HISTORIA.multimedia
    );

    limpiarElemento(
        CONFIG_HISTORIA.relacionadas
    );

}


function limpiarElemento(id) {

    const elemento =
        document.getElementById(id);


    if (elemento) {

        elemento.innerHTML = "";

    }

}


// =======================================================
// TÍTULO
// =======================================================

function pintarTitulo(ficha) {

    const elemento =
        document.getElementById(
            CONFIG_HISTORIA.titulo
        );


    if (!elemento) return;


    elemento.textContent =
        ficha.titulo ||
        "EXPEDIENTE SIN TÍTULO";


    const numero =
        document.getElementById(
            "numeroHistoria"
        );


    if (numero) {

        numero.textContent =
            obtenerNumeroExpediente(
                ficha
            );

    }

}


function obtenerNumeroExpediente(ficha) {

    if (
        ficha.id_ficha !== undefined &&
        ficha.id_ficha !== null
    ) {

        return `EXP. Nº ${ficha.id_ficha}`;

    }


    return "EXP. Nº ----";

}


// =======================================================
// IMAGEN PRINCIPAL
// =======================================================

function pintarImagen(ficha) {

    const imagen =
        document.getElementById(
            CONFIG_HISTORIA.imagen
        );


    if (!imagen) return;


    imagen.src =
        obtenerImagen(ficha);


    imagen.alt =
        ficha.titulo ||
        "Fotografía de la ficha";


    const contenedor =
        imagen.closest(
            ".imagenHistoria"
        );


    if (contenedor) {

        contenedor.classList.toggle(
            "sin-imagen",
            !ficha.imagen
        );

    }

}


function obtenerImagen(ficha) {

    if (
        !ficha ||
        !ficha.imagen
    ) {

        return "/imagenes/default.png";

    }


    if (
        ficha.imagen.startsWith("/")
    ) {

        return ficha.imagen;

    }


    return "/" + ficha.imagen;

}


// =======================================================
// RESUMEN
// =======================================================

function pintarResumen(ficha) {

    const elemento =
        document.getElementById(
            CONFIG_HISTORIA.resumen
        );


    if (!elemento) return;


    if (!ficha.resumen) {

        elemento.classList.add(
            "oculto"
        );

        return;

    }


    elemento.classList.remove(
        "oculto"
    );


    elemento.textContent =
        ficha.resumen;

}


// =======================================================
// HISTORIA / TEXTO
// =======================================================

function pintarTexto(ficha) {

    const elemento =
        document.getElementById(
            CONFIG_HISTORIA.texto
        );


    if (!elemento) return;


    if (!ficha.texto) {

        elemento.classList.add(
            "oculto"
        );

        return;

    }


    elemento.classList.remove(
        "oculto"
    );


    elemento.textContent =
        ficha.texto;

}


// =======================================================
// CAMPOS
// =======================================================

function pintarCampos(ficha) {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.campos
        );


    if (!contenedor) return;


    const campos =
        ficha
            ?.plantilla
            ?.estructura
            ?.campos;


    if (!Array.isArray(campos)) return;


    campos.forEach(
        campo => {

            if (!campo) return;


            if (
                campo.mostrarHistoria !== true
            ) {

                return;

            }


            const valor =
                ficha
                    ?.datos_json
                    ?.[campo.nombre];


            if (
                valor === undefined ||
                valor === null ||
                valor === ""
            ) {

                return;

            }


            const fila =
                document.createElement(
                    "div"
                );


            fila.className =
                "historia-campo";


            const etiqueta =
                document.createElement(
                    "span"
                );


            etiqueta.className =
                "historia-campo-etiqueta";


            etiqueta.textContent =
                campo.etiqueta ||
                campo.nombre ||
                "";


            const valorElemento =
                document.createElement(
                    "span"
                );


            valorElemento.className =
                "historia-campo-valor";


            valorElemento.textContent =
                convertirValorTexto(
                    valor
                );


            fila.appendChild(
                etiqueta
            );


            fila.appendChild(
                valorElemento
            );


            contenedor.appendChild(
                fila
            );

        }
    );

}


function convertirValorTexto(valor) {

    if (Array.isArray(valor)) {

        return valor.join(", ");

    }


    if (
        typeof valor === "object" &&
        valor !== null
    ) {

        return JSON.stringify(valor);

    }


    return String(valor);

}


// =======================================================
// ETIQUETAS
// =======================================================

function pintarEtiquetas(ficha) {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.etiquetas
        );


    if (!contenedor) return;


    if (
        !Array.isArray(ficha.etiquetas) ||
        ficha.etiquetas.length === 0
    ) {

        contenedor.classList.add(
            "oculto"
        );

        return;

    }


    contenedor.classList.remove(
        "oculto"
    );


    ficha.etiquetas.forEach(
        etiqueta => {

            if (!etiqueta) return;


            const elemento =
                document.createElement(
                    "span"
                );


            elemento.className =
                "historia-etiqueta";


            elemento.textContent =
                etiqueta.nombre ||
                "";


            contenedor.appendChild(
                elemento
            );

        }
    );

}


// =======================================================
// MULTIMEDIA
// =======================================================

function pintarMultimedia(ficha) {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.multimedia
        );


    if (!contenedor) return;


    multimediaActual =
        Array.isArray(ficha.multimedia)
            ? ficha.multimedia
            : [];


    multimediaActual =
        multimediaActual.filter(
            archivo =>
                archivo &&
                obtenerRutaArchivo(
                    archivo.ruta_archivo
                )
        );


    if (
        multimediaActual.length === 0
    ) {

        contenedor.classList.add(
            "oculto"
        );

        return;

    }


    contenedor.classList.remove(
        "oculto"
    );


    multimediaActual.forEach(
        (archivo, indice) => {

            const elemento =
                crearElementoMultimedia(
                    archivo,
                    indice
                );


            if (elemento) {

                contenedor.appendChild(
                    elemento
                );

            }

        }
    );

}


// =======================================================
// CREAR MULTIMEDIA
// =======================================================

function crearElementoMultimedia(
    archivo,
    indice
) {

    const tarjeta =
        document.createElement(
            "button"
        );


    tarjeta.type =
        "button";


    tarjeta.className =
        "historia-media";


    tarjeta.setAttribute(
        "aria-label",
        "Abrir material histórico"
    );


    const ruta =
        obtenerRutaArchivo(
            archivo.ruta_archivo
        );


    if (!ruta) return null;


    const tipo =
        String(
            archivo.tipo_multi || ""
        ).toLowerCase();


    /*
     * IMAGEN
     */

    if (
        tipo.includes("image") ||
        tipo.includes("imagen") ||
        esImagen(ruta)
    ) {

        const imagen =
            document.createElement(
                "img"
            );


        imagen.src =
            ruta;


        imagen.alt =
            archivo.descripcion ||
            "Material histórico";


        imagen.loading =
            "lazy";


        tarjeta.appendChild(
            imagen
        );

    }


    /*
     * VIDEO
     */

    else if (
        tipo.includes("video") ||
        esVideo(ruta)
    ) {

        const video =
            document.createElement(
                "video"
            );


        video.src =
            ruta;


        video.preload =
            "metadata";


        video.muted =
            true;


        tarjeta.appendChild(
            video
        );

    }


    /*
     * AUDIO
     */

    else if (
        tipo.includes("audio") ||
        esAudio(ruta)
    ) {

        const icono =
            document.createElement(
                "div"
            );


        icono.className =
            "historia-media-audio";


        icono.textContent =
            "♫";


        tarjeta.appendChild(
            icono
        );

    }


    /*
     * DOCUMENTO
     */

    else {

        const documento =
            document.createElement(
                "div"
            );


        documento.className =
            "historia-media-documento";


        documento.textContent =
            "DOC";


        tarjeta.appendChild(
            documento
        );

    }


    /*
     * INFORMACIÓN
     */

    const info =
        document.createElement(
            "div"
        );


    info.className =
        "historia-media-info";


    const tipoTexto =
        document.createElement(
            "span"
        );


    tipoTexto.className =
        "historia-media-tipo";


    tipoTexto.textContent =
        obtenerTipoMultimedia(
            archivo,
            ruta
        );


    info.appendChild(
        tipoTexto
    );


    if (archivo.descripcion) {

        const descripcion =
            document.createElement(
                "p"
            );


        descripcion.className =
            "historia-media-descripcion";


        descripcion.textContent =
            archivo.descripcion;


        info.appendChild(
            descripcion
        );

    }


    tarjeta.appendChild(
        info
    );


    /*
     * CLICK
     */

    tarjeta.addEventListener(
        "click",
        () => {

            abrirCarruselMultimedia(
                indice
            );

        }
    );


    return tarjeta;

}


// =======================================================
// TIPO MULTIMEDIA
// =======================================================

function obtenerTipoMultimedia(
    archivo,
    ruta
) {

    const tipo =
        String(
            archivo.tipo_multi || ""
        ).toLowerCase();


    if (
        tipo.includes("image") ||
        tipo.includes("imagen") ||
        esImagen(ruta)
    ) {

        return "FOTOGRAFÍA";

    }


    if (
        tipo.includes("video") ||
        esVideo(ruta)
    ) {

        return "VIDEO";

    }


    if (
        tipo.includes("audio") ||
        esAudio(ruta)
    ) {

        return "AUDIO";

    }


    return "DOCUMENTO";

}


// =======================================================
// CARRUSEL MULTIMEDIA
// =======================================================

function prepararCarruselMultimedia() {

    if (
        document.getElementById(
            "carruselMultimedia"
        )
    ) {

        return;

    }


    const carrusel =
        document.createElement(
            "div"
        );


    carrusel.id =
        "carruselMultimedia";


    carrusel.className =
        "carruselMultimedia";


    carrusel.setAttribute(
        "aria-hidden",
        "true"
    );


    carrusel.innerHTML = `

        <div class="carrusel-fondo"></div>

        <div
            class="carrusel-ventana"
            role="dialog"
            aria-modal="true"
            aria-label="Material histórico"
        >

            <header class="carrusel-cabecera">

                <span class="carrusel-etiqueta">
                    MATERIAL HISTÓRICO
                </span>

                <span
                    class="carrusel-contador"
                    id="carruselContador"
                >
                    1 / 1
                </span>

                <button
                    type="button"
                    class="carrusel-cerrar"
                    aria-label="Cerrar multimedia"
                >
                    ×
                </button>

            </header>


            <div class="carrusel-contenido">

                <button
                    type="button"
                    class="carrusel-flecha carrusel-anterior"
                    aria-label="Multimedia anterior"
                >
                    ‹
                </button>


                <div
                    class="carrusel-media"
                    id="carruselMedia"
                ></div>


                <button
                    type="button"
                    class="carrusel-flecha carrusel-siguiente"
                    aria-label="Multimedia siguiente"
                >
                    ›
                </button>

            </div>


            <div
                class="carrusel-descripcion"
                id="carruselDescripcion"
            ></div>

        </div>
    `;


    document.body.appendChild(
        carrusel
    );


    carrusel
        .querySelector(".carrusel-fondo")
        .addEventListener(
            "click",
            cerrarCarruselMultimedia
        );


    carrusel
        .querySelector(".carrusel-cerrar")
        .addEventListener(
            "click",
            cerrarCarruselMultimedia
        );


    carrusel
        .querySelector(".carrusel-anterior")
        .addEventListener(
            "click",
            multimediaAnterior
        );


    carrusel
        .querySelector(".carrusel-siguiente")
        .addEventListener(
            "click",
            multimediaSiguiente
        );

}


// =======================================================
// ABRIR CARRUSEL
// =======================================================

function abrirCarruselMultimedia(indice) {

    if (
        !multimediaActual.length
    ) {

        return;

    }


    multimediaIndiceActual =
        indice;


    const carrusel =
        document.getElementById(
            "carruselMultimedia"
        );


    if (!carrusel) return;


    carrusel.classList.add(
        "activo"
    );


    carrusel.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "carrusel-abierto"
    );


    pintarCarruselActual();

}


// =======================================================
// PINTAR ELEMENTO DEL CARRUSEL
// =======================================================

function pintarCarruselActual() {

    const archivo =
        multimediaActual[
            multimediaIndiceActual
        ];


    if (!archivo) return;


    const contenedor =
        document.getElementById(
            "carruselMedia"
        );


    const descripcion =
        document.getElementById(
            "carruselDescripcion"
        );


    const contador =
        document.getElementById(
            "carruselContador"
        );


    if (!contenedor) return;


    contenedor.innerHTML =
        "";


    const ruta =
        obtenerRutaArchivo(
            archivo.ruta_archivo
        );


    const tipo =
        String(
            archivo.tipo_multi || ""
        ).toLowerCase();


    /*
     * IMAGEN
     */

    if (
        tipo.includes("image") ||
        tipo.includes("imagen") ||
        esImagen(ruta)
    ) {

        const imagen =
            document.createElement(
                "img"
            );


        imagen.className =
            "carrusel-imagen";


        imagen.src =
            ruta;


        imagen.alt =
            archivo.descripcion ||
            "Material histórico";


        contenedor.appendChild(
            imagen
        );

    }


    /*
     * VIDEO
     */

    else if (
        tipo.includes("video") ||
        esVideo(ruta)
    ) {

        const video =
            document.createElement(
                "video"
            );


        video.className =
            "carrusel-video";


        video.controls =
            true;


        video.autoplay =
            true;


        video.preload =
            "metadata";


        video.src =
            ruta;


        contenedor.appendChild(
            video
        );

    }


    /*
     * AUDIO
     */

    else if (
        tipo.includes("audio") ||
        esAudio(ruta)
    ) {

        const audioContenedor =
            document.createElement(
                "div"
            );


        audioContenedor.className =
            "carrusel-audio";


        const icono =
            document.createElement(
                "div"
            );


        icono.className =
            "carrusel-audio-icono";


        icono.textContent =
            "♫";


        const audio =
            document.createElement(
                "audio"
            );


        audio.controls =
            true;


        audio.src =
            ruta;


        audioContenedor.appendChild(
            icono
        );


        audioContenedor.appendChild(
            audio
        );


        contenedor.appendChild(
            audioContenedor
        );

    }


    /*
     * DOCUMENTO
     */

    else {

        const documento =
            document.createElement(
                "div"
            );


        documento.className =
            "carrusel-documento";


        documento.innerHTML = `
            <div class="carrusel-documento-icono">
                DOC
            </div>

            <a
                href="${ruta}"
                target="_blank"
                rel="noopener"
            >
                ABRIR DOCUMENTO
            </a>
        `;


        contenedor.appendChild(
            documento
        );

    }


    if (contador) {

        contador.textContent =
            `${multimediaIndiceActual + 1} / ${multimediaActual.length}`;

    }


    if (descripcion) {

        descripcion.textContent =
            archivo.descripcion ||
            obtenerTipoMultimedia(
                archivo,
                ruta
            );

    }


    actualizarFlechasCarrusel();

}


// =======================================================
// FLECHAS
// =======================================================

function actualizarFlechasCarrusel() {

    const anterior =
        document.querySelector(
            ".carrusel-anterior"
        );


    const siguiente =
        document.querySelector(
            ".carrusel-siguiente"
        );


    if (!anterior || !siguiente) return;


    const cantidad =
        multimediaActual.length;


    /*
     * Si hay uno solo,
     * no necesitamos flechas.
     */

    anterior.style.visibility =
        cantidad > 1
            ? "visible"
            : "hidden";


    siguiente.style.visibility =
        cantidad > 1
            ? "visible"
            : "hidden";

}


// =======================================================
// ANTERIOR
// =======================================================

function multimediaAnterior() {

    if (
        multimediaActual.length <= 1
    ) {

        return;

    }


    multimediaIndiceActual--;


    if (
        multimediaIndiceActual < 0
    ) {

        multimediaIndiceActual =
            multimediaActual.length - 1;

    }


    pintarCarruselActual();

}


// =======================================================
// SIGUIENTE
// =======================================================

function multimediaSiguiente() {

    if (
        multimediaActual.length <= 1
    ) {

        return;

    }


    multimediaIndiceActual++;


    if (
        multimediaIndiceActual >=
        multimediaActual.length
    ) {

        multimediaIndiceActual = 0;

    }


    pintarCarruselActual();

}


// =======================================================
// CERRAR CARRUSEL
// =======================================================

function cerrarCarruselMultimedia() {

    const carrusel =
        document.getElementById(
            "carruselMultimedia"
        );


    if (!carrusel) return;


    carrusel.classList.remove(
        "activo"
    );


    carrusel.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "carrusel-abierto"
    );


    const contenedor =
        document.getElementById(
            "carruselMedia"
        );


    if (contenedor) {

        contenedor.innerHTML =
            "";

    }

}


// =======================================================
// RUTAS
// =======================================================

function obtenerRutaArchivo(ruta) {

    if (!ruta) return "";


    if (
        ruta.startsWith("/")
    ) {

        return ruta;

    }


    return "/" + ruta;

}


function esImagen(ruta) {

    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
        ruta
    );

}


function esVideo(ruta) {

    return /\.(mp4|webm|ogg|mov)$/i.test(
        ruta
    );

}


function esAudio(ruta) {

    return /\.(mp3|wav|ogg|m4a|aac)$/i.test(
        ruta
    );

}


// =======================================================
// RELACIONADAS
// =======================================================
// =======================================================
// RELACIONADAS
// =======================================================
// =======================================================
// FICHAS RELACIONADAS
// =======================================================

function pintarRelacionadas(ficha) {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.relacionadas
        );

    if (!contenedor) return;

    // Limpiar contenido anterior
    contenedor.innerHTML = "";

    if (
        !Array.isArray(ficha.relacionadas) ||
        ficha.relacionadas.length === 0
    ) {

        contenedor.classList.add("oculto");

        return;
    }

    contenedor.classList.remove("oculto");


    ficha.relacionadas.forEach(
        relacionada => {

            if (!relacionada) return;


            // =========================================
            // TARJETA
            // =========================================

            const tarjeta =
                document.createElement(
                    "article"
                );

            tarjeta.className =
                "historia-relacionada";


            const idFicha =
                relacionada.id_ficha;


            if (
                idFicha !== undefined &&
                idFicha !== null
            ) {

                tarjeta.dataset.idFicha =
                    idFicha;

            }


            // =========================================
            // IMAGEN
            // =========================================

            const imagen =
                document.createElement(
                    "img"
                );

            imagen.className =
                "historia-relacionada-imagen";

            imagen.src =
                obtenerImagen(
                    relacionada
                );

            imagen.alt =
                relacionada.titulo ||
                "Ficha relacionada";

            imagen.loading =
                "lazy";


            imagen.addEventListener(
                "error",
                () => {

                    if (
                        imagen.src.endsWith(
                            "/imagenes/default.png"
                        )
                    ) {

                        return;

                    }

                    imagen.src =
                        "/imagenes/default.png";

                }
            );


            tarjeta.appendChild(
                imagen
            );


            // =========================================
            // ÚNICA LÍNEA DIVISORIA
            // =========================================

            const divisor =
                document.createElement(
                    "div"
                );

            divisor.className =
                "historia-relacionada-divisor";

            tarjeta.appendChild(
                divisor
            );


            // =========================================
            // CONTENIDO
            // =========================================

            const contenido =
                document.createElement(
                    "div"
                );

            contenido.className =
                "historia-relacionada-contenido";


            // =========================================
            // RELACIÓN
            // =========================================

            if (
                relacionada.tipo_relacion
            ) {

                const relacion =
                    document.createElement(
                        "span"
                    );

                relacion.className =
                    "historia-relacionada-relacion";

                relacion.textContent =
                    "RELACIÓN · " +
                    relacionada.tipo_relacion;

                contenido.appendChild(
                    relacion
                );

            }


            // =========================================
            // TÍTULO
            // =========================================

            const titulo =
                document.createElement(
                    "h3"
                );

            titulo.className =
                "historia-relacionada-titulo";

            titulo.textContent =
                relacionada.titulo ||
                "Ficha sin título";

            contenido.appendChild(
                titulo
            );


            // =========================================
            // MENÚ
            // =========================================

            if (
                relacionada.menu
            ) {

                const menu =
                    document.createElement(
                        "span"
                    );

                menu.className =
                    "historia-relacionada-menu";

                menu.textContent =
                    relacionada.menu;

                contenido.appendChild(
                    menu
                );

            }


            // =========================================
            // BOTÓN
            // =========================================

            const boton =
                document.createElement(
                    "button"
                );

            boton.type =
                "button";

            boton.className =
                "historia-relacionada-ver";

            boton.textContent =
                "VER FICHA →";


            boton.addEventListener(
                "click",
                evento => {

                    evento.stopPropagation();


                    if (
                        idFicha !== undefined &&
                        idFicha !== null
                    ) {

                        abrirHistoriaCompleta(
                            idFicha
                        );

                    }

                }
            );


            contenido.appendChild(
                boton
            );


            tarjeta.appendChild(
                contenido
            );


            // =========================================
            // CLICK EN TODA LA TARJETA
            // =========================================

            tarjeta.addEventListener(
                "click",
                () => {

                    if (
                        idFicha !== undefined &&
                        idFicha !== null
                    ) {

                        abrirHistoriaCompleta(
                            idFicha
                        );

                    }

                }
            );


            contenedor.appendChild(
                tarjeta
            );

        }
    );

}

// =======================================================
// ESTADOS
// =======================================================

function mostrarHistoriaCarga() {

    const estado =
        document.getElementById(
            "estadoHistoria"
        );


    if (!estado) return;


    estado.className =
        "historia-estado estado-cargando";


    estado.innerHTML = `
        <span class="historia-estado-icono">◌</span>
        <span class="historia-estado-texto">
            CONSULTANDO EXPEDIENTE...
        </span>
    `;


    estado.hidden =
        false;


    estado.classList.remove(
        "oculto"
    );

}


function mostrarHistoriaError() {

    const estado =
        document.getElementById(
            "estadoHistoria"
        );


    if (!estado) return;


    estado.className =
        "historia-estado estado-error";


    estado.innerHTML = `
        <span class="historia-estado-icono">✕</span>
        <span class="historia-estado-texto">
            NO FUE POSIBLE CONSULTAR EL EXPEDIENTE.
        </span>
    `;


    estado.hidden =
        false;


    estado.classList.remove(
        "oculto"
    );

}


function ocultarEstadoHistoria() {

    const estado =
        document.getElementById(
            "estadoHistoria"
        );


    if (!estado) return;


    estado.hidden =
        true;


    estado.classList.add(
        "oculto"
    );

}


// =======================================================
// ARRASTRAR EXPEDIENTE
// =======================================================

function hacerHistoriaMovible() {

    const ventana =
        document.querySelector(
            ".expedienteHistoria"
        );


    if (!ventana) {

        console.warn(
            "[HISTORIA] No se encontró .expedienteHistoria"
        );

        return;

    }


    let moviendo = false;

    let offsetX = 0;
    let offsetY = 0;


    ventana.addEventListener(
        "mousedown",
        iniciarMovimiento
    );


    function iniciarMovimiento(evento) {

        if (
            evento.target.closest(
                ".cerrarHistoria"
            )
        ) {

            return;

        }


        if (
            evento.target.closest(
                ".historia-relacionada"
            )
        ) {

            return;

        }


        if (
            evento.target.closest(
                ".historia-media"
            )
        ) {

            return;

        }


        if (
            evento.target.closest(
                "button, a, input, video, audio"
            )
        ) {

            return;

        }


        const rect =
            ventana.getBoundingClientRect();


        offsetX =
            evento.clientX -
            rect.left;


        offsetY =
            evento.clientY -
            rect.top;


        ventana.style.transform =
            "none";


        ventana.style.left =
            rect.left + "px";


        ventana.style.top =
            rect.top + "px";


        moviendo = true;


        ventana.classList.add(
            "arrastrando"
        );


        document.body.style.userSelect =
            "none";


        evento.preventDefault();

    }


    document.addEventListener(
        "mousemove",
        moverVentana
    );


    function moverVentana(evento) {

        if (!moviendo) return;


        let x =
            evento.clientX -
            offsetX;


        let y =
            evento.clientY -
            offsetY;


        const ancho =
            ventana.offsetWidth;


        const alto =
            ventana.offsetHeight;


        const margen =
            25;


        const minimoX =
            margen -
            ancho +
            120;


        const maximoX =
            window.innerWidth -
            120;


        const minimoY =
            0;


        const maximoY =
            window.innerHeight -
            70;


        x =
            Math.max(
                minimoX,
                Math.min(
                    x,
                    maximoX
                )
            );


        y =
            Math.max(
                minimoY,
                Math.min(
                    y,
                    maximoY
                )
            );


        ventana.style.left =
            x + "px";


        ventana.style.top =
            y + "px";

    }


    document.addEventListener(
        "mouseup",
        terminarMovimiento
    );


    function terminarMovimiento() {

        if (!moviendo) return;


        moviendo = false;


        ventana.classList.remove(
            "arrastrando"
        );


        document.body.style.userSelect =
            "";

    }

}


// =======================================================
// FUNCIONES PÚBLICAS
// =======================================================

window.historiaCompleta = {

    abrir:
        abrirHistoriaCompleta,

    cerrar:
        cerrarHistoriaCompleta,

    obtenerActual:
        () => historiaFichaActual

};


window.abrirHistoriaCompleta =
    abrirHistoriaCompleta;


window.cerrarHistoriaCompleta =
    cerrarHistoriaCompleta;


console.log(
    "[HISTORIA] historiaCompleta.js cargado correctamente."
);