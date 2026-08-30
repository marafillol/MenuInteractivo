// =======================================================
// FICHAS
// Museo Malvinas · Archivo Histórico
//
// RESPONSABILIDADES:
// • Cargar fichas
// • Filtrar fichas
// • Construir tarjetas
// • Mostrar fotografías
// • Mostrar campos de la plantilla
// • Activar interacción
//
// IMPORTANTE:
// Todavía NO se conecta directamente con el Explorador.
// Tampoco se modifica la lógica de la base de datos.
// =======================================================


// =======================================================
// ESTADO
// =======================================================

let fichasCargadas = [];

let fichasVisibles = [];


// =======================================================
// CONFIGURACIÓN
// =======================================================

const CONFIG_FICHAS = {

    api: "/api/public/fichas",

    plantilla: "html/ficha.html",

    imagenDefecto: "/imagenes/default.png",

    contenedor: "contenedorFichas",

    buscador: "buscador"

};


// =======================================================
// INICIALIZACIÓN
// =======================================================

document.addEventListener(
    "DOMContentLoaded",
    iniciarFichas
);


async function iniciarFichas() {

    console.log(
        "[FICHAS] Inicializando..."
    );


    prepararBuscador();

    prepararContenedor();


    /*
       Por ahora cargamos todas las fichas.

       Más adelante el Explorador podrá
       llamar directamente a:

       cargarFichas(idMenu)
    */

    await cargarFichas();


    console.log(
        "[FICHAS] Inicialización completa."
    );

}


// =======================================================
// PREPARAR CONTENEDOR
// =======================================================

function prepararContenedor() {

    const contenedor =
        document.getElementById(
            CONFIG_FICHAS.contenedor
        );


    if (!contenedor) {

        console.warn(
            "[FICHAS] No existe #contenedorFichas."
        );

        return;

    }


    contenedor.setAttribute(
        "aria-live",
        "polite"
    );

}


// =======================================================
// PREPARAR BUSCADOR
// =======================================================

function prepararBuscador() {

    const buscador =
        document.getElementById(
            CONFIG_FICHAS.buscador
        );


    if (!buscador) {

        return;

    }


    buscador.addEventListener(
        "input",
        buscarFichas
    );


    const limpiar =
        document.getElementById(
            "limpiarBusqueda"
        );


    if (limpiar) {

        limpiar.addEventListener(
            "click",
            limpiarBusqueda
        );

    }

}


// =======================================================
// CARGAR FICHAS
// =======================================================

async function cargarFichas(
    idMenu = null
) {

    const contenedor =
        document.getElementById(
            CONFIG_FICHAS.contenedor
        );


    if (!contenedor) {

        console.warn(
            "[FICHAS] No existe el contenedor."
        );

        return;

    }


    try {

        mostrarEstadoCarga();


        let url =
            CONFIG_FICHAS.api;


        /*
           Si posteriormente el Explorador
           selecciona un menú, se utilizará:

           /api/public/fichas/menu/ID
        */

        if (
            idMenu !== null &&
            idMenu !== undefined &&
            idMenu !== 0 &&
            idMenu !== ""
        ) {

            url =
                `${CONFIG_FICHAS.api}/menu/${idMenu}`;

        }


        console.log(
            "[FICHAS] Cargando:",
            url
        );


        const respuesta =
            await fetch(url);


        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );

        }


        const datos =
            await respuesta.json();


        if (!Array.isArray(datos)) {

            throw new Error(
                "La API no devolvió un array de fichas."
            );

        }


        fichasCargadas =
            datos;


        fichasVisibles =
            [...fichasCargadas];


        console.log(
            `[FICHAS] ${fichasCargadas.length} fichas cargadas.`
        );


        await pintarFichas(
            fichasVisibles
        );


    }
    catch (error) {

        console.error(
            "[FICHAS] Error cargando fichas:",
            error
        );


        mostrarEstadoVacio(
            "No se pudieron cargar las fichas."
        );

    }

}


// =======================================================
// BUSCAR FICHAS
// =======================================================

