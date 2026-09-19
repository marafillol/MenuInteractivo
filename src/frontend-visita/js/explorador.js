
// =======================================================
// EXPLORADOR
// Museo Malvinas
// Veteranos de Malvinas
//
// Carga las fichas desde la API pública, las muestra,
// permite buscar/filtrar y abre historiaCompleta.js.
// =======================================================

// =======================================================
// ESTADO
// =======================================================

let fichasExplorador = [];
let menusExplorador = [];
let etiquetasExplorador = [];

// =======================================================
// MOSTRAR EXPLORADOR
// =======================================================

async function mostrarExplorador() {

    const app = document.getElementById("app");

    if (!app) {
        console.error("[explorador] No existe #app");
        return;
    }

    try {

        const respuesta =
            await fetch("html/explorador.html");

        if (!respuesta.ok) {
            throw new Error(
                `No se pudo cargar explorador.html (${respuesta.status})`
            );
        }

        const html =
            await respuesta.text();

        // Cargar directamente la vista
        app.innerHTML = html;

        // Inicializar
        await inicializarExplorador();

    }
    catch (error) {

        console.error(
            "[explorador] Error cargando la vista:",
            error
        );

        app.innerHTML = `
            <section class="error-vista">
                <h2>No se pudo cargar el explorador</h2>
                <p>Intente nuevamente.</p>
            </section>
        `;
    }
}

window.mostrarExplorador = mostrarExplorador;

// =======================================================
// INICIALIZAR EXPLORADOR
// =======================================================

async function inicializarExplorador() {

    console.log("[explorador] Inicializando...");

    await cargarFichasExplorador();

    const btnIndice =
        document.getElementById("btnIndice");

    const btnBuscar =
        document.getElementById("btnBuscar");

    const panelIndice =
        document.getElementById("panelIndice");

    const panelBusqueda =
        document.getElementById("panelBusqueda");

    const cerrarIndice =
        document.getElementById("cerrarIndice");

    const cerrarBusqueda =
        document.getElementById("cerrarBusqueda");

    const buscador =
        document.getElementById("buscador");

    const ejecutarBusqueda =
        document.getElementById("ejecutarBusqueda");

    const limpiarBusqueda =
        document.getElementById("limpiarBusqueda");

    const teclado =
        document.getElementById("tecladoVirtual");

    // ===================================================
    // ÍNDICE
    // ===================================================

    btnIndice?.addEventListener("click", evento => {

        evento.stopPropagation();

        cerrarPaneles();

        panelIndice?.classList.add("activo");
        panelIndice?.setAttribute(
            "aria-hidden",
            "false"
        );

        renderizarIndice();

    });

    // ===================================================
    // BUSCAR
    // ===================================================

    btnBuscar?.addEventListener("click", evento => {

        evento.stopPropagation();

        cerrarPaneles();

        panelBusqueda?.classList.add("activo");
        panelBusqueda?.setAttribute(
            "aria-hidden",
            "false"
        );

    });

    // ===================================================
    // CERRAR ÍNDICE
    // ===================================================

    cerrarIndice?.addEventListener("click", evento => {

        evento.stopPropagation();

        panelIndice?.classList.remove("activo");
        panelIndice?.setAttribute(
            "aria-hidden",
            "true"
        );

    });

    // ===================================================
    // CERRAR BÚSQUEDA
    // ===================================================

    cerrarBusqueda?.addEventListener("click", evento => {

        evento.stopPropagation();

        if (buscador) {
            buscador.value = "";
        }

        mostrarTodasLasFichas();
        cerrarPaneles();

    });

    // ===================================================
    // LIMPIAR BÚSQUEDA
    // ===================================================

    limpiarBusqueda?.addEventListener("click", evento => {

        evento.stopPropagation();

        if (!buscador) {
            return;
        }

        buscador.value = "";

        mostrarTodasLasFichas();

        buscador.focus();

    });

    // ===================================================
    // BUSCADOR
    // ===================================================

    buscador?.addEventListener("input", () => {

        filtrarFichasExplorador(
            buscador.value
        );

    });

    // ===================================================
    // EJECUTAR BÚSQUEDA
    // ===================================================

    ejecutarBusqueda?.addEventListener("click", evento => {

        evento.stopPropagation();

        if (!buscador) {
            return;
        }

        filtrarFichasExplorador(
            buscador.value
        );

        panelBusqueda?.classList.remove("activo");
        panelBusqueda?.setAttribute(
            "aria-hidden",
            "true"
        );

    });

    // ===================================================
    // TECLADO VIRTUAL
    // ===================================================

    if (teclado) {

        const teclas =
            teclado.querySelectorAll(
                "button[data-tecla]"
            );

        teclas.forEach(tecla => {

            tecla.addEventListener("click", evento => {

                evento.stopPropagation();

                if (!buscador) {
                    return;
                }

                const valor =
                    tecla.dataset.tecla;

                if (!valor) {
                    return;
                }

                if (valor === "borrar") {

                    buscador.value =
                        buscador.value.slice(0, -1);

                }
                else if (valor === "espacio") {

                    buscador.value += " ";

                }
                else if (valor === "limpiar") {

                    buscador.value = "";

                }
                else {

                    buscador.value += valor;

                }

                buscador.dispatchEvent(
                    new Event("input", {
                        bubbles: true
                    })
                );

                buscador.focus();

            });

        });

    }

    // ===================================================
    // EVENTOS GLOBALES
    // ===================================================

    document.addEventListener(
        "keydown",
        manejarEscape
    );

    document.addEventListener(
        "click",
        manejarClickExterior
    );

    // ===================================================
    // ESTADO INICIAL
    // ===================================================

    renderizarIndice();

    console.log(
        "[explorador] Inicialización completa."
    );

}

