// =======================================================
// TRANSICIONES
// =======================================================

import transitions from "./transitions/engine.js";


// =======================================================
// CONFIGURACIÓN
// =======================================================

// Plantillas HTML que se descargan al arrancar, para que
// el primer cambio de vista no espere a la red.
// Agregá acá la plantilla del explorador si tiene su propio .html
const PLANTILLAS_PRECARGA = [
    "html/bienvenida.html",
    "html/ficha.html"
];

// Si es true, antes de animar se espera a que las imágenes
// de la vista nueva estén cargadas (evita que aparezcan "de golpe").
const ESPERAR_IMAGENES_DE_VISTA = true;

// Si es true, mientras se prepara la vista nueva (y tarda más
// de 250 ms) se muestra un cartel sobre la vista actual, para
// que el toque no parezca "ignorado".
const MOSTRAR_INDICADOR_DE_CARGA = true;

// Tiempo máximo de espera de imágenes/fuentes (ms).
// Evita que el tótem quede colgado si falla la red.
const TIEMPO_MAXIMO_ESPERA = 1000;


// =======================================================
// CACHÉ DE PLANTILLAS HTML
//
// Cada cambio de vista hace fetch("html/xxx.html"). Mientras
// tanto #app está vacío y se ve el destello. Con la caché,
// la segunda vez que se pide una plantilla ya está en memoria.
// =======================================================

const cachePlantillas =
    new Map();

const fetchOriginal =
    window.fetch.bind(window);


// -------------------------------------------------------
// RASTREO DE PEDIDOS DE RED
//
// Sirve para saber cuándo una vista terminó de cargar sus
// datos (fichas, categorías...), aunque el renderizador no
// los espere con await.
// -------------------------------------------------------

let pedidosPendientes =
    0;

let ultimaActividadRed =
    Date.now();


function rastrear(promesa) {

    pedidosPendientes++;

    ultimaActividadRed =
        Date.now();


    const terminar =
        () => {

            pedidosPendientes--;

            ultimaActividadRed =
                Date.now();

        };


    promesa.then(
        terminar,
        terminar
    );


    return promesa;

}


// Espera a que no haya pedidos en curso durante un instante.
// "max" evita quedarse esperando para siempre si la red falla.
function esperarRedQuieta(
    quietoMs = 150,
    max = 4000
) {

    const limite =
        Date.now() + max;


    return new Promise(resolve => {

        const revisar =
            () => {

                const ahora =
                    Date.now();


                if (ahora >= limite) {

                    resolve();

                    return;

                }


                if (
                    pedidosPendientes === 0 &&
                    ahora - ultimaActividadRed >= quietoMs
                ) {

                    resolve();

                    return;

                }


                setTimeout(
                    revisar,
                    40
                );

            };


        revisar();

    });

}


