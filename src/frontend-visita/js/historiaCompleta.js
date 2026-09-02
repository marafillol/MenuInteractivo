// =======================================================
// HISTORIA COMPLETA
// Museo Malvinas · Archivo Histórico
//
// RESPONSABILIDADES:
//
// • Obtener una ficha individual desde la API
// • Mostrar el expediente completo
// • Mostrar fotografía
// • Mostrar campos dinámicos de la plantilla
// • Mostrar etiquetas
// • Mostrar multimedia
// • Mostrar fichas relacionadas
// • Abrir y cerrar el expediente
//
// IMPORTANTE:
//
// Este archivo NO depende todavía del Explorador.
// El Explorador se conectará más adelante.
//
// Endpoint utilizado:
//
// GET /api/public/fichas/:id_ficha
// =======================================================


// =======================================================
// CONFIGURACIÓN
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


// =======================================================
// INICIALIZACIÓN
// =======================================================

document.addEventListener(
    "DOMContentLoaded",
    iniciarHistoriaCompleta
);


function iniciarHistoriaCompleta() {

    console.log(
        "[HISTORIA] Inicializando..."
    );


    prepararEventosHistoria();


    console.log(
        "[HISTORIA] Inicialización completa."
    );

}


// =======================================================
// PREPARAR EVENTOS
// =======================================================

function prepararEventosHistoria() {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.contenedor
        );


    if (!contenedor) {

        return;

    }


    /*
       Cerrar haciendo clic
       fuera del expediente.
    */

    contenedor.addEventListener(
        "click",
        evento => {

            if (
                evento.target === contenedor ||
                evento.target.classList.contains(
                    "historia-overlay"
                )
            ) {

                cerrarHistoriaCompleta();

            }

        }
    );


    /*
       Cerrar con ESC.
    */

    document.addEventListener(
        "keydown",
        evento => {

            if (
                evento.key === "Escape"
            ) {

                cerrarHistoriaCompleta();

            }

        }
    );

}


// =======================================================
// ABRIR HISTORIA COMPLETA
// =======================================================
//
// Esta es la función que utiliza fichas.js:
//
// abrirHistoriaCompleta(idFicha)
//
// =======================================================

async function abrirHistoriaCompleta(
    idFicha
) {

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


    historiaIdActual =
        idFicha;


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


    }
    catch (error) {

        console.error(
            "[HISTORIA] Error:",
            error
        );


        mostrarHistoriaError();

    }

}


// =======================================================
// OBTENER FICHA
// =======================================================

async function obtenerFicha(
    idFicha
) {

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


    const ficha =
        await respuesta.json();


    return ficha;

}


// =======================================================
// MOSTRAR VENTANA
// =======================================================

function mostrarHistoriaCompleta() {

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


    contenedor.classList.add(
        "activo"
    );


    contenedor.setAttribute(
        "aria-hidden",
        "false"
    );


    /*
       Evitamos que el fondo
       pueda desplazarse mientras
       el expediente está abierto.
    */

    document.body.classList.add(
        "historia-modal-abierta"
    );

}


// =======================================================
// CERRAR VENTANA
// =======================================================

function cerrarHistoriaCompleta() {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.contenedor
        );


    if (!contenedor) {

        return;

    }


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


    historiaFichaActual =
        null;


    historiaIdActual =
        null;


    console.log(
        "[HISTORIA] Expediente cerrado."
    );

}


// =======================================================
// PINTAR HISTORIA
// =======================================================

function pintarHistoria(
    ficha
) {

    if (!ficha) {

        return;

    }


    limpiarHistoria();


    pintarTitulo(
        ficha
    );


    pintarImagen(
        ficha
    );


    pintarResumen(
        ficha
    );


    pintarTexto(
        ficha
    );


    pintarCampos(
        ficha
    );


    pintarEtiquetas(
        ficha
    );


    pintarMultimedia(
        ficha
    );


    pintarRelacionadas(
        ficha
    );


    console.log(
        "[HISTORIA] Expediente pintado:",
        ficha.id_ficha
    );

}


// =======================================================
// LIMPIAR HISTORIA
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


// =======================================================
// LIMPIAR ELEMENTO
// =======================================================

function limpiarElemento(
    id
) {

    const elemento =
        document.getElementById(id);


    if (elemento) {

        elemento.innerHTML = "";

    }

}


// =======================================================
// TÍTULO
// =======================================================

