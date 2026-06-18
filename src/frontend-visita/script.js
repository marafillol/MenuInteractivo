let tiempoInactividad;
const TRES_MINUTOS = 3 * 60 * 1000;

document.addEventListener("DOMContentLoaded", () => {
    resetearTemporizadorInactividad();
    configurarDetectoresDeToque();
    cargarGrillaInicial();
});

/* =======================================================
   LOGICA DEL TEMPORIZADOR
   ======================================================= */
function resetearTemporizadorInactividad() {
    clearTimeout(tiempoInactividad);
    tiempoInactividad = setTimeout(() => {
        volverAlInicio();
    }, TRES_MINUTOS);
}

function configurarDetectoresDeToque() {
    ['touchstart', 'click', 'scroll'].forEach(evento => {
        document.addEventListener(evento, () => resetearTemporizadorInactividad());
    });
}

function volverAlInicio() {
    document.getElementById("contenedorFichas").innerHTML = "";
    document.getElementById("vistaDetalleFicha").style.display = "none";
    cerrarPanel();

    document.body.style.backgroundColor = "";
    cargarGrillaInicial();
}

/* =======================================================
   MOTOR DE INTERFAZ DINÁMICA
   ======================================================= */

function cargarGrillaInicial() {
    fetch("http://localhost:3000/menus")
        .then(res => res.json())
        .then(menus => {
            const grilla = document.getElementById("grillaMenus");
            grilla.innerHTML = "";
            grilla.style.display = "flex";
            document.getElementById("contenedorFichas").innerHTML = "";

            menus.forEach(menu => {
                const botonMenu = document.createElement("div");
                botonMenu.className = "tarjeta-menu";
                botonMenu.textContent = menu.descripcion;
                botonMenu.addEventListener("click", () => cargarPantallaDinamica(menu.id_menu));
                grilla.appendChild(botonMenu);
            });
        });
}

function cargarPantallaDinamica(id_menu) {
    fetch(`http://localhost:3000/api/estructura-pantalla/${id_menu}`)
        .then(res => res.json())
        .then(estructura => {
            document.getElementById("grillaMenus").style.display = "none";
            const contenedor = document.getElementById("contenedorFichas");
            const configVisual = estructura.configuracionMenu.interfazConfig || {};

            if (configVisual.colorFondo) document.body.style.backgroundColor = configVisual.colorFondo;

            contenedor.innerHTML = `
                <div class="menu-header">
                    <button id="btnVolverMenuPrincipal">⬅ Volver al Inicio</button>
                    <h3>Sección: ${estructura.configuracionMenu.descripcion}</h3>
                </div>
                <div id="listaFichasDinamica" class="${configVisual.layoutClass || 'grilla-fichas'}"></div>
            `;

            document.getElementById("btnVolverMenuPrincipal").addEventListener("click", volverAlInicio);

            const listaFichas = document.getElementById("listaFichasDinamica");
            const esVeteranos = (configVisual.layoutClass === 'layout-veteranos-grid');

            estructura.elementosFichas.forEach(ficha => {
                if (ficha.visible === 0) return;

                const tarjetaFicha = document.createElement("div");
                tarjetaFicha.className = `tarjeta-ficha ${esVeteranos ? 'plantilla-veterano' : 'generica'}`;

                // CORRECCIÓN: usamos ficha.imagen
                const rutaImg = ficha.imagen || '/fotos/soldados/soldado.png';

                tarjetaFicha.innerHTML = `
                    <div class="contenedor-foto" style="width:100%; height:150px; overflow:hidden; background:#333;">
                        <img src="${rutaImg}" alt="${ficha.titulo}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <h4>${ficha.titulo}</h4>
                    <p>${ficha.resumen || ''}</p>
                    <button class="btn-ver-mas">Explorar Historia →</button>
                `;

                tarjetaFicha.querySelector(".btn-ver-mas").addEventListener("click", () => {
                    if (esVeteranos) {
                        mostrarFichaEnPanelLateral(ficha);
                    } else {
                        mostrarFichaExpandidaDinamica(ficha);
                    }
                });

                listaFichas.appendChild(tarjetaFicha);
            });
        });
}

/* =======================================================
   MANEJO DE DETALLE (PANEL LATERAL vs MODAL)
   ======================================================= */

function mostrarFichaEnPanelLateral(ficha) {
    const panel = document.getElementById("panel-lateral-detalle");
    const contenido = document.getElementById("contenido-detalle");

    // CORRECCIÓN: usamos ficha.imagen
    const rutaImg = ficha.imagen || '/fotos/soldados/soldado.png';

    contenido.innerHTML = `
        <img src="${rutaImg}" style="width:100%; height:auto; margin-bottom:20px; border-radius:4px;">
        <h2>${ficha.titulo}</h2>
        <p>${ficha.texto}</p>
    `;

    panel.classList.add('panel-abierto');
}

function cerrarPanel() {
    document.getElementById("panel-lateral-detalle").classList.remove('panel-abierto');
}

function mostrarFichaExpandidaDinamica(ficha) {
    const vistaDetalle = document.getElementById("vistaDetalleFicha");
    vistaDetalle.style.display = "flex";
    vistaDetalle.innerHTML = `
        <div class="modal-contenido">
            <button onclick="document.getElementById('vistaDetalleFicha').style.display='none'">X</button>
            <h2>${ficha.titulo}</h2>
            <p>${ficha.texto}</p>
        </div>
    `;
}