function buscarFichas() {

    const buscador =
        document.getElementById(
            CONFIG_FICHAS.buscador
        );


    if (!buscador) {

        return;

    }


    const texto =
        normalizarTexto(
            buscador.value
        );


    /*
       Sin texto:

       mostramos nuevamente todas.
    */

    if (!texto) {

        fichasVisibles =
            [...fichasCargadas];


        pintarFichas(
            fichasVisibles
        );


        return;

    }


    fichasVisibles =
        fichasCargadas.filter(
            ficha => fichaCoincide(
                ficha,
                texto
            )
        );


    pintarFichas(
        fichasVisibles
    );

}


// =======================================================
// COMPROBAR COINCIDENCIA
// =======================================================

function fichaCoincide(
    ficha,
    texto
) {

    if (!ficha) {

        return false;

    }


    /*
       Buscamos principalmente por título.
    */

    const titulo =
        normalizarTexto(
            ficha.titulo
        );


    if (
        titulo.includes(texto)
    ) {

        return true;

    }


    /*
       También buscamos dentro
       de los datos de la ficha.
    */

    if (
        ficha.datos_json &&
        typeof ficha.datos_json === "object"
    ) {

        const datos =
            Object.values(
                ficha.datos_json
            )
            .join(" ");


        if (
            normalizarTexto(
                datos
            ).includes(texto)
        ) {

            return true;

        }

    }


    return false;

}


// =======================================================
// NORMALIZAR TEXTO
// =======================================================

function normalizarTexto(
    texto
) {

    return String(
        texto ?? ""
    )
    .toLowerCase()
    .normalize("NFD")
    .replace(
        /[\u0300-\u036f]/g,
        ""
    )
    .trim();

}


// =======================================================
// LIMPIAR BÚSQUEDA
// =======================================================

function limpiarBusqueda() {

    const buscador =
        document.getElementById(
            CONFIG_FICHAS.buscador
        );


    if (!buscador) {

        return;

    }


    buscador.value = "";


    fichasVisibles =
        [...fichasCargadas];


    pintarFichas(
        fichasVisibles
    );


    buscador.focus();

}


// =======================================================
// PINTAR FICHAS
// =======================================================

async function pintarFichas(
    fichas
) {

    const contenedor =
        document.getElementById(
            CONFIG_FICHAS.contenedor
        );


    if (!contenedor) {

        console.warn(
            "[FICHAS] No existe #contenedorFichas."
        );

        return;

    }


    contenedor.innerHTML = "";


    /*
       Sin resultados.
    */

    if (
        !Array.isArray(fichas) ||
        fichas.length === 0
    ) {

        mostrarEstadoVacio(
            "No se encontraron fichas."
        );

        return;

    }


    /*
       Construimos cada ficha.
    */

    fichas.forEach(
        ficha => {

            const tarjeta =
                crearTarjetaFicha(
                    ficha
                );


            if (tarjeta) {

                contenedor.appendChild(
                    tarjeta
                );

            }

        }
    );


    activarTarjetas();

}


// =======================================================
// CREAR TARJETA
// =======================================================

