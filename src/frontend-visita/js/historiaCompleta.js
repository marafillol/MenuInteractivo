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
let solicitudHistoriaActual = 0;

let multimediaActual = [];
let multimediaIndiceActual = 0;
let elementoAnteriorHistoria = null;

// =======================================================
// INICIALIZACIÓN
// =======================================================

let historiaCompletaInicializada = false;
let cargaHTMLHistoriaEnCurso = null;

async function iniciarHistoriaCompleta() {
    if (historiaCompletaInicializada) {
        return;
    }

    // Evitar cargas simultáneas de la misma plantilla.
    if (cargaHTMLHistoriaEnCurso) {
        return cargaHTMLHistoriaEnCurso;
    }

    cargaHTMLHistoriaEnCurso = (async () => {
        console.log("[HISTORIA] Cargando estructura HTML...");

        let contenedor = document.getElementById(
            CONFIG_HISTORIA.contenedor
        );

        if (!contenedor) {
            const respuesta = await fetch(
                "html/historiaCompleta.html"
            );

            if (!respuesta.ok) {
                throw new Error(
                    `No se pudo cargar historiaCompleta.html: HTTP ${respuesta.status}`
                );
            }

            const html = await respuesta.text();

            const plantilla = document.createElement("template");
            plantilla.innerHTML = html.trim();

            contenedor = plantilla.content.querySelector(
                "#historiaCompleta"
            );

            if (!contenedor) {
                throw new Error(
                    "historiaCompleta.html no contiene #historiaCompleta."
                );
            }

            document.body.appendChild(contenedor);
        }

        prepararEventosHistoria();
        prepararCarruselMultimedia();

        historiaCompletaInicializada = true;

        console.log("[HISTORIA] Inicialización completa.");
    })();

    try {
        await cargaHTMLHistoriaEnCurso;
    } catch (error) {
        cargaHTMLHistoriaEnCurso = null;
        console.error("[HISTORIA] Error de inicialización:", error);
        throw error;
    }
}

// =======================================================
// EVENTOS HISTORIA
// =======================================================