// =======================================================
// CARGAR FICHAS DESDE LA BASE DE DATOS
// =======================================================

async function cargarFichasExplorador() {

    console.log(
        "[explorador] Consultando APIs públicas..."
    );

    const contenedor =
        document.getElementById(
            "contenedorFichas"
        );

    try {

        // Fichas
        const respuestaFichas =
            await fetch("/api/public/fichas");

        if (!respuestaFichas.ok) {
            throw new Error(
                `Error fichas HTTP ${respuestaFichas.status}`
            );
        }

        const datosFichas =
            await respuestaFichas.json();

        if (!Array.isArray(datosFichas)) {
            throw new Error(
                "La API no devolvió un array de fichas."
            );
        }

        fichasExplorador =
            datosFichas.map(normalizarFicha);

        // Menús
        const respuestaMenus =
            await fetch("/api/public/menus");

        if (!respuestaMenus.ok) {
            throw new Error(
                `Error menús HTTP ${respuestaMenus.status}`
            );
        }

        const datosMenus =
            await respuestaMenus.json();

        if (!Array.isArray(datosMenus)) {
            throw new Error(
                "La API no devolvió un array de menús."
            );
        }

        menusExplorador = datosMenus;

        // Etiquetas
        const respuestaEtiquetas =
            await fetch("/api/public/etiquetas");

        if (!respuestaEtiquetas.ok) {
            throw new Error(
                `Error etiquetas HTTP ${respuestaEtiquetas.status}`
            );
        }

        const datosEtiquetas =
            await respuestaEtiquetas.json();

        if (!Array.isArray(datosEtiquetas)) {
            throw new Error(
                "La API no devolvió un array de etiquetas."
            );
        }

        etiquetasExplorador = datosEtiquetas;

        mostrarTodasLasFichas();
        renderizarIndice();
        actualizarMensajeCentral();

    }
    catch (error) {

        console.error(
            "[explorador] Error cargando datos:",
            error
        );

        if (contenedor) {

            contenedor.innerHTML = `
                <div class="estado-explorador">
                    <strong>
                        No se pudo consultar el archivo
                    </strong>
                    <span>
                        Verifique la conexión con el servidor.
                    </span>
                </div>
            `;

        }

    }

}

// =======================================================
// NORMALIZAR FICHA
// =======================================================

