// =======================================================
// TRANSICIONES
// =======================================================

import transitions from "./transitions/engine.js";


// =======================================================
// ESPERAR IMAGEN
// =======================================================

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


// =======================================================
// ESTADO
// =======================================================

let viewportListo =
    false;


// =======================================================
// CAMBIAR VISTA
// =======================================================

async function cambiarVista(
    renderizarVista,
    presetId = "fade"
) {

    const app =
        document.getElementById(
            "app"
        );


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


    const vistaSaliente =
        app.firstElementChild;


    if (vistaSaliente) {

        app.removeChild(
            vistaSaliente
        );

    }


    // ===================================================
    // IMPORTANTE:
    // AHORA ESPERAMOS LA VISTA
    // ===================================================

    await renderizarVista();


    const vistaEntrante =
        app.firstElementChild;


    if (vistaSaliente) {

        app.appendChild(
            vistaSaliente
        );

    }


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


    app.classList.remove(
        "transicionando"
    );


    if (vistaSaliente) {

        vistaSaliente.remove();

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

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const fuentes =
            document.fonts?.ready
            ||
            Promise.resolve();


        await Promise.all([

            fuentes,

            esperarImagen(
                "img/fondo-malvinass.png"
            )

        ]);


        // ===================================================
        // NAVEGACIÓN CON TRANSICIONES
        // ===================================================

        envolverNavegacion(
            "mostrarBienvenida",
            "fade"
        );


        envolverNavegacion(
            "mostrarExplorador",
            "fade"
        );


        // ===================================================
        // PRIMERA VISTA
        // ===================================================

        await cambiarVista(
            () => mostrarBienvenida(),
            "fade"
        );


        // ===================================================
        // MOSTRAR CUANDO ESTÁ LISTO
        // ===================================================

        requestAnimationFrame(() => {

            document.body.classList.remove(
                "cargando-visita"
            );

        });

    }
);