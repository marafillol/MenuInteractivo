// =======================================================
// CONFIGURACIÓN
// =======================================================

// Plantillas HTML que se descargan al arrancar, para que
// el primer cambio de vista no espere a la red.
// Agregá acá la plantilla del explorador si tiene su propio .html
const PLANTILLAS_PRECARGA = [
    "html/bienvenida.html",
    "html/ficha.html",
    "html/explorador.html",
    "html/historiaCompleta.html"
];



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

        return fetchOriginal(
            recurso,
            opciones
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


    // Cada llamada recibe su propia copia de la respuesta.
    return cachePlantillas
        .get(url)
        .then(respuesta => respuesta.clone());

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


// Evita que un doble toque dispare dos transiciones a la vez
// (en un tótem táctil es la causa más común de glitches).
let transicionEnCurso =
    false;


const descriptorGetElementById =
    Object.getOwnPropertyDescriptor(
        document,
        "getElementById"
    );

const getElementByIdOriginal =
    document.getElementById;

function restaurarGetElementById() {

    if (descriptorGetElementById) {

        Object.defineProperty(
            document,
            "getElementById",
            descriptorGetElementById
        );

    } else {

        delete document.getElementById;

    }

}

// =======================================================
// CAMBIAR VISTA
//
// La vista nueva se arma en una zona de preparación
// OCULTA mientras la vista actual sigue a la vista de todos.
// Recién cuando está lista (HTML + datos + imágenes) se
// inserta y se anima. Así #app nunca queda vacío (negro).
// =======================================================

async function cambiarVista(renderizarVista) {

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



    try {

        app.classList.add(
            "transition-viewport"
        );


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
            app.className;

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

        // Mientras se renderiza, los renderizadores que pidan
        // document.getElementById("app") reciben la zona de
        // preparación en lugar de la pantalla visible.

        document.getElementById =
            function (id) {

                return id === "app"
                    ? staging
                    : getElementByIdOriginal.call(
                        document,
                        id
                    );

            };



        try {

            await renderizarVista();

        }
        finally {

            restaurarGetElementById();

        }


        // ===============================================
        // ESPERAR LOS DATOS DE LA VISTA (fichas, categorías...)
        // Si no se espera, la vista aparece con el contenedor
        // vacío (negro) y las fichas llegan después.
        // ===============================================

        console.log(
            `[transiciones] Vista preparada ` +
            `(zona de preparación: ${staging.childNodes.length} nodos)`
        );

        // ===============================================
        // INSERTAR LA VISTA NUEVA
        // ===============================================

        if (staging.childNodes.length) {

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


        // Retirar la vista anterior una vez insertada la nueva.
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



        restaurarGetElementById();


        if (staging) {

            staging.remove();

        }


        transicionEnCurso =
            false;

    }

}


// =======================================================
// ENVOLVER NAVEGACIÓN
// =======================================================

function envolverNavegacion(
    nombreFuncion
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

            if (nombreFuncion === "mostrarExplorador") {
                console.log(
                    "[MEDICIÓN] Clic en Explorar historias"
                );
            }

            return cambiarVista(
                () => original(...args)
            );

        };

}


// =======================================================
// INICIO
// =======================================================

function quitarPantallaDeCarga() {

    console.log(
        `[ARRANQUE] Se quita la pantalla de carga a los ${
            Math.round(performance.now())
        } ms desde la navegación`
    );

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


            // Precargar recursos en segundo plano, sin bloquear el arranque.
            Promise.all([
                esperarFuentes(),
                esperarImagen("img/mar.png"),
                esperarImagen("img/lineas-01.png"),
                esperarImagen("img/logo-museo-islas.png"),
                esperarImagen("img/clip.png")
            ]).catch(error => {
                console.warn(
                    "[transiciones] Error precargando recursos:",
                    error
                );
            });


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
                "mostrarBienvenida"

            );


            envolverNavegacion(
                "mostrarExplorador"

            );


            // ===============================================
            // PRIMERA VISTA
            // ===============================================

            const inicioBienvenida = performance.now();

            console.log(
                "[ARRANQUE] Comienza a mostrar la bienvenida",
                Math.round(performance.now()),
                "ms desde navigation start"
            );

            await cambiarVista(
                () => bienvenidaOriginal()

            );
            console.log(
                "[ARRANQUE] cambiarVista terminó",
                Math.round(performance.now()),
                "ms desde navigation start"
            );

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    console.log(
                        `[ARRANQUE] Bienvenida visible y pintada aproximadamente a los ${
                            Math.round(performance.now())
                        } ms`
                    );
                });
            });

            console.log(
                `[ARRANQUE] Bienvenida preparada en ${
                    Math.round(performance.now() - inicioBienvenida)
                } ms`
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
