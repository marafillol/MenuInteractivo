// =======================================================
// FICHAS
// Museo Malvinas Â· Archivo HistÃ³rico
//
// RESPONSABILIDADES:
// â€¢ Cargar fichas
// â€¢ Filtrar fichas
// â€¢ Construir tarjetas
// â€¢ Mostrar fotografÃ­as
// â€¢ Mostrar campos de la plantilla
// â€¢ Activar interacciÃ³n
//
// IMPORTANTE:
// TodavÃ­a NO se conecta directamente con el Explorador.
// Tampoco se modifica la lÃ³gica de la base de datos.
// =======================================================


// =======================================================
// ESTADO
// =======================================================

let fichasCargadas = [];

let fichasVisibles = [];


// =======================================================
// CONFIGURACIÃ“N
// =======================================================

const CONFIG_FICHAS = {

    api: "/api/public/fichas",

    plantilla: "html/ficha.html",

    imagenDefecto: "/imagenes/default.png",

    contenedor: "contenedorFichas",

    buscador: "buscador"

};

async function iniciarFichas() {
    const contenedor = document.getElementById(
        CONFIG_FICHAS.contenedor
    );

    // Esta vista no está cargada. No inicializar fichas.
    if (!contenedor) {
        return;
    }



    prepararBuscador();
    prepararContenedor();

    await cargarFichas();

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


    // Solo mostramos "CONSULTANDO ARCHIVO..." si la respuesta tarda
    // mÃ¡s de 300 ms. Si llega rÃ¡pido, nunca aparece (evita el destello).
    let temporizadorCarga = null;

    try {

        temporizadorCarga =
            setTimeout(
                mostrarEstadoCarga,
                300
            );


        let url =
            CONFIG_FICHAS.api;


        /*
           Si posteriormente el Explorador
           selecciona un menÃº, se utilizarÃ¡:

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

        const respuesta =
            await fetch(url);


        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );

        }


        const datos =
            await respuesta.json();


        clearTimeout(
            temporizadorCarga
        );


        if (!Array.isArray(datos)) {

            throw new Error(
                "La API no devolviÃ³ un array de fichas."
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

        clearTimeout(
            temporizadorCarga
        );


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
       Buscamos principalmente por tÃ­tulo.
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
       TambiÃ©n buscamos dentro
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
// LIMPIAR BÃšSQUEDA
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

    /*
       Las tarjetas se arman en un fragmento fuera de pantalla
       y se reemplazan de una sola vez: asÃ­ el contenedor
       nunca queda vacÃ­o entre una pintada y otra.
    */

    const fragmento =
        document.createDocumentFragment();


    fichas.forEach(
        ficha => {

            const tarjeta =
                crearTarjetaFicha(
                    ficha
                );


            if (tarjeta) {

                fragmento.appendChild(
                    tarjeta
                );

            }

        }
    );


    contenedor.replaceChildren(
        fragmento
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


    cabecera.appendChild(numero);
    tarjeta.appendChild(cabecera);

    const textoSuperior = crearTextoCurvo(
        obtenerNumeroExpediente(ficha),
        `expediente-${ficha.id_ficha}`,
        "superior"
    );

    tarjeta.appendChild(textoSuperior);


    // ===================================================
    // FOTOGRAFÃA
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
        "FotografÃ­a del veterano";


    imagen.loading =
        "lazy";


    imagen.decoding =
        "async";


    contenedorImagen.appendChild(
        imagen
    );


    tarjeta.appendChild(
        contenedorImagen
    );


    // ===================================================
    // INFORMACIÃ“N
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
    // PIE
    // ===================================================

    const pie =
        document.createElement(
            "div"
        );


    pie.className = "pieFicha";
    pie.textContent = "CONSULTAR EXPEDIENTE";

    tarjeta.appendChild(pie);

    // Texto curvo inferior
    const textoInferior = crearTextoCurvo(
        "CONSULTAR EXPEDIENTE",
        `consulta-${ficha.id_ficha}`,
        "inferior"
    );

    tarjeta.appendChild(textoInferior);


    return tarjeta;

}


function crearTextoCurvo(texto, identificador, posicion) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");

    svg.setAttribute(
        "class",
        `textoCurvoFicha textoCurvoFicha--${posicion}`
    );
    svg.setAttribute("viewBox", "0 0 300 300");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("aria-hidden", "true");

    const id = `arco-${String(identificador).replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
    )}`;

    const camino = document.createElementNS(ns, "path");
    camino.setAttribute("id", id);

    // Ambos recorridos quedan dentro del SVG.


    const recorrido =
        posicion === "superior"
            ? "M 18 85 Q 150 -52 282 85"
            : posicion === "inferior"
                ? "M 18 215 Q 150 370 282 215"
                : "M 35 180 Q 150 340 265 180";

    camino.setAttribute("d", recorrido);
    camino.setAttribute("fill", "none");
    svg.appendChild(camino);

    const textoSvg = document.createElementNS(ns, "text");
    textoSvg.setAttribute("text-anchor", "middle");

    const ruta = document.createElementNS(ns, "textPath");
    ruta.setAttribute("href", `#${id}`);
    ruta.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "xlink:href",
        `#${id}`
    );
    ruta.setAttribute("startOffset", "50%");
    ruta.textContent = texto;

    textoSvg.appendChild(ruta);
    svg.appendChild(textoSvg);

    return svg;
}



// =======================================================
// OBTENER NÃšMERO DE EXPEDIENTE
// =======================================================

function obtenerNumeroExpediente(
    ficha
) {

    if (
        ficha.id_ficha !== undefined &&
        ficha.id_ficha !== null
    ) {

        return `EXP. NÂº ${ficha.id_ficha}`;

    }


    return "EXP. NÂº ----";

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

    if (/^(https?:|data:)/i.test(ficha.imagen)) {

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
       La informaciÃ³n de los campos
       viene de la plantilla asociada
       a la ficha.

       Si todavÃ­a no existe plantilla,
       simplemente dejamos la zona vacÃ­a.
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
       Esta funciÃ³n todavÃ­a puede ser
       implementada por el visor de ficha.

       NO rompemos nada si todavÃ­a
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

            <span class="estado-icono">â—Œ</span>

            <span>
                CONSULTANDO ARCHIVO...
            </span>

        </div>

    `;

}


// =======================================================
// ESTADO VACÃO
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

            <span class="estado-icono">â€”</span>

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
// Explorador â†’ Ãndice â†’ Fichas
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