function normalizarFicha(ficha) {

    const datos =
        ficha?.datos_json &&
        typeof ficha.datos_json === "object"
            ? ficha.datos_json
            : {};

    return {

        ...ficha,

        datos_json: datos,

        nombre:
            datos.Nombre ||
            ficha.titulo ||
            "",

        apellido:
            datos.Apellido ||
            "",

        fuerza:
            datos.Fuerza ||
            ""

    };

}

// =======================================================
// MOSTRAR TODAS LAS FICHAS
// =======================================================

function mostrarTodasLasFichas() {

    renderizarResultados(
        fichasExplorador
    );

}

// =======================================================
// FILTRAR FICHAS
// =======================================================

function filtrarFichasExplorador(texto) {

    const termino =
        normalizarTexto(texto);

    if (!termino) {
        mostrarTodasLasFichas();
        return;
    }

    const resultados =
        fichasExplorador.filter(
            ficha =>
                fichaCoincideBusqueda(
                    ficha,
                    termino
                )
        );

    renderizarResultados(resultados);

}

// =======================================================
// COMPROBAR COINCIDENCIA
// =======================================================

function fichaCoincideBusqueda(
    ficha,
    termino
) {

    if (!ficha) {
        return false;
    }

    if (
        normalizarTexto(ficha.titulo)
            .includes(termino)
    ) {
        return true;
    }

    if (
        normalizarTexto(ficha.nombre)
            .includes(termino)
    ) {
        return true;
    }

    if (
        normalizarTexto(ficha.apellido)
            .includes(termino)
    ) {
        return true;
    }

    if (
        ficha.datos_json &&
        typeof ficha.datos_json === "object"
    ) {

        const valores =
            Object.values(ficha.datos_json)
                .filter(
                    valor =>
                        valor !== null &&
                        valor !== undefined
                )
                .join(" ");

        if (
            normalizarTexto(valores)
                .includes(termino)
        ) {
            return true;
        }

    }

    return false;

}

// =======================================================
// NORMALIZAR TEXTO
// =======================================================