function pintarTitulo(
    ficha
) {

    const elemento =
        document.getElementById(
            CONFIG_HISTORIA.titulo
        );


    if (!elemento) {

        return;

    }


    elemento.textContent =
        ficha.titulo ||
        "EXPEDIENTE SIN TÍTULO";


    /*
       También colocamos el número
       de expediente si existe.
    */

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


// =======================================================
// NÚMERO DE EXPEDIENTE
// =======================================================

function obtenerNumeroExpediente(
    ficha
) {

    if (
        ficha.id_ficha !== undefined &&
        ficha.id_ficha !== null
    ) {

        return `EXP. Nº ${ficha.id_ficha}`;

    }


    return "EXP. Nº ----";

}


// =======================================================
// IMAGEN
// =======================================================

function pintarImagen(
    ficha
) {

    const imagen =
        document.getElementById(
            CONFIG_HISTORIA.imagen
        );


    if (!imagen) {

        return;

    }


    imagen.src =
        obtenerImagen(
            ficha
        );


    imagen.alt =
        ficha.titulo ||
        "Fotografía de la ficha";


    /*
       Si no existe fotografía,
       agregamos una clase para
       que el CSS pueda tratarla
       de manera diferente.
    */

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


// =======================================================
// OBTENER RUTA DE IMAGEN
// =======================================================

function obtenerImagen(
    ficha
) {

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

function pintarResumen(
    ficha
) {

    const elemento =
        document.getElementById(
            CONFIG_HISTORIA.resumen
        );


    if (!elemento) {

        return;

    }


    if (
        !ficha.resumen
    ) {

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
// TEXTO / HISTORIA
// =======================================================

function pintarTexto(
    ficha
) {

    const elemento =
        document.getElementById(
            CONFIG_HISTORIA.texto
        );


    if (!elemento) {

        return;

    }


    if (
        !ficha.texto
    ) {

        elemento.classList.add(
            "oculto"
        );

        return;

    }


    elemento.classList.remove(
        "oculto"
    );


    /*
       textContent en lugar de innerHTML
       para evitar insertar HTML
       proveniente de la base de datos.
    */

    elemento.textContent =
        ficha.texto;

}


// =======================================================
// CAMPOS DINÁMICOS
// =======================================================

function pintarCampos(
    ficha
) {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.campos
        );


    if (!contenedor) {

        return;

    }


    const campos =
        ficha
            ?.plantilla
            ?.estructura
            ?.campos;


    if (
        !Array.isArray(campos)
    ) {

        return;

    }


    campos.forEach(
        campo => {

            if (!campo) {

                return;

            }


            /*
               En la historia mostramos
               los campos marcados como:

               mostrarHistoria: true
            */

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


// =======================================================
// CONVERTIR VALORES
// =======================================================

function convertirValorTexto(
    valor
) {

    if (
        Array.isArray(valor)
    ) {

        return valor.join(
            ", "
        );

    }


    if (
        typeof valor === "object" &&
        valor !== null
    ) {

        return JSON.stringify(
            valor
        );

    }


    return String(
        valor
    );

}


// =======================================================
// ETIQUETAS
// =======================================================

function pintarEtiquetas(
    ficha
) {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.etiquetas
        );


    if (!contenedor) {

        return;

    }


    if (
        !Array.isArray(
            ficha.etiquetas
        ) ||
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

            if (!etiqueta) {

                return;

            }


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

function pintarMultimedia(
    ficha
) {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.multimedia
        );


    if (!contenedor) {

        return;

    }


    if (
        !Array.isArray(
            ficha.multimedia
        ) ||
        ficha.multimedia.length === 0
    ) {

        contenedor.classList.add(
            "oculto"
        );

        return;

    }


    contenedor.classList.remove(
        "oculto"
    );


    ficha.multimedia.forEach(
        archivo => {

            if (!archivo) {

                return;

            }


            const elemento =
                crearElementoMultimedia(
                    archivo
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
    archivo
) {

    const tarjeta =
        document.createElement(
            "div"
        );


    tarjeta.className =
        "historia-media";


    const ruta =
        obtenerRutaArchivo(
            archivo.ruta_archivo
        );


    if (!ruta) {

        return null;

    }


    const tipo =
        String(
            archivo.tipo_multi || ""
        ).toLowerCase();


    /*
       IMAGEN
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
       VIDEO
    */

    else if (
        tipo.includes("video") ||
        esVideo(ruta)
    ) {

        const video =
            document.createElement(
                "video"
            );


        video.controls =
            true;


        video.preload =
            "metadata";


        video.src =
            ruta;


        tarjeta.appendChild(
            video
        );

    }


    /*
       AUDIO
    */

    else if (
        tipo.includes("audio") ||
        esAudio(ruta)
    ) {

        const audio =
            document.createElement(
                "audio"
            );


        audio.controls =
            true;


        audio.src =
            ruta;


        tarjeta.appendChild(
            audio
        );

    }


    /*
       OTRO ARCHIVO
    */

    else {

        const enlace =
            document.createElement(
                "a"
            );


        enlace.href =
            ruta;


        enlace.target =
            "_blank";


        enlace.rel =
            "noopener";


        enlace.textContent =
            archivo.descripcion ||
            "Abrir documento";


        tarjeta.appendChild(
            enlace
        );

    }


    /*
       Descripción
    */

    if (
        archivo.descripcion
    ) {

        const descripcion =
            document.createElement(
                "p"
            );


        descripcion.textContent =
            archivo.descripcion;


        tarjeta.appendChild(
            descripcion
        );

    }


    return tarjeta;

}


// =======================================================
// RUTA DE ARCHIVO
// =======================================================

function obtenerRutaArchivo(
    ruta
) {

    if (!ruta) {

        return "";

    }


    if (
        ruta.startsWith("/")
    ) {

        return ruta;

    }


    return "/" + ruta;

}


// =======================================================
// DETECTAR IMAGEN
// =======================================================

function esImagen(
    ruta
) {

    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
        ruta
    );

}


// =======================================================
// DETECTAR VIDEO
// =======================================================

function esVideo(
    ruta
) {

    return /\.(mp4|webm|ogg|mov)$/i.test(
        ruta
    );

}


// =======================================================
// DETECTAR AUDIO
// =======================================================

function esAudio(
    ruta
) {

    return /\.(mp3|wav|ogg|m4a|aac)$/i.test(
        ruta
    );

}


// =======================================================
// FICHAS RELACIONADAS
// =======================================================

function pintarRelacionadas(
    ficha
) {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.relacionadas
        );


    if (!contenedor) {

        return;

    }


    if (
        !Array.isArray(
            ficha.relacionadas
        ) ||
        ficha.relacionadas.length === 0
    ) {

        contenedor.classList.add(
            "oculto"
        );

        return;

    }


    contenedor.classList.remove(
        "oculto"
    );


    ficha.relacionadas.forEach(
        relacionada => {

            if (!relacionada) {

                return;

            }


            const elemento =
                document.createElement(
                    "button"
                );


            elemento.type =
                "button";


            elemento.className =
                "historia-relacionada";


            elemento.dataset.id =
                relacionada.id_ficha ??
                "";


            const info =
                document.createElement(
                    "span"
                );


            info.className =
                "historia-relacionada-info";


            const titulo =
                document.createElement(
                    "span"
                );


            titulo.className =
                "historia-relacionada-titulo";


            titulo.textContent =
                relacionada.titulo ||
                "Ficha sin título";


            info.appendChild(
                titulo
            );


            if (
                relacionada.menu
            ) {

                const menu =
                    document.createElement(
                        "small"
                    );


                menu.className =
                    "historia-relacionada-menu";


                menu.textContent =
                    relacionada.menu;


                info.appendChild(
                    menu
                );

            }


            elemento.appendChild(
                info
            );


            elemento.addEventListener(
                "click",
                () => {

                    abrirHistoriaCompleta(
                        relacionada.id_ficha
                    );

                }
            );


            contenedor.appendChild(
                elemento
            );

        }
    );

}


// =======================================================
// ESTADO DE CARGA
// =======================================================

function mostrarHistoriaCarga() {

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.contenedor
        );


    if (!contenedor) {

        return;

    }


    const estado =
        document.getElementById(
            "estadoHistoria"
        );


    if (!estado) {

        return;

    }


    estado.className =
        "historia-estado estado-cargando";


    estado.innerHTML = `
        <span class="historia-estado-icono">◌</span>
        <span class="historia-estado-texto">CONSULTANDO EXPEDIENTE...</span>
    `;


    estado.hidden =
        false;

    estado.classList.remove(
        "oculto"
    );

}


// =======================================================
// ESTADO DE ERROR
// =======================================================

function mostrarHistoriaError() {

    const estado =
        document.getElementById(
            "estadoHistoria"
        );


    if (!estado) {

        return;

    }


    estado.className =
        "historia-estado estado-error";


    estado.innerHTML = `
        <span class="historia-estado-icono">✕</span>
        <span class="historia-estado-texto">NO FUE POSIBLE CONSULTAR EL EXPEDIENTE.</span>
    `;


    estado.hidden =
        false;

    estado.classList.remove(
        "oculto"
    );

}


// =======================================================
// OCULTAR ESTADO
// =======================================================

function ocultarEstadoHistoria() {

    const estado =
        document.getElementById(
            "estadoHistoria"
        );


    if (!estado) {

        return;

    }


    estado.hidden =
        true;

    estado.classList.add(
        "oculto"
    );

}


// =======================================================
// VOLVER A PINTAR DESPUÉS DE CARGAR
// =======================================================
//
// Si el HTML utiliza #estadoHistoria,
// ocultamos el mensaje cuando
// la ficha fue cargada correctamente.
//

function finalizarCargaHistoria() {

    ocultarEstadoHistoria();

}


// =======================================================
// FUNCIÓN PÚBLICA
// =======================================================

window.historiaCompleta = {

    abrir: abrirHistoriaCompleta,

    cerrar: cerrarHistoriaCompleta,

    obtenerActual: () => {

        return historiaFichaActual;

    }

};


// =======================================================
// COMPATIBILIDAD CON fichas.js
// =======================================================
//
// fichas.js busca específicamente:
//
// typeof abrirHistoriaCompleta === "function"
//
// Por eso exponemos también la función
// directamente en window.
//

window.abrirHistoriaCompleta =
    abrirHistoriaCompleta;


window.cerrarHistoriaCompleta =
    cerrarHistoriaCompleta;


// =======================================================
// LOG
// =======================================================

console.log(
    "[HISTORIA] historiaCompleta.js cargado correctamente."
);