function crearTarjetaFicha(
    ficha
) {

    /*
       La ficha se crea completamente
       desde JavaScript.

       Esto nos permite controlar
       la estructura visual desde cero.
    */

    const tarjeta =
        document.createElement(
            "article"
        );


    tarjeta.className =
        "tarjetaFicha";


    tarjeta.dataset.id =
        ficha.id_ficha ?? "";


    tarjeta.setAttribute(
        "role",
        "button"
    );


    tarjeta.setAttribute(
        "tabindex",
        "0"
    );


    tarjeta.setAttribute(
        "aria-label",
        `Abrir ficha: ${ficha.titulo || "Veterano"}`
    );


    // ===================================================
    // FONDO DE FICHA
    // ===================================================

    const fondo =
        document.createElement(
            "div"
        );


    fondo.className =
        "fondoFicha";


    tarjeta.appendChild(
        fondo
    );


    // ===================================================
    // CLIP
    // ===================================================

    const clip =
        document.createElement(
            "div"
        );


    clip.className =
        "clipFicha";


    const imagenClip =
        document.createElement(
            "img"
        );


    imagenClip.src =
        "img/clip.png";


    imagenClip.alt =
        "";


    imagenClip.setAttribute(
        "aria-hidden",
        "true"
    );


    clip.appendChild(
        imagenClip
    );


    tarjeta.appendChild(
        clip
    );


    // ===================================================
    // CABECERA DE EXPEDIENTE
    // ===================================================

    const cabecera =
        document.createElement(
            "div"
        );


    cabecera.className =
        "cabeceraFicha";


    const numero =
        document.createElement(
            "span"
        );


    numero.className =
        "numeroFicha";


    numero.textContent =
        obtenerNumeroExpediente(
            ficha
        );


    cabecera.appendChild(
        numero
    );


    tarjeta.appendChild(
        cabecera
    );


    // ===================================================
    // FOTOGRAFÍA
    // ===================================================

    const contenedorImagen =
        document.createElement(
            "div"
        );


    contenedorImagen.className =
        "imagenFicha";


    const imagen =
        document.createElement(
            "img"
        );


    imagen.src =
        obtenerImagenFicha(
            ficha
        );


    imagen.alt =
        ficha.titulo ||
        "Fotografía del veterano";


    imagen.loading =
        "lazy";


    contenedorImagen.appendChild(
        imagen
    );


    tarjeta.appendChild(
        contenedorImagen
    );


    // ===================================================
    // INFORMACIÓN
    // ===================================================

    const informacion =
        document.createElement(
            "div"
        );


    informacion.className =
        "infoFicha";


    const titulo =
        document.createElement(
            "h3"
        );


    titulo.textContent =
        ficha.titulo ||
        "Sin nombre";


    informacion.appendChild(
        titulo
    );


    // ===================================================
    // CAMPOS
    // ===================================================

    const campos =
        document.createElement(
            "div"
        );


    campos.className =
        "camposTarjeta";


    construirCampos(
        ficha,
        campos
    );


    informacion.appendChild(
        campos
    );


    tarjeta.appendChild(
        informacion
    );


    // ===================================================
    // PIE
    // ===================================================

    const pie =
        document.createElement(
            "div"
        );


    pie.className =
        "pieFicha";


    pie.textContent =
        "CONSULTAR EXPEDIENTE";


    tarjeta.appendChild(
        pie
    );


    return tarjeta;

}


// =======================================================
// OBTENER NÚMERO DE EXPEDIENTE
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
// OBTENER IMAGEN
// =======================================================

function obtenerImagenFicha(
    ficha
) {

    if (
        !ficha.imagen
    ) {

        return CONFIG_FICHAS.imagenDefecto;

    }


    /*
       Si la API devuelve:

       uploads/foto.jpg

       convertimos a:

       /uploads/foto.jpg
    */

    if (
        ficha.imagen.startsWith("/")
    ) {

        return ficha.imagen;

    }


    return "/" + ficha.imagen;

}


// =======================================================
// CONSTRUIR CAMPOS
// =======================================================