function normalizarTexto(texto) {

    return String(texto ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

}

// =======================================================
// RENDERIZAR RESULTADOS
// =======================================================

function renderizarResultados(resultados) {

    const contenedor =
        document.getElementById(
            "contenedorFichas"
        );

    if (!contenedor) {

        console.warn(
            "[explorador] No existe #contenedorFichas"
        );

        return;
    }

    contenedor.innerHTML = "";

    if (
        !Array.isArray(resultados) ||
        resultados.length === 0
    ) {

        contenedor.innerHTML = `
            <div class="estado-explorador">
                <span>
                    No se encontraron expedientes.
                </span>
            </div>
        `;

        return;
    }

    const ordenados =
        [...resultados].sort(
            (a, b) => {

                const nombreA =
                    normalizarTexto(
                        obtenerNombreFicha(a)
                    );

                const nombreB =
                    normalizarTexto(
                        obtenerNombreFicha(b)
                    );

                return nombreA.localeCompare(
                    nombreB,
                    "es"
                );

            }
        );

    ordenados.forEach(ficha => {

        const tarjeta =
            crearTarjetaDesdeFicha(ficha);

        if (tarjeta) {
            contenedor.appendChild(tarjeta);
        }

    });

}

// =======================================================
// CREAR TARJETA
// =======================================================

function crearTarjetaDesdeFicha(ficha) {

    if (!ficha) {
        return null;
    }

    const tarjeta =
        document.createElement("article");

    tarjeta.className = "tarjetaFicha";
    tarjeta.dataset.id =
        ficha.id_ficha || "";

    tarjeta.setAttribute(
        "role",
        "button"
    );

    tarjeta.setAttribute(
        "tabindex",
        "0"
    );

    // Fondo
    const fondo =
        document.createElement("div");

    fondo.className = "fondoFicha";

    tarjeta.appendChild(fondo);

    // Cabecera
    const cabecera =
        document.createElement("div");

    cabecera.className =
        "cabeceraFicha";

    const numero =
        document.createElement("span");

    numero.className =
        "numeroFicha";

    numero.textContent =
        `EXP. Nº ${ficha.id_ficha}`;

    cabecera.appendChild(numero);
    tarjeta.appendChild(cabecera);

    // Imagen
    const imagenContenedor =
        document.createElement("div");

    imagenContenedor.className =
        "imagenFicha";

    const imagen =
        document.createElement("img");

    imagen.src =
        obtenerImagenExplorador(ficha);

    imagen.alt =
        obtenerNombreFicha(ficha);

    imagen.loading = "lazy";

    imagen.onerror = function () {

        if (this.dataset.fallback) {
            return;
        }

        this.dataset.fallback = "true";
        this.src = "/imagenes/default.png";

    };

    imagenContenedor.appendChild(imagen);
    tarjeta.appendChild(imagenContenedor);

    // Información
    const informacion =
        document.createElement("div");

    informacion.className =
        "infoFicha";

    // Título
    const titulo =
        document.createElement("h3");

    titulo.textContent =
        obtenerNombreFicha(ficha);

    informacion.appendChild(titulo);

    // Campos de la plantilla
    const campos =
        document.createElement("div");

    campos.className =
        "camposTarjeta";

    const datos =
        ficha.datos_json || {};

    const camposPlantilla =
        ficha.plantilla
            ?.estructura
            ?.campos;

    if (Array.isArray(camposPlantilla)) {

        camposPlantilla.forEach(campo => {

            if (
                !campo ||
                campo.mostrarTarjeta !== true
            ) {
                return;
            }

            const valor =
                datos[campo.nombre];

            if (
                valor === undefined ||
                valor === null ||
                String(valor).trim() === ""
            ) {
                return;
            }

            const fila =
                document.createElement("div");

            fila.className =
                "campoFicha";

            const etiqueta =
                document.createElement("span");

            etiqueta.className =
                "etiquetaCampo";

            etiqueta.textContent =
                campo.etiqueta ||
                campo.nombre ||
                "";

            const valorElemento =
                document.createElement("span");

            valorElemento.className =
                "valorCampo";

            valorElemento.textContent =
                valor;

            fila.appendChild(etiqueta);
            fila.appendChild(valorElemento);

            campos.appendChild(fila);

        });

    }

    informacion.appendChild(campos);
    tarjeta.appendChild(informacion);

    // Pie
    const pie =
        document.createElement("div");

    pie.className =
        "pieFicha";

    pie.textContent =
        "CONSULTAR EXPEDIENTE";

    tarjeta.appendChild(pie);

    // Click
    tarjeta.addEventListener(
        "click",
        evento => {

            evento.stopPropagation();

            abrirVeterano(ficha);

        }
    );

    // Teclado
    tarjeta.addEventListener(
        "keydown",
        evento => {

            if (
                evento.key === "Enter" ||
                evento.key === " "
            ) {

                evento.preventDefault();

                abrirVeterano(ficha);

            }

        }
    );

    return tarjeta;

}

// =======================================================
// OBTENER IMAGEN
// =======================================================

function obtenerImagenExplorador(ficha) {

    if (
        !ficha ||
        !ficha.imagen ||
        typeof ficha.imagen !== "string"
    ) {
        return "/imagenes/default.png";
    }

    const imagen = ficha.imagen;

    if (
        imagen.startsWith("http://") ||
        imagen.startsWith("https://") ||
        imagen.startsWith("data:")
    ) {
        return imagen;
    }

    if (imagen.startsWith("/")) {
        return imagen;
    }

    return "/" +
        imagen.replace(/^\/+/, "");

}

// =======================================================
// OBTENER NOMBRE DE FICHA
// =======================================================

function obtenerNombreFicha(ficha) {

    if (!ficha) {
        return "Ficha sin nombre";
    }

    const nombre =
        ficha.datos_json?.Nombre;

    if (
        nombre &&
        String(nombre).trim()
    ) {
        return String(nombre).trim();
    }

    if (
        ficha.titulo &&
        String(ficha.titulo).trim()
    ) {
        return String(ficha.titulo).trim();
    }

    return `Expediente Nº ${ficha.id_ficha}`;

}

// =======================================================
// ÍNDICE
// =======================================================

function renderizarIndice() {

    const contenedor =
        document.querySelector(
            ".contenido-indice"
        );

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = "";

    // Columnas
    const columnaMenus =
        document.createElement("div");

    columnaMenus.className =
        "columna-indice columna-menus";

    const columnaEtiquetas =
        document.createElement("div");

    columnaEtiquetas.className =
        "columna-indice columna-etiquetas";

    // Títulos
    const tituloMenus =
        document.createElement("h3");

    tituloMenus.className =
        "titulo-indice-seccion";

    tituloMenus.textContent =
        "MENÚS";

    columnaMenus.appendChild(tituloMenus);

    const tituloEtiquetas =
        document.createElement("h3");

    tituloEtiquetas.className =
        "titulo-indice-seccion";

    tituloEtiquetas.textContent =
        "ETIQUETAS";

    columnaEtiquetas.appendChild(
        tituloEtiquetas
    );

    // Todos
    const botonTodos =
        document.createElement("button");

    botonTodos.type = "button";

    botonTodos.className =
        "item-indice boton-todos";

    botonTodos.textContent =
        "TODOS";

    botonTodos.addEventListener(
        "click",
        evento => {

            evento.stopPropagation();

            mostrarTodasLasFichas();
            cerrarPaneles();
            actualizarMensajeCentral();

        }
    );

    columnaMenus.appendChild(botonTodos);

    // Menús
    if (menusExplorador.length) {

        menusExplorador.forEach(menu => {

            const boton =
                document.createElement("button");

            boton.type = "button";
            boton.className = "item-indice";
            boton.textContent = menu.nombre;

            boton.addEventListener(
                "click",
                evento => {

                    evento.stopPropagation();

                    mostrarFichasPorMenu(
                        menu.id_menu
                    );

                }
            );

            columnaMenus.appendChild(boton);

        });

    }
    else {

        const vacio =
            document.createElement("p");

        vacio.className =
            "indice-vacio";

        vacio.textContent =
            "No hay menús disponibles.";

        columnaMenus.appendChild(vacio);

    }

    // Etiquetas
    if (etiquetasExplorador.length) {

        etiquetasExplorador.forEach(etiqueta => {

            const boton =
                document.createElement("button");

            boton.type = "button";
            boton.className = "item-indice";
            boton.textContent = etiqueta.nombre;

            boton.addEventListener(
                "click",
                evento => {

                    evento.stopPropagation();

                    mostrarFichasPorEtiqueta(
                        etiqueta.id_etiqueta
                    );

                }
            );

            columnaEtiquetas.appendChild(boton);

        });

    }
    else {

        const vacio =
            document.createElement("p");

        vacio.className =
            "indice-vacio";

        vacio.textContent =
            "No hay etiquetas disponibles.";

        columnaEtiquetas.appendChild(vacio);

    }

    contenedor.appendChild(columnaMenus);
    contenedor.appendChild(columnaEtiquetas);

}

// =======================================================
// FILTRAR POR MENÚ
// =======================================================

function mostrarFichasPorMenu(idMenu) {

    console.log(
        "[explorador] Filtrando por menú:",
        idMenu
    );

    const fichasFiltradas =
        fichasExplorador.filter(
            ficha =>
                Number(ficha.id_menu) ===
                Number(idMenu)
        );

    renderizarResultados(
        fichasFiltradas
    );

    cerrarPaneles();
    actualizarMensajeCentral();

}

// =======================================================
// FILTRAR POR ETIQUETA
// =======================================================

async function mostrarFichasPorEtiqueta(idEtiqueta) {

    console.log(
        "[explorador] Filtrando por etiqueta:",
        idEtiqueta
    );

    try {

        const respuesta =
            await fetch(
                `/api/public/fichas/etiqueta/${idEtiqueta}`
            );

        if (!respuesta.ok) {
            throw new Error(
                `HTTP ${respuesta.status}`
            );
        }

        const fichas =
            await respuesta.json();

        if (!Array.isArray(fichas)) {
            throw new Error(
                "La API no devolvió un array de fichas."
            );
        }

        const fichasFiltradas =
            fichas.map(normalizarFicha);

        renderizarResultados(
            fichasFiltradas
        );

        cerrarPaneles();
        actualizarMensajeCentral();

    }
    catch (error) {

        console.error(
            "[explorador] Error filtrando por etiqueta:",
            error
        );

    }

}

// =======================================================
// ABRIR FICHA DESDE ÍNDICE
// =======================================================

function abrirFichaDesdeIndice(ficha) {

    if (!ficha) {
        return;
    }

    cerrarPaneles();

    const tarjeta =
        document.querySelector(
            `.tarjetaFicha[data-id="${ficha.id_ficha}"]`
        );

    if (tarjeta) {

        tarjeta.scrollIntoView({
            behavior: "auto",
            block: "center"
        });

        abrirVeterano(ficha);

        return;
    }

    abrirVeterano(ficha);

}

// =======================================================
// ABRIR HISTORIA COMPLETA
// =======================================================

function abrirVeterano(ficha) {

    if (!ficha) {
        return;
    }

    const id =
        ficha.id_ficha;

    if (!id) {

        console.warn(
            "[explorador] La ficha no tiene id_ficha."
        );

        return;
    }

    console.log(
        "[explorador] Abriendo ficha:",
        id
    );

    if (
        typeof window.abrirHistoriaCompleta ===
        "function"
    ) {

        window.abrirHistoriaCompleta(id);
        return;

    }

    console.warn(
        "[explorador] historiaCompleta.js todavía no está disponible."
    );

}

// =======================================================
// ACTUALIZAR MENSAJE CENTRAL
// =======================================================

function actualizarMensajeCentral() {

    const mensaje =
        document.getElementById(
            "mensajeExplorador"
        );

    if (!mensaje) {
        return;
    }

    mensaje.classList.toggle(
        "hay-fichas",
        fichasExplorador.length > 0
    );

}

// =======================================================
// CERRAR PANELES
// =======================================================

function cerrarPaneles() {

    const indice =
        document.getElementById(
            "panelIndice"
        );

    const busqueda =
        document.getElementById(
            "panelBusqueda"
        );

    indice?.classList.remove("activo");
    busqueda?.classList.remove("activo");

    indice?.setAttribute(
        "aria-hidden",
        "true"
    );

    busqueda?.setAttribute(
        "aria-hidden",
        "true"
    );

}

// =======================================================
// ESC
// =======================================================

function manejarEscape(evento) {

    if (evento.key === "Escape") {
        cerrarPaneles();
    }

}

// =======================================================
// CLICK EXTERIOR
// =======================================================

function manejarClickExterior(evento) {

    const indice =
        document.getElementById(
            "panelIndice"
        );

    const busqueda =
        document.getElementById(
            "panelBusqueda"
        );

    const btnIndice =
        document.getElementById(
            "btnIndice"
        );

    const btnBuscar =
        document.getElementById(
            "btnBuscar"
        );

    const dentroIndice =
        indice?.contains(evento.target);

    const dentroBusqueda =
        busqueda?.contains(evento.target);

    const botonIndice =
        btnIndice?.contains(evento.target);

    const botonBuscar =
        btnBuscar?.contains(evento.target);

    if (
        !dentroIndice &&
        !dentroBusqueda &&
        !botonIndice &&
        !botonBuscar
    ) {

        cerrarPaneles();

    }

}

// =======================================================
// API PÚBLICA
// =======================================================

window.exploradorPublico = {

    cargar:
        cargarFichasExplorador,

    obtener:
        () => [...fichasExplorador],

    buscar:
        filtrarFichasExplorador,

    cerrar:
        cerrarPaneles

};

// =======================================================
// DEBUG
// =======================================================

console.log(
    "[explorador] explorador.js cargado correctamente."
);