function prepararEventosHistoria() {
    const contenedor = document.getElementById(
        CONFIG_HISTORIA.contenedor
    );

    if (!contenedor) {
        console.warn(
            "[HISTORIA] No existe #historiaCompleta."
        );
        return;
    }

    // Cerrar el globito al desplazarse en cualquier
    // contenedor interno de la historia.
    const contenedoresDesplazables = [
        contenedor,
        ...contenedor.querySelectorAll("*")
    ];

    contenedoresDesplazables.forEach(elemento => {
        elemento.addEventListener(
            "scroll",
            cerrarGlobitoEtiqueta,
            { passive: true }
        );
    });

    // Cerrar al hacer click fuera de la ventana.
    contenedor.addEventListener("click", evento => {
        const ventana = evento.target.closest(
            ".historia-ventana, .expedienteHistoria"
        );

        if (!ventana) {
            cerrarHistoriaCompleta();
        }
    });

    // Teclado.
    document.addEventListener("keydown", evento => {
        const carrusel = document.getElementById(
            "carruselMultimedia"
        );

        if (carrusel && carrusel.classList.contains("activo")) {
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

        if (evento.key === "Escape") {
            cerrarHistoriaCompleta();
        }
    });
}


// =======================================================
// ABRIR HISTORIA
// =======================================================

async function abrirHistoriaCompleta(idFicha) {

    await iniciarHistoriaCompleta();

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

    const solicitud =
        ++solicitudHistoriaActual;


    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.contenedor
        );


    const cuerpo = contenedor
        ? contenedor.querySelector(
            ".historia-cuerpo, .cuerpoHistoria"
        )
        : null;


    if (!contenedor) return;


    const expedienteYaAbierto =
        contenedor.classList.contains(
            "activo"
        );


    historiaIdActual = idFicha;

    limpiarHistoria();
    mostrarHistoriaCarga();


    // ---------------------------------------------------
    // CAMBIAR DE FICHA CON EL EXPEDIENTE YA ABIERTO
    // ---------------------------------------------------

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
                await obtenerFicha(idFicha);

            if (solicitud !== solicitudHistoriaActual) {
                return;
            }


            if (!ficha) {

                throw new Error(
                    "La API no devolvió la ficha."
                );

            }


            historiaFichaActual =
                ficha;


            await new Promise(requestAnimationFrame);

            if (solicitud !== solicitudHistoriaActual) {
                return;
            }


            pintarHistoria(ficha);
            reiniciarScrollHistoria();


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

            if (solicitud !== solicitudHistoriaActual) {
                return;
            }

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


    // ---------------------------------------------------
    // ABRIR NUEVO EXPEDIENTE
    // ---------------------------------------------------

    mostrarHistoriaCompleta();
    reiniciarScrollHistoria();


    try {

        const ficha =
            await obtenerFicha(idFicha);

        if (solicitud !== solicitudHistoriaActual) {
            return;
        }


        if (!ficha) {

            throw new Error(
                "La API no devolvió la ficha."
            );

        }


        historiaFichaActual =
            ficha;


        pintarHistoria(ficha);
        reiniciarScrollHistoria();


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

        if (solicitud !== solicitudHistoriaActual) {
            return;
        }

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

const fichasCompletasEnCache = new Map();
const solicitudesFichasEnCurso = new Map();

const DURACION_CACHE_FICHA = 30 * 1000; // 30 segundos

async function obtenerFicha(idFicha) {
    const clave = String(idFicha);
    const ahora = Date.now();

    // Reutilizar la ficha si la caché sigue vigente.
    const entrada = fichasCompletasEnCache.get(clave);

    if (entrada && ahora < entrada.expira) {
        console.log(
            "[HISTORIA] Ficha reutilizada desde memoria:",
            clave
        );

        return entrada.ficha;
    }

    // Evitar solicitudes simultáneas para la misma ficha.
    if (solicitudesFichasEnCurso.has(clave)) {
        return solicitudesFichasEnCurso.get(clave);
    }

    const solicitud = (async () => {
        const url =
            `${CONFIG_HISTORIA.api}/${encodeURIComponent(clave)}`;

        console.log("[HISTORIA] Consultando:", url);

        const inicioAPI = performance.now();

        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const ficha = await respuesta.json();

        console.log(
            `[MEDICIÓN] API + JSON (${clave}):`,
            `${Math.round(performance.now() - inicioAPI)} ms`
        );

        // Guardar la ficha con una vigencia de 30 segundos.
        fichasCompletasEnCache.set(clave, {
            ficha,
            expira: Date.now() + DURACION_CACHE_FICHA
        });

        return ficha;
    })();

    solicitudesFichasEnCurso.set(clave, solicitud);

    try {
        return await solicitud;
    } finally {
        if (solicitudesFichasEnCurso.get(clave) === solicitud) {
            solicitudesFichasEnCurso.delete(clave);
        }
    }
}


function precargarFicha(idFicha) {
    if (
        idFicha === undefined ||
        idFicha === null ||
        idFicha === ""
    ) {
        return Promise.resolve();
    }

    return obtenerFicha(idFicha).catch(error => {
        console.warn(
            "[HISTORIA] No se pudo precargar la ficha:",
            idFicha,
            error
        );
    });
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

    // Recordar qué elemento tenía el foco antes de abrir.
    elementoAnteriorHistoria = document.activeElement;

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

    solicitudHistoriaActual += 1;

    cerrarCarruselMultimedia();

    const contenedor =
        document.getElementById(
            CONFIG_HISTORIA.contenedor
        );

    if (!contenedor) return;

    // Antes de ocultar el modal, sacar el foco de su interior.
    const elementoActivo = document.activeElement;

    if (contenedor.contains(elementoActivo)) {

        if (
            elementoAnteriorHistoria &&
            elementoAnteriorHistoria.isConnected &&
            !contenedor.contains(elementoAnteriorHistoria)
        ) {
            elementoAnteriorHistoria.focus();
        } else {
            // Alternativa si el elemento original ya no existe.
            elementoActivo.blur();
        }

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

    historiaFichaActual = null;
    historiaIdActual = null;

    elementoAnteriorHistoria = null;

}

// =======================================================
// VISIBILIDAD DE SECCIONES
// =======================================================

function actualizarVisibilidadSeccionesHistoria() {
    const contenedor = document.getElementById(
        CONFIG_HISTORIA.contenedor
    );

    if (!contenedor) return;

    const secciones = [
        {
            selector: ".historia-texto",
            contenido: `#${CONFIG_HISTORIA.texto}`
        },
        {
            selector: ".historia-multimedia",
            contenido: `#${CONFIG_HISTORIA.multimedia}`
        },
        {
            selector: ".historia-relacionadas",
            contenido: `#${CONFIG_HISTORIA.relacionadas}`
        }
    ];

    secciones.forEach(({ selector, contenido }) => {
        const seccion = contenedor.querySelector(selector);
        const elemento = contenedor.querySelector(contenido);

        if (!seccion || !elemento) return;

        let tieneContenido;

        if (contenido === `#${CONFIG_HISTORIA.texto}`) {
            tieneContenido = elemento.textContent.trim() !== "";
        } else {
            tieneContenido = elemento.children.length > 0;
        }

        seccion.hidden = !tieneContenido;
    });
}
// =======================================================
// PINTAR HISTORIA
// =======================================================
function pintarHistoria(ficha) {
    if (!ficha) return;

    const inicioPintado = performance.now();

    limpiarHistoria();

    pintarTitulo(ficha);
    pintarImagen(ficha);
    pintarCampos(ficha);
    pintarEtiquetas(ficha);
    pintarResumen(ficha);
    pintarTexto(ficha);
    pintarMultimedia(ficha);
    pintarRelacionadas(ficha);

    actualizarVisibilidadSeccionesHistoria();

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

    const numero =
        document.getElementById(
            "numeroHistoria"
        );

    if (numero) {
        numero.textContent = "";
    }

    const imagen =
        document.getElementById(
            CONFIG_HISTORIA.imagen
        );

    if (imagen) {
        imagen.removeAttribute("src");
        imagen.alt = "";
    }

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
    const imagen = document.getElementById(
        CONFIG_HISTORIA.imagen
    );

    if (!imagen) return;

    const ruta = obtenerImagen(ficha);

    // Priorizar la imagen principal del expediente.
    imagen.loading = "eager";
    imagen.fetchPriority = "high";
    imagen.decoding = "async";

    imagen.alt =
        ficha.titulo ||
        "Fotografía de la ficha";

    const contenedor = imagen.closest(
        ".imagenHistoria"
    );

    if (contenedor) {
        contenedor.classList.toggle(
            "sin-imagen",
            !ficha.imagen
        );
    }

    // Asignar la ruta después de establecer la prioridad.

    const inicioImagen = performance.now();

    imagen.addEventListener("load", function medirCarga() {
        console.log(
            "[MEDICIÓN] Foto principal cargada:",
            `${Math.round(performance.now() - inicioImagen)} ms`,
            `(${imagen.naturalWidth} × ${imagen.naturalHeight})`
        );
    }, { once: true });

    imagen.addEventListener("error", function medirError() {
        console.warn(
            "[MEDICIÓN] Error al cargar la foto principal:",
            ruta
        );
    }, { once: true });

    imagen.src = ruta;

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

    if (/^(https?:|data:)/i.test(ficha.imagen)) {

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
    const contenedor = document.getElementById(
        CONFIG_HISTORIA.etiquetas
    );

    if (!contenedor) return;

    // Cerrar cualquier descripción anterior.
    document.getElementById("globitoDescripcionEtiqueta")?.remove();

    if (
        !Array.isArray(ficha.etiquetas) ||
        ficha.etiquetas.length === 0
    ) {
        contenedor.classList.add("oculto");
        return;
    }

    contenedor.classList.remove("oculto");

    ficha.etiquetas.forEach(etiqueta => {
        if (!etiqueta) return;

        const elemento = document.createElement("button");
        elemento.type = "button";
        elemento.className = "historia-etiqueta";
        elemento.textContent = etiqueta.nombre || "";
        elemento.setAttribute("aria-expanded", "false");

        const descripcion = String(
            etiqueta.descripcion || ""
        ).trim();

        if (!descripcion) {
            elemento.setAttribute(
                "aria-label",
                etiqueta.nombre || "Etiqueta"
            );
            elemento.setAttribute("aria-disabled", "true");
            contenedor.appendChild(elemento);
            return;
        }

        elemento.setAttribute(
            "aria-label",
            `${etiqueta.nombre || "Etiqueta"}. Ver descripción`
        );

        elemento.addEventListener("click", evento => {
            evento.stopPropagation();

            const anterior = document.getElementById(
                "globitoDescripcionEtiqueta"
            );

            // Si se vuelve a pulsar la misma etiqueta, cerrar.
            if (
                anterior &&
                anterior.dataset.etiqueta === String(
                    etiqueta.id_etiqueta ?? etiqueta.nombre
                )
            ) {
                anterior.remove();
                elemento.classList.remove("etiqueta-abierta");
                elemento.setAttribute("aria-expanded", "false");
                return;
            }

            // Cerrar el globito anterior.
            anterior?.remove();

            contenedor
                .querySelectorAll(".historia-etiqueta")
                .forEach(otra => {
                    otra.classList.remove("etiqueta-abierta");
                    otra.setAttribute("aria-expanded", "false");
                });

            const globo = document.createElement("div");
            globo.id = "globitoDescripcionEtiqueta";
            globo.className = "historia-etiqueta-descripcion";

            const textoGlobo = document.createElement("div");
            textoGlobo.className = "globito-texto";
            textoGlobo.textContent = descripcion;

            const piquito = document.createElement("span");
            piquito.className = "globito-piquito";
            piquito.setAttribute("aria-hidden", "true");

            globo.appendChild(textoGlobo);
            globo.appendChild(piquito);
            globo.setAttribute("role", "note");
            globo.dataset.etiqueta = String(
                etiqueta.id_etiqueta ?? etiqueta.nombre
            );

            // Se agrega fuera de los contenedores que recortan el contenido.
            document.body.appendChild(globo);

            elemento.classList.add("etiqueta-abierta");
            elemento.setAttribute("aria-expanded", "true");



            // Posicionar el globo según la orientación de pantalla.
            const rect = elemento.getBoundingClientRect();
            const margen = 12;
            const separacion = 12;

            const verticalDerecha =
                document.body.classList.contains("totem-right");

            const verticalIzquierda =
                document.body.classList.contains("totem-left");

            const vertical = verticalDerecha || verticalIzquierda;

            globo.style.position = "fixed";
            globo.style.left = "0px";
            globo.style.top = "0px";
            globo.style.transform = "none";
            globo.style.visibility = "hidden";
            globo.classList.remove("globito-arriba");
            globo.classList.toggle("globito-vertical", vertical);
            globo.classList.toggle(
                "globito-vertical-derecha",
                verticalDerecha
            );
            globo.classList.toggle(
                "globito-vertical-izquierda",
                verticalIzquierda
            );

            const ancho = globo.offsetWidth;
            const alto = globo.offsetHeight;

            let izquierda;
            let arriba;

            if (!vertical) {
                // HORIZONTAL: conservar el comportamiento actual.
                izquierda = rect.left + rect.width / 2 - ancho / 2;
                arriba = rect.bottom + separacion;

                if (arriba + alto > window.innerHeight - margen) {
                    arriba = rect.top - alto - separacion;
                    globo.classList.add("globito-arriba");
                }

                izquierda = Math.max(
                    margen,
                    Math.min(
                        izquierda,
                        window.innerWidth - ancho - margen
                    )
                );

                arriba = Math.max(
                    margen,
                    Math.min(
                        arriba,
                        window.innerHeight - alto - margen
                    )
                );

                globo.style.left = `${izquierda}px`;
                globo.style.top = `${arriba}px`;
                globo.style.visibility = "visible";

                const centroPiquito = Math.max(
                    12,
                    Math.min(
                        rect.left + rect.width / 2 - izquierda,
                        ancho - 12
                    )
                );

                globo.style.setProperty(
                    "--posicion-piquito",
                    `${centroPiquito}px`
                );

                return;
            }

            // VERTICAL: considerar las dimensiones físicas tras la rotación.
            const anchoFisico = alto;
            const altoFisico = ancho;

            // Prioridad 1: debajo de la etiqueta.
            const izquierdaDebajo =
                rect.left + rect.width / 2 - anchoFisico / 2;

            const arribaDebajo = rect.bottom + separacion;

            // Si entra debajo, mantener esa posición.
            // Si no, intentar arriba antes de ubicarlo a un costado.
            const cabeDebajo =
                arribaDebajo + altoFisico <=
                window.innerHeight - margen;

            const arribaEncima =
                rect.top - altoFisico - separacion;

            const cabeEncima = arribaEncima >= margen;

            izquierda = izquierdaDebajo;

            if (cabeDebajo) {
                arriba = arribaDebajo;
            } else if (cabeEncima) {
                arriba = arribaEncima;
            } else {
                // No cabe ni abajo ni arriba: usar el espacio disponible
                // y limitar la posición para que no salga de la pantalla.
                arriba = Math.max(
                    margen,
                    Math.min(
                        arribaDebajo,
                        window.innerHeight - altoFisico - margen
                    )
                );
            }

            // Evitar que el globo se salga por los laterales.
            izquierda = Math.max(
                margen,
                Math.min(
                    izquierda,
                    window.innerWidth - anchoFisico - margen
                )
            );

            // Ajustar también la posición vertical al espacio disponible.
            arriba = Math.max(
                margen,
                Math.min(
                    arriba,
                    window.innerHeight - altoFisico - margen
                )
            );

            const centroX = izquierda + anchoFisico / 2;
            const centroY = arriba + altoFisico / 2;

            globo.style.left = `${centroX}px`;
            globo.style.top = `${centroY}px`;
            globo.style.transform =
                `translate(-50%, -50%) rotate(${verticalDerecha ? 90 : -90}deg)`;

            globo.style.visibility = "visible";

            // Indicar en qué dirección está la etiqueta respecto del globo.
            const centroEtiquetaX = rect.left + rect.width / 2;
            const centroEtiquetaY = rect.top + rect.height / 2;

            const diferenciaX = centroEtiquetaX - centroX;
            const diferenciaY = centroEtiquetaY - centroY;

            globo.dataset.direccionPiquito =
                Math.abs(diferenciaX) > Math.abs(diferenciaY)
                    ? (diferenciaX < 0 ? "izquierda" : "derecha")
                    : (diferenciaY < 0 ? "arriba" : "abajo");

        });

        contenedor.appendChild(elemento);
    });
}

// Cerrar el globito al pulsar fuera de él y de las etiquetas.
document.addEventListener("click", evento => {
    const globo = document.getElementById(
        "globitoDescripcionEtiqueta"
    );

    if (!globo) return;

    if (
        evento.target.closest(".historia-etiqueta") ||
        evento.target.closest("#globitoDescripcionEtiqueta")
    ) {
        return;
    }

    globo.remove();

    document
        .querySelectorAll("#historiaCompleta .historia-etiqueta")
        .forEach(etiqueta => {
            etiqueta.classList.remove("etiqueta-abierta");
            etiqueta.setAttribute("aria-expanded", "false");
        });
});

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


    // ---------------------------------------------------
    // IMAGEN
    // ---------------------------------------------------

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


    // ---------------------------------------------------
    // VIDEO
    // ---------------------------------------------------

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




    // ---------------------------------------------------
    // AUDIO
    // ---------------------------------------------------

    else if (
        tipo.includes("audio") ||
        esAudio(ruta)
    ) {
        const audioVisual = document.createElement("div");

        audioVisual.className = "historia-media-audio";

        const icono = document.createElement("span");
        icono.className = "historia-media-audio-icono";
        icono.textContent = "♫";

        const etiqueta = document.createElement("span");
        etiqueta.className = "historia-media-audio-etiqueta";
        etiqueta.textContent = "ARCHIVO DE AUDIO";

        audioVisual.appendChild(icono);
        audioVisual.appendChild(etiqueta);

        tarjeta.appendChild(audioVisual);
    }




    // ---------------------------------------------------
    // DOCUMENTO
    // ---------------------------------------------------

    else {

        const documento = document.createElement("div");
        documento.className = "historia-media-documento";

        const icono = document.createElement("span");
        icono.className = "historia-media-doc-icono";
        icono.textContent = "▤";

        const etiqueta = document.createElement("span");
        etiqueta.className = "historia-media-doc-etiqueta";
        etiqueta.textContent = "DOCUMENTO";

        documento.appendChild(icono);
        documento.appendChild(etiqueta);

        tarjeta.appendChild(documento);

    }


    // ---------------------------------------------------
    // INFORMACIÓN
    // ---------------------------------------------------

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


    // ---------------------------------------------------
    // CLICK
    // ---------------------------------------------------

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


    // ---------------------------------------------------
    // IMAGEN
    // ---------------------------------------------------

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



    // ---------------------------------------------------
    // VIDEO: CONTROLES LIMITADOS
    // ---------------------------------------------------

    else if (
        tipo.includes("video") ||
        esVideo(ruta)
    ) {
        const video = document.createElement("video");

        video.className = "carrusel-video";
        video.src = ruta;
        video.controls = true;
        video.autoplay = true;
        video.preload = "metadata";
        video.playsInline = true;

        // Ocultar opciones de descarga y reproducción adicional.
        video.setAttribute(
            "controlsList",
            "nodownload noplaybackrate"
        );

        // Ocultar Picture-in-Picture.
        video.disablePictureInPicture = true;

        // Evitar el menú contextual del video.
        video.addEventListener("contextmenu", evento => {
            evento.preventDefault();
        });

        contenedor.appendChild(video);
    }



    // ---------------------------------------------------
    // AUDIO
    // ---------------------------------------------------

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



    // ---------------------------------------------------
    // DOCUMENTO: SOLO VISUALIZACIÓN
    // ---------------------------------------------------

    else {
        const documento = document.createElement("iframe");

        documento.className = "carrusel-documento-visor";
        documento.title = "Documento histórico";
        documento.src = ruta;
        documento.loading = "lazy";

        documento.setAttribute("frameborder", "0");
        documento.setAttribute("allowfullscreen", "");

        // Oculta controles del visor PDF en navegadores compatibles.
        if (/\.pdf(?:$|[?#])/i.test(ruta)) {
            documento.src = `${ruta}#toolbar=0&navpanes=0&scrollbar=1`;
        }


        documento.style.width = "100%";
        documento.style.height = "100%";
        documento.style.minHeight = "300px";
        documento.style.border = "none";
        documento.style.background = "#ffffff";

        contenedor.appendChild(documento);
    }



    // ---------------------------------------------------
    // CONTADOR
    // ---------------------------------------------------

    if (contador) {

        contador.textContent =
            `${multimediaIndiceActual + 1} / ${multimediaActual.length}`;

    }


    // ---------------------------------------------------
    // DESCRIPCIÓN
    // ---------------------------------------------------

    if (descripcion) {

        descripcion.textContent =
            String(archivo.descripcion || "").trim();

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

    // Si el foco está dentro del carrusel,
    // devolverlo al elemento que abrió el material.
    const elementoEnfocado = document.activeElement;

    if (
        elementoEnfocado &&
        carrusel.contains(elementoEnfocado)
    ) {
        const elementoOrigen =
            document.querySelector(
                "#multimediaHistoria .historia-media"
            );

        if (
            elementoOrigen &&
            elementoOrigen.isConnected
        ) {
            elementoOrigen.focus();
        } else if (
            typeof elementoEnfocado.blur === "function"
        ) {
            elementoEnfocado.blur();
        }
    }

    // Ocultar el carrusel después de retirar el foco.
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
        contenedor.innerHTML = "";
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

    if (/^(https?:|data:)/i.test(ruta)) {

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
    return /\.(mp4|webm|mov)$/i.test(
        ruta
    );
}




function esAudio(ruta) {
    return /\.(mp3|wav|ogg|m4a|aac)$/i.test(
        ruta
    );
}


// =======================================================
// FICHAS RELACIONADAS
// =======================================================

function pintarRelacionadas(ficha) {
    const contenedor = document.getElementById(
        CONFIG_HISTORIA.relacionadas
    );

    if (!contenedor) return;

    contenedor.innerHTML = "";

    const relacionadas = Array.isArray(ficha.relacionadas)
        ? ficha.relacionadas
        : [];

    if (relacionadas.length === 0) {
        contenedor.classList.add("oculto");
        return;
    }

    contenedor.classList.remove("oculto");

    relacionadas.forEach(relacionada => {
        if (!relacionada) return;

        // Buscar el identificador disponible en el objeto.
        const idFicha =
            relacionada.id_ficha ??
            relacionada.idFicha ??
            relacionada.id;

        const tarjeta = document.createElement("article");
        tarjeta.className = "historia-relacionada";

        if (idFicha !== undefined && idFicha !== null) {
            tarjeta.dataset.idFicha = String(idFicha);
        }

        // IMAGEN
        const imagen = document.createElement("img");
        imagen.className = "historia-relacionada-imagen";
        imagen.src = obtenerImagen(relacionada);
        imagen.alt = relacionada.titulo || "Ficha relacionada";
        imagen.loading = "lazy";

        imagen.addEventListener("error", () => {
            if (!imagen.src.endsWith("/imagenes/default.png")) {
                imagen.src = "/imagenes/default.png";
            }
        });

        tarjeta.appendChild(imagen);

        // DIVISOR
        const divisor = document.createElement("div");
        divisor.className = "historia-relacionada-divisor";
        tarjeta.appendChild(divisor);

        // CONTENIDO
        const contenido = document.createElement("div");
        contenido.className = "historia-relacionada-contenido";

        if (relacionada.tipo_relacion) {
            const relacion = document.createElement("span");
            relacion.className = "historia-relacionada-relacion";
            relacion.textContent = `RELACIÓN · ${relacionada.tipo_relacion}`;
            contenido.appendChild(relacion);
        }

        const titulo = document.createElement("h3");
        titulo.className = "historia-relacionada-titulo";
        titulo.textContent = relacionada.titulo || "Ficha sin título";
        contenido.appendChild(titulo);

        if (relacionada.menu) {
            const menu = document.createElement("span");
            menu.className = "historia-relacionada-menu";
            menu.textContent = relacionada.menu;
            contenido.appendChild(menu);
        }

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "historia-relacionada-ver";
        boton.textContent = "VER FICHA →";
        boton.setAttribute(
            "aria-label",
            `Ver ficha: ${relacionada.titulo || "Ficha sin título"}`
        );
        contenido.appendChild(boton);

        tarjeta.appendChild(contenido);

        // ABRIR LA FICHA RELACIONADA
        const abrirFichaRelacionada = evento => {
            evento?.stopPropagation();

            console.log(
                "[RELACIONADA] Datos de la ficha:",
                relacionada
            );

            console.log(
                "[RELACIONADA] ID detectado:",
                idFicha
            );

            if (idFicha === undefined || idFicha === null || idFicha === "") {
                console.error(
                    "[RELACIONADA] No se encontró el ID de la ficha."
                );
                return;
            }

            abrirHistoriaCompleta(idFicha);
        };

        tarjeta.setAttribute("role", "link");
        tarjeta.setAttribute("tabindex", "0");
        tarjeta.setAttribute(
            "aria-label",
            `Abrir ficha: ${relacionada.titulo || "Ficha sin título"}`
        );

        tarjeta.addEventListener("click", abrirFichaRelacionada);

        tarjeta.addEventListener("keydown", evento => {
            if (evento.target === tarjeta &&
                (evento.key === "Enter" || evento.key === " ")) {
                evento.preventDefault();
                abrirFichaRelacionada(evento);
            }
        });

        boton.addEventListener("click", abrirFichaRelacionada);

        contenedor.appendChild(tarjeta);
    });
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

function reiniciarScrollHistoria() {
    const contenedor = document.getElementById(
        CONFIG_HISTORIA.contenedor
    );

    if (!contenedor) return;

    const elementos = [
        contenedor,
        contenedor.querySelector(".historia-ventana"),
        contenedor.querySelector(".expedienteHistoria"),
        contenedor.querySelector(".historia-cuerpo"),
        contenedor.querySelector(".cuerpoHistoria")
    ];

    elementos.forEach(elemento => {
        if (elemento) {
            elemento.scrollTop = 0;
        }
    });
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
// FUNCIONES PÚBLICAS
// =======================================================

window.historiaCompleta = {

    abrir:
        abrirHistoriaCompleta,

    cerrar:
        cerrarHistoriaCompleta,

    precargar: precargarFicha,

    obtenerActual:
        () => historiaFichaActual

};


window.abrirHistoriaCompleta =
    abrirHistoriaCompleta;


window.cerrarHistoriaCompleta =
    cerrarHistoriaCompleta;

/* =======================================================
   CERRAR EL GLOBITO AL DESPLAZAR CUALQUIER CONTENEDOR
======================================================= */

document.addEventListener(
    "scroll",
    cerrarGlobitoEtiqueta,
    {
        capture: true,
        passive: true
    }
);

function cerrarGlobitoEtiqueta() {
    const globo = document.getElementById(
        "globitoDescripcionEtiqueta"
    );

    if (!globo) return;

    globo.remove();

    document
        .querySelectorAll(
            "#historiaCompleta .historia-etiqueta"
        )
        .forEach(etiqueta => {
            etiqueta.classList.remove("etiqueta-abierta");
            etiqueta.setAttribute("aria-expanded", "false");
        });
}

console.log(
    "[HISTORIA] historiaCompleta.js cargado correctamente."
);