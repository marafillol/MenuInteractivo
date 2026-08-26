import transitions from "./transitions/engine.js";

function esperarImagen(ruta) {

    return new Promise(resolve => {

        const imagen = new Image();

        imagen.onload = resolve;
        imagen.onerror = resolve;
        imagen.src = ruta;

    });

}

let viewportListo = false;

/**
 * Reemplaza el contenido de #app corriendo una transición entre la vista
 * saliente (lo que hoy hay en #app) y la entrante (lo que deja renderizarVista()
 * después de correr). No le importa qué hace renderizarVista() por dentro:
 * sólo necesita que, al terminar, #app tenga un único elemento raíz nuevo.
 */
async function cambiarVista(renderizarVista, presetId = "fade") {

    const app = document.getElementById("app");

    if (!viewportListo) {
        app.classList.add("transition-viewport");
        transitions.mount(app);
        viewportListo = true;
    }

    const vistaSaliente = app.firstElementChild; // null en la primera carga

    if (vistaSaliente) {
        app.removeChild(vistaSaliente);
    }

    renderizarVista(); // ejecuta mostrarBienvenida()/mostrarExplorador() original

    const vistaEntrante = app.firstElementChild;

    if (vistaSaliente) {
        app.appendChild(vistaSaliente); // se reinserta arriba para poder animarla
    }

    app.classList.add("transicionando");

    await transitions.run(presetId, {
        fromEl: vistaSaliente,
        toEl: vistaEntrante,
    });

    app.classList.remove("transicionando");

    if (vistaSaliente) {
        vistaSaliente.remove(); // limpieza: ya cumplió su función
    }

}

/**
 * Envuelve una función de navegación ya definida en window (por bienvenida.js,
 * explorador.js, etc.) para que pase por cambiarVista() antes de ejecutarse.
 * No modifica esos archivos: sólo reemplaza la referencia global.
 */
function envolverNavegacion(nombreFuncion, presetId) {

    const original = window[nombreFuncion];

    if (typeof original !== "function") {
        console.warn(`[transiciones] No encontré window.${nombreFuncion}()`);
        return;
    }

    window[nombreFuncion] = function (...args) {
        return cambiarVista(() => original(...args), presetId);
    };

}

document.addEventListener("DOMContentLoaded", async () => {

    const fuentes = document.fonts?.ready || Promise.resolve();

    await Promise.all([
        fuentes,
        esperarImagen("img/fondo-malvinass.png")
    ]);

    // A partir de acá, cada llamado a estas funciones corre con transición.
    envolverNavegacion("mostrarBienvenida", "fade");
    envolverNavegacion("mostrarExplorador", "book"); // probá "folder" también

    mostrarBienvenida(); // primera carga: fade-in desde vacío

    requestAnimationFrame(() => {
        document.body.classList.remove("cargando-visita");
    });

});