window.fetch = function (recurso, opciones) {

    const url =
        typeof recurso === "string"
            ? recurso
            : recurso?.url;

    const metodo =
        (opciones?.method || "GET").toUpperCase();

    const esPlantilla =
        typeof url === "string" &&
        metodo === "GET" &&
        /(^|\/)html\/[^?#]+\.html(\?|#|$)/.test(url);


    if (!esPlantilla) {

        return rastrear(
            fetchOriginal(
                recurso,
                opciones
            )
        );

    }


    if (!cachePlantillas.has(url)) {

        const pedido =
            fetchOriginal(recurso, opciones)
                .then(respuesta => {

                    if (!respuesta.ok) {
                        cachePlantillas.delete(url);
                    }

                    return respuesta;

                })
                .catch(error => {

                    cachePlantillas.delete(url);

                    throw error;

                });

        cachePlantillas.set(url, pedido);

    }


    // clone(): cada quien lee su propia copia de la respuesta
    return rastrear(
        cachePlantillas
            .get(url)
            .then(respuesta => respuesta.clone())
    );

};


// =======================================================
// UTILIDADES DE ESPERA
// =======================================================

function conTiempoMaximo(promesa, ms = TIEMPO_MAXIMO_ESPERA) {

    return Promise.race([

        promesa,

        new Promise(resolve => setTimeout(resolve, ms))

    ]);

}


function esperarImagen(ruta) {

    return new Promise(resolve => {

        const imagen =
            new Image();

        imagen.onload =
            resolve;

        imagen.onerror =
            resolve;

        imagen.src =
            ruta;

    });

}


// Espera a que las imágenes de una vista estén cargadas.
// Las imágenes con loading="lazy" se ignoran: si están fuera
// de pantalla nunca cargan y bloquearían la transición.
function esperarImagenesDeVista(vista) {

    if (!vista) {
        return Promise.resolve();
    }


    const pendientes =
        [...vista.querySelectorAll("img")]
            .filter(img => img.loading !== "lazy")
            .map(img => {

                if (img.complete) {

                    return img.naturalWidth > 0 && img.decode
                        ? img.decode().catch(() => {})
                        : Promise.resolve();

                }

                return new Promise(resolve => {

                    img.addEventListener("load", resolve, { once: true });

                    img.addEventListener("error", resolve, { once: true });

                });

            });


    return conTiempoMaximo(
        Promise.allSettled(pendientes)
    );

}


// Carga explícita de las tipografías. Con "display=swap" el
// navegador dibuja primero la fuente de reemplazo y después
// cambia: ese cambio se ve como un parpadeo del texto.
function esperarFuentes() {

    if (!document.fonts?.load) {
        return Promise.resolve();
    }


    return conTiempoMaximo(

        Promise.all([

            document.fonts.load('400 1em "Courier Prime"'),

            document.fonts.load('700 1em "Courier Prime"'),

            document.fonts.load('400 1em "Cormorant Garamond"'),

            document.fonts.load('500 1em "Cormorant Garamond"')

        ])
            .then(() => document.fonts.ready)
            .catch(() => {}),

        1200

    );

}


// =======================================================
// ESTADO
// =======================================================

let viewportListo =
    false;

// Evita que un doble toque dispare dos transiciones a la vez
// (en un tótem táctil es la causa más común de glitches).
let transicionEnCurso =
    false;


// =======================================================
// INDICADOR DE CARGA
// =======================================================

function crearIndicadorCarga() {

    const el =
        document.createElement(
            "div"
        );

    el.setAttribute(
        "role",
        "status"
    );

    el.textContent =
        "CONSULTANDO ARCHIVO...";

    el.style.cssText =
        "position:fixed;left:0;right:0;bottom:8%;text-align:center;" +
        "z-index:9999;pointer-events:none;opacity:0;" +
        "transition:opacity .25s ease;" +
        "font:700 1.2rem 'Courier Prime',monospace;" +
        "letter-spacing:.15em;color:#fff;text-shadow:0 0 8px #000;";

    return el;

}


// =======================================================
// CAMBIAR VISTA
//
// La vista nueva se arma en una zona de preparación
// OCULTA mientras la vista actual sigue a la vista de todos.
// Recién cuando está lista (HTML + datos + imágenes) se
// inserta y se anima. Así #app nunca queda vacío (negro).
// =======================================================

async function cambiarVista(
    renderizarVista,
    presetId = "fade"
) {

    if (transicionEnCurso) {

        return;

    }


    transicionEnCurso =
        true;


    const app =
        document.getElementById(
            "app"
        );


    let staging =
        null;

    let vistaSaliente =
        null;

    let indicador =
        null;

    let temporizadorIndicador =
        null;


    try {

        if (!viewportListo) {

            app.classList.add(
                "transition-viewport"
            );


            transitions.mount(
                app
            );


            viewportListo =
                true;

        }


        vistaSaliente =
            app.firstElementChild;


        // ===============================================
        // ZONA DE PREPARACIÓN (fuera de pantalla)
        // Se coloca ANTES de #app en el DOM para que, si hay
        // ids repetidos, document.getElementById encuentre
        // primero los de la vista nueva.
        // ===============================================

        staging =
            document.createElement(
                "main"
            );

        staging.id =
            "app";

        staging.className =
            app.className
                .replace(/\btransicionando\b/g, "")
                .trim();

        staging.setAttribute(
            "aria-hidden",
            "true"
        );

        staging.style.cssText =
            "position:fixed;inset:0;visibility:hidden;pointer-events:none;";

        app.parentNode.insertBefore(
            staging,
            app
        );


        if (
            MOSTRAR_INDICADOR_DE_CARGA &&
            vistaSaliente
        ) {

            temporizadorIndicador =
                setTimeout(
                    () => {

                        indicador =
                            crearIndicadorCarga();

                        document.body.appendChild(
                            indicador
                        );

                        requestAnimationFrame(
                            () => {
                                indicador.style.opacity = "1";
                            }
                        );

                    },
                    250
                );

        }


        // Mientras se renderiza, los renderizadores que pidan
        // document.getElementById("app") reciben la zona de
        // preparación en lugar de la pantalla visible.
        document.getElementById =
            id => (
                id === "app"
                    ? staging
                    : Document.prototype.getElementById.call(
                        document,
                        id
                    )
            );


        try {

            await renderizarVista();

        }
        finally {

            delete document.getElementById;

        }


        // ===============================================
        // ESPERAR LOS DATOS DE LA VISTA (fichas, categorías...)
        // Si no se espera, la vista aparece con el contenedor
        // vacío (negro) y las fichas llegan después.
        // ===============================================

        const inicioEspera =
            performance.now();

        // La primera vista (bienvenida) no carga datos: no hace
        // falta esperar la red y se evita demorar el arranque.
        if (vistaSaliente) {

            await esperarRedQuieta();

        }

        console.log(
            `[transiciones] Datos listos en ${Math.round(performance.now() - inicioEspera)} ms ` +
            `(zona de preparación: ${staging.childNodes.length} nodos)`
        );


        // ===============================================
        // ESPERAR IMÁGENES (la vista aún está oculta)
        // ===============================================

        if (
            ESPERAR_IMAGENES_DE_VISTA &&
            staging.childNodes.length
        ) {

            const inicioImagenes =
                performance.now();

            await esperarImagenesDeVista(
                staging
            );

            console.log(
                `[transiciones] Imágenes listas en ${Math.round(performance.now() - inicioImagenes)} ms`
            );

        }


        // ===============================================
        // INSERTAR LA VISTA NUEVA
        // ===============================================

        let vistaEntrante =
            null;


        if (staging.childNodes.length) {

            vistaEntrante =
                staging.firstElementChild;

            app.prepend(
                ...staging.childNodes
            );

        }
        else {

            // Plan B: el renderizador escribió directo en
            // #app (guardó la referencia por su cuenta).
            console.warn(
                "[transiciones] La vista se escribió directo en #app " +
                "(no pasó por la zona de preparación). Revisar cómo " +
                "obtiene #app el renderizador (explorador.js)."
            );

            vistaEntrante =
                app.firstElementChild !== vistaSaliente
                    ? app.firstElementChild
                    : null;

            if (
                vistaSaliente &&
                !vistaSaliente.isConnected
            ) {

                app.appendChild(
                    vistaSaliente
                );

            }

        }


        staging.remove();

        staging =
            null;


        // ===============================================
        // ANIMAR
        // ===============================================

        app.classList.add(
            "transicionando"
        );


        await transitions.run(
            presetId,
            {
                fromEl:
                    vistaSaliente,

                toEl:
                    vistaEntrante
            }
        );


        if (vistaSaliente) {

            vistaSaliente.remove();

        }

    }
    catch (error) {

        console.error(
            "[transiciones] Error cambiando de vista:",
            error
        );


        // Si algo falló, no dejamos la pantalla en blanco.
        if (
            vistaSaliente &&
            !vistaSaliente.isConnected
        ) {

            app.appendChild(
                vistaSaliente
            );

        }

    }
    finally {

        clearTimeout(
            temporizadorIndicador
        );

        indicador?.remove();


        delete document.getElementById;


        if (staging) {

            staging.remove();

        }


        app.classList.remove(
            "transicionando"
        );


        transicionEnCurso =
            false;

    }

}


// =======================================================
// ENVOLVER NAVEGACIÓN
// =======================================================

function envolverNavegacion(
    nombreFuncion,
    presetId
) {

    const original =
        window[nombreFuncion];


    if (
        typeof original !==
        "function"
    ) {

        console.warn(
            `[transiciones] No encontré window.${nombreFuncion}()`
        );


        return;

    }


    window[nombreFuncion] =
        function (...args) {

            return cambiarVista(
                () => original(...args),
                presetId
            );

        };

}


// =======================================================
// INICIO
// =======================================================

function quitarPantallaDeCarga() {

    document.body.classList.remove(
        "cargando-visita"
    );

}


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        // Red de seguridad: pase lo que pase, a los 8 s se
        // quita la pantalla negra de carga.
        const vigilante =
            setTimeout(
                () => {

                    if (
                        document.body.classList.contains(
                            "cargando-visita"
                        )
                    ) {

                        console.warn(
                            "[transiciones] El arranque tardó más de 8 s; " +
                            "se quita la pantalla de carga."
                        );

                        quitarPantallaDeCarga();

                    }

                },
                8000
            );


        try {

            // Descarga las plantillas en segundo plano
            PLANTILLAS_PRECARGA.forEach(
                ruta => fetch(ruta).catch(() => {})
            );


            await Promise.all([

                esperarFuentes(),

                esperarImagen("img/mar.png"),

                esperarImagen("img/lineas-01.png"),

                esperarImagen("img/logo-museo-islas.png"),

                esperarImagen("img/clip.png")

            ]);


            // ===============================================
            // NAVEGACIÓN CON TRANSICIONES
            // ===============================================

            // Guardamos la función ORIGINAL antes de envolverla.
            // La primera vista debe usar la original: si usara la
            // envuelta, cambiarVista() se llamaría a sí misma y el
            // bloqueo anti doble-toque la cancelaría (pantalla negra).
            const bienvenidaOriginal =
                window.mostrarBienvenida;


            envolverNavegacion(
                "mostrarBienvenida",
                "fade"
            );


            envolverNavegacion(
                "mostrarExplorador",
                "fade"
            );


            // ===============================================
            // PRIMERA VISTA
            // ===============================================

            await cambiarVista(
                () => bienvenidaOriginal(),
                "fade"
            );

        }
        catch (error) {

            console.error(
                "[transiciones] Error en el arranque:",
                error
            );

        }
        finally {

            clearTimeout(
                vigilante
            );


            // ===============================================
            // MOSTRAR CUANDO ESTÁ LISTO
            // ===============================================

            requestAnimationFrame(
                quitarPantallaDeCarga
            );

        }

    }
);