function construirCampos(
    ficha,
    contenedor
) {

    /*
       La información de los campos
       viene de la plantilla asociada
       a la ficha.

       Si todavía no existe plantilla,
       simplemente dejamos la zona vacía.
    */

    const camposPlantilla =
        ficha
            ?.plantilla
            ?.estructura
            ?.campos;


    if (
        !Array.isArray(
            camposPlantilla
        )
    ) {

        return;

    }


    camposPlantilla.forEach(
        campo => {

            /*
               Solo mostramos los campos
               marcados para aparecer
               en la tarjeta.
            */

            if (
                !campo ||
                !campo.mostrarTarjeta
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


            const elemento =
                document.createElement(
                    "div"
                );


            elemento.className =
                "campoFicha";


            const etiqueta =
                document.createElement(
                    "span"
                );


            etiqueta.className =
                "etiquetaCampo";


            etiqueta.textContent =
                campo.etiqueta ||
                campo.nombre ||
                "";


            const contenido =
                document.createElement(
                    "span"
                );


            contenido.className =
                "valorCampo";


            contenido.textContent =
                valor;


            elemento.appendChild(
                etiqueta
            );


            elemento.appendChild(
                contenido
            );


            contenedor.appendChild(
                elemento
            );

        }
    );

}


// =======================================================
// ACTIVAR TARJETAS
// =======================================================

function activarTarjetas() {

    const tarjetas =
        document.querySelectorAll(
            ".tarjetaFicha"
        );


    tarjetas.forEach(
        tarjeta => {

            tarjeta.addEventListener(
                "click",
                () => abrirFicha(
                    tarjeta
                )
            );


            tarjeta.addEventListener(
                "keydown",
                evento => {

                    if (
                        evento.key === "Enter" ||
                        evento.key === " "
                    ) {

                        evento.preventDefault();


                        abrirFicha(
                            tarjeta
                        );

                    }

                }
            );


            /*
               Efecto visual para teclado.
            */

            tarjeta.addEventListener(
                "focus",
                () => {

                    tarjeta.classList.add(
                        "ficha-enfocada"
                    );

                }
            );


            tarjeta.addEventListener(
                "blur",
                () => {

                    tarjeta.classList.remove(
                        "ficha-enfocada"
                    );

                }
            );

        }
    );

}


// =======================================================
// ABRIR FICHA
// =======================================================

function abrirFicha(
    tarjeta
) {

    if (!tarjeta) {

        return;

    }


    const idFicha =
        tarjeta.dataset.id;


    if (!idFicha) {

        console.warn(
            "[FICHAS] La ficha no tiene ID."
        );

        return;

    }


    console.log(
        "[FICHAS] Abrir ficha:",
        idFicha
    );


    /*
       Esta función todavía puede ser
       implementada por el visor de ficha.

       NO rompemos nada si todavía
       no existe.
    */

    if (
        typeof abrirHistoriaCompleta ===
        "function"
    ) {

        abrirHistoriaCompleta(
            idFicha
        );

        return;

    }


    /*
       Por ahora, si el visor todavía
       no existe, simplemente dejamos
       registrado el ID.
    */

    console.log(
        "[FICHAS] Visor todavía no conectado."
    );

}


// =======================================================
// ESTADO DE CARGA
// =======================================================

function mostrarEstadoCarga() {

    const contenedor =
        document.getElementById(
            CONFIG_FICHAS.contenedor
        );


    if (!contenedor) {

        return;

    }


    contenedor.innerHTML = `

        <div class="estadoFichas estado-cargando">

            <span class="estado-icono">◌</span>

            <span>
                CONSULTANDO ARCHIVO...
            </span>

        </div>

    `;

}


// =======================================================
// ESTADO VACÍO
// =======================================================

function mostrarEstadoVacio(
    mensaje
) {

    const contenedor =
        document.getElementById(
            CONFIG_FICHAS.contenedor
        );


    if (!contenedor) {

        return;

    }


    contenedor.innerHTML = `

        <div class="estadoFichas estado-vacio">

            <span class="estado-icono">—</span>

            <span>
                ${mensaje}
            </span>

        </div>

    `;

}


// =======================================================
// RECARGAR FICHAS
// =======================================================

async function recargarFichas() {

    await cargarFichas();

}


// =======================================================
// OBTENER FICHAS ACTUALES
// =======================================================

function obtenerFichas() {

    return [
        ...fichasVisibles
    ];

}


// =======================================================
// EXPORTAR FUNCIONES PARA OTROS SCRIPTS
// =======================================================
//
// Esto nos va a servir cuando conectemos:
//
// Explorador → Índice → Fichas
//
// Por ahora no hace falta utilizarlo.
// =======================================================

window.fichasPublicas = {

    cargar: cargarFichas,

    buscar: buscarFichas,

    limpiarBusqueda,

    recargar: recargarFichas,

    obtener: obtenerFichas,

    pintar: pintarFichas

};

window.pintarFichasPublicas =
    pintarFichas;


console.log(
    "[FICHAS] fichas.js cargado correctamente."
);


