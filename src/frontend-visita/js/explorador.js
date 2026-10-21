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

// El menú y el criterio de búsqueda sobreviven al cierre de paneles,
// a la apertura de una ficha y al regreso al índice.
let menuExploradorSeleccionado = null; // null representa «Todos».
let terminoBusquedaExplorador = "";
let etiquetaExploradorSeleccionada = null;

// Cuántas tarjetas entran en la primera pantalla. Sus fotos se cargan
// al instante (eager) y la vista espera a que estén listas; el resto
// queda en "lazy" para no bajar cientos de imágenes de golpe.
const FICHAS_PRIMERA_PANTALLA = 12;

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

        terminoBusquedaExplorador = "";
        etiquetaExploradorSeleccionada = null;
        renderizarFichasVisibles();
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
        terminoBusquedaExplorador = "";
        etiquetaExploradorSeleccionada = null;

        renderizarFichasVisibles();



    });

    // ===================================================
    // BUSCADOR
    // ===================================================

    buscador?.addEventListener("input", () => {

        terminoBusquedaExplorador = buscador.value;
        etiquetaExploradorSeleccionada = null;
        filtrarFichasExplorador(
            terminoBusquedaExplorador
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

    renderizarFichasVisibles();
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

        // Las tres consultas se hacen EN PARALELO. Antes iban una
        // detrás de otra y los tiempos del servidor se sumaban.
        const [
            respuestaFichas,
            respuestaMenus,
            respuestaEtiquetas
        ] = await Promise.all([
            fetch("/api/public/fichas"),
            fetch("/api/public/menus"),
            fetch("/api/public/etiquetas")
        ]);

        if (!respuestaFichas.ok) {
            throw new Error(
                `Error fichas HTTP ${respuestaFichas.status}`
            );
        }

        if (!respuestaMenus.ok) {
            throw new Error(
                `Error menús HTTP ${respuestaMenus.status}`
            );
        }

        if (!respuestaEtiquetas.ok) {
            throw new Error(
                `Error etiquetas HTTP ${respuestaEtiquetas.status}`
            );
        }

        const [
            datosFichas,
            datosMenus,
            datosEtiquetas
        ] = await Promise.all([
            respuestaFichas.json(),
            respuestaMenus.json(),
            respuestaEtiquetas.json()
        ]);

        if (!Array.isArray(datosFichas)) {
            throw new Error(
                "La API no devolvió un array de fichas."
            );
        }

        if (!Array.isArray(datosMenus)) {
            throw new Error(
                "La API no devolvió un array de menús."
            );
        }

        if (!Array.isArray(datosEtiquetas)) {
            throw new Error(
                "La API no devolvió un array de etiquetas."
            );
        }


        fichasExplorador =
            datosFichas.map(normalizarFicha);

        menusExplorador = datosMenus.map(menu => {
            let plantilla = null;

            try {
                plantilla = menu.plantilla_json
                    ? (
                        typeof menu.plantilla_json === "string"
                            ? JSON.parse(menu.plantilla_json)
                            : menu.plantilla_json
                    )
                    : null;
            } catch (error) {
                console.error(
                    "[explorador] Error leyendo la plantilla del menú:",
                    menu.id_menu,
                    error
                );
            }

            return {
                ...menu,
                plantilla
            };
        });

        etiquetasExplorador = datosEtiquetas;


        // No reiniciar la selección al volver a cargar datos del explorador.
        if (
            menuExploradorSeleccionado !== null &&
            !menusExplorador.some(menu =>
                Number(menu.id_menu) === Number(menuExploradorSeleccionado)
            )
        ) {
            menuExploradorSeleccionado = null;
        }

        const buscadorActual = document.getElementById("buscador");
        if (buscadorActual) {
            buscadorActual.value = terminoBusquedaExplorador;
        }

        renderizarFichasVisibles();
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
// ESTADO Y FILTRADO DE FICHAS
// =======================================================

function obtenerFichasDelMenuSeleccionado() {
    if (menuExploradorSeleccionado === null) {
        return [...fichasExplorador];
    }

    return fichasExplorador.filter(
        ficha =>
            Number(ficha.id_menu) ===
            Number(menuExploradorSeleccionado)
    );
}

function obtenerFichasVisibles() {
    let fichas = obtenerFichasDelMenuSeleccionado();
    const termino = normalizarTexto(terminoBusquedaExplorador);

    if (termino) {
        fichas = fichas.filter(ficha =>
            fichaCoincideBusqueda(ficha, termino)
        );
    }

    // Mantener el orden y la plantilla propios del menú mientras se busca
    // o se borra el texto, en lugar de volver al estilo global.
    if (menuExploradorSeleccionado !== null) {
        const menu = menusExplorador.find(
            elemento =>
                Number(elemento.id_menu) ===
                Number(menuExploradorSeleccionado)
        );

        return ordenarFichasPorPlantilla(
            fichas,
            menu?.plantilla || null,
            menuExploradorSeleccionado
        );
    }

    return fichas;
}

function renderizarFichasVisibles() {
    const menu = menuExploradorSeleccionado === null
        ? null
        : menusExplorador.find(
            elemento =>
                Number(elemento.id_menu) ===
                Number(menuExploradorSeleccionado)
        );

    renderizarResultados(obtenerFichasVisibles(), {
        plantilla: menu?.plantilla || null
    });
}

function mostrarTodasLasFichas() {
    menuExploradorSeleccionado = null;
    etiquetaExploradorSeleccionada = null;
    terminoBusquedaExplorador = "";

    const buscador = document.getElementById("buscador");
    if (buscador) buscador.value = "";

    renderizarFichasVisibles();
}

function filtrarFichasExplorador(texto) {
    terminoBusquedaExplorador = String(texto ?? "");
    etiquetaExploradorSeleccionada = null;
    renderizarFichasVisibles();
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

function renderizarResultados(resultados, opciones = {}) {

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

    aplicarPlantillaAlContenedor(
        contenedor,
        opciones.plantilla || null
    );

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

    const ordenados = [...resultados];

    // Se arma todo fuera de pantalla y se reemplaza de una vez:
    // el contenedor nunca queda vacío entre repintadas.
    const fragmento =
        document.createDocumentFragment();

    ordenados.forEach((ficha, indice) => {

        const tarjeta =
            crearTarjetaDesdeFicha(ficha, indice);

        if (tarjeta) {
            fragmento.appendChild(tarjeta);
        }

    });

    contenedor.replaceChildren(fragmento);

}

// =======================================================
// CREAR TARJETA
// =======================================================

function crearTarjetaDesdeFicha(ficha, indice = Infinity) {

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

    // Textos curvos: solamente para fichas circulares
    if (
        document.querySelector(
            "#contenedorFichas.con-plantilla[data-forma-ficha='circular']"
        )
    ) {
        const textoSuperior = crearTextoCurvo(
            `EXP. Nº ${ficha.id_ficha}`,
            `expediente-${ficha.id_ficha}`,
            "superior"
        );

        tarjeta.appendChild(textoSuperior);
    }


    // Imagen
    const imagenContenedor =
        document.createElement("div");

    imagenContenedor.className =
        "imagenFicha";

    const imagen =
        document.createElement("img");

    imagen.src =
        obtenerImagenExplorador(ficha);

    console.log("Ficha:", ficha.id_ficha);
    console.log("Imagen:", imagen.src);

    imagen.alt =
        obtenerNombreFicha(ficha);

    imagen.loading =
        indice < FICHAS_PRIMERA_PANTALLA
            ? "eager"
            : "lazy";
    imagen.decoding = "async";

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
    const titulo = document.createElement("h3");

    titulo.className = "tituloCurvoFicha";
    titulo.textContent = obtenerNombreFicha(ficha);

    if (
        document.querySelector(
            "#contenedorFichas.con-plantilla[data-forma-ficha='circular']"
        )
    ) {
        const tituloCurvo = crearTextoCurvo(
            obtenerNombreFicha(ficha),
            `titulo-${ficha.id_ficha}`,
            "titulo"
        );

        tarjeta.appendChild(tituloCurvo);
    } else {
        informacion.appendChild(titulo);
    }

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
    // Texto curvo inferior: solamente para fichas circulares
    if (
        document.querySelector(
            "#contenedorFichas.con-plantilla[data-forma-ficha='circular']"
        )
    ) {
        const textoInferior = crearTextoCurvo(
            "CONSULTAR EXPEDIENTE",
            `consulta-${ficha.id_ficha}`,
            "inferior"
        );

        tarjeta.appendChild(textoInferior);
    }


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
    botonTodos.classList.toggle(
        "seleccionado",
        menuExploradorSeleccionado === null
    );
    botonTodos.setAttribute(
        "aria-pressed",
        String(menuExploradorSeleccionado === null)
    );

    botonTodos.textContent =
        "TODOS";

    botonTodos.addEventListener(
        "click",
        evento => {

            evento.stopPropagation();

            mostrarTodasLasFichas();
            renderizarIndice();
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
            boton.classList.toggle(
                "seleccionado",
                Number(menuExploradorSeleccionado) === Number(menu.id_menu)
            );
            boton.setAttribute(
                "aria-pressed",
                String(Number(menuExploradorSeleccionado) === Number(menu.id_menu))
            );
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


function ordenarFichasPorPlantilla(fichas, plantilla, idMenu) {
    const orden = plantilla?.interfaz?.ordenFichas || "titulo_asc";
    const resultado = [...fichas];

    const obtenerTitulo = ficha =>
        String(ficha?.titulo || ficha?.nombre || "").trim();

    const obtenerFecha = ficha => {
        const fecha = Date.parse(ficha?.creado || "");
        return Number.isFinite(fecha) ? fecha : 0;
    };

    switch (orden) {
        case "titulo_asc":
            return resultado.sort((a, b) =>
                obtenerTitulo(a).localeCompare(
                    obtenerTitulo(b), "es", { sensitivity: "base" }
                )
            );

        case "titulo_desc":
            return resultado.sort((a, b) =>
                obtenerTitulo(b).localeCompare(
                    obtenerTitulo(a), "es", { sensitivity: "base" }
                )
            );

        case "recientes":
            return resultado.sort((a, b) =>
                obtenerFecha(b) - obtenerFecha(a)
            );

        case "antiguas":
            return resultado.sort((a, b) =>
                obtenerFecha(a) - obtenerFecha(b)
            );

        case "aleatorio": {
            if (!ordenarFichasPorPlantilla.ordenesAleatorios) {
                ordenarFichasPorPlantilla.ordenesAleatorios = new Map();
            }

            const cache = ordenarFichasPorPlantilla.ordenesAleatorios;
            const clave = String(idMenu);
            const idsActuales = new Set(
                resultado.map(ficha => String(ficha.id_ficha))
            );

            let ordenGuardado = cache.get(clave);

            if (!ordenGuardado) {
                ordenGuardado = [...resultado];

                for (let i = ordenGuardado.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [ordenGuardado[i], ordenGuardado[j]] =
                        [ordenGuardado[j], ordenGuardado[i]];
                }
            } else {
                ordenGuardado = [
                    ...ordenGuardado.filter(ficha =>
                        idsActuales.has(String(ficha.id_ficha))
                    ),
                    ...resultado.filter(ficha =>
                        !ordenGuardado.some(guardada =>
                            String(guardada.id_ficha) ===
                            String(ficha.id_ficha)
                        )
                    )
                ];
            }

            cache.set(clave, ordenGuardado);
            return ordenGuardado;
        }

        default:
            return resultado.sort((a, b) =>
                obtenerTitulo(a).localeCompare(
                    obtenerTitulo(b), "es", { sensitivity: "base" }
                )
            );
    }
}


function mostrarFichasPorMenu(idMenu) {
    menuExploradorSeleccionado = idMenu;
    etiquetaExploradorSeleccionada = null;
    const buscador = document.getElementById("buscador");
    if (buscador) {
        terminoBusquedaExplorador = buscador.value;
    }

    console.log(
        "[explorador] Filtrando por menú:",
        idMenu
    );

    const menuSeleccionado = menusExplorador.find(
        menu => Number(menu.id_menu) === Number(idMenu)
    );

    const fichasFiltradas = fichasExplorador.filter(
        ficha => Number(ficha.id_menu) === Number(idMenu)
    );

    const plantilla = menuSeleccionado?.plantilla || null;

    console.log(
        "[explorador] Orden configurado:",
        plantilla?.interfaz?.ordenFichas || "titulo_asc"
    );

    const fichasOrdenadas = ordenarFichasPorPlantilla(
        fichasFiltradas,
        plantilla,
        idMenu
    );

    console.log("[PRUEBA] Orden recibido:", plantilla?.interfaz?.ordenFichas);

    console.table(fichasFiltradas.map(f => ({
        id: f.id_ficha,
        titulo: f.titulo,
        creadoOriginal: f.creado,
        fechaInterpretada: Date.parse(f.creado || ""),
        fechaValida: Number.isFinite(Date.parse(f.creado || ""))
    })));

    const termino = normalizarTexto(terminoBusquedaExplorador);
    const resultados = termino
        ? fichasOrdenadas.filter(ficha => fichaCoincideBusqueda(ficha, termino))
        : fichasOrdenadas;

    renderizarResultados(resultados, {
        plantilla: plantilla
    });
    renderizarIndice();

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

        etiquetaExploradorSeleccionada = idEtiqueta;
        terminoBusquedaExplorador = "";
        const buscador = document.getElementById("buscador");
        if (buscador) buscador.value = "";
        const permitidas = new Set(
            obtenerFichasDelMenuSeleccionado().map(ficha => String(ficha.id_ficha))
        );
        const resultados = fichasFiltradas.filter(ficha =>
            permitidas.has(String(ficha.id_ficha))
        );

        renderizarResultados(resultados);
        renderizarIndice();

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
    cargar: cargarFichasExplorador,
    obtener: () => [...fichasExplorador],
    buscar: filtrarFichasExplorador,
    cerrar: cerrarPaneles,
    obtenerFichasVisibles,
    obtenerEstado: () => ({
        menuId: menuExploradorSeleccionado,
        termino: terminoBusquedaExplorador,
        etiquetaId: etiquetaExploradorSeleccionada
    })
};


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

    // Curva superior: más elevada.
    // Curva inferior: más baja.
    const recorrido =
        posicion === "superior"
            ? "M 18 85 Q 150 45 282 85"
            : posicion === "inferior"
                ? "M 18 215 Q 150 255 282 215"
                : "M 35 125 Q 150 95 265 125";

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


function aplicarPlantillaAlContenedor(contenedor, plantilla) {
    const propiedades = [
        "--plantilla-color-principal",
        "--plantilla-color-secundario",
        "--plantilla-color-fondo",
        "--plantilla-color-texto",
        "--plantilla-fuente-titulo",
        "--plantilla-fuente-texto",
        "--plantilla-radio-borde",
        "--plantilla-separacion",
        "--plantilla-columnas"
    ];

    propiedades.forEach(propiedad => {
        contenedor.style.removeProperty(propiedad);
    });

    contenedor.classList.remove("con-plantilla");

    delete contenedor.dataset.formaFicha;
    delete contenedor.dataset.tamanoFicha;
    delete contenedor.dataset.vista;
    delete contenedor.dataset.mostrarImagen;
    delete contenedor.dataset.mostrarIndice;

    if (!plantilla) {
        return;
    }

    const interfaz = plantilla.interfaz || {};
    const apariencia = plantilla.apariencia || {};
    const elementos = plantilla.elementos || {};

    const colorValido = color =>
        /^#[0-9a-fA-F]{6}$/.test(color || "");

    const colores = {
        "--plantilla-color-principal": apariencia.colorPrincipal,
        "--plantilla-color-secundario": apariencia.colorSecundario,
        "--plantilla-color-fondo": apariencia.colorFondo,
        "--plantilla-color-texto": apariencia.colorTexto
    };

    Object.entries(colores).forEach(([propiedad, color]) => {
        if (colorValido(color)) {
            contenedor.style.setProperty(propiedad, color);
        }
    });

    const fuentesPermitidas = [
        "Arial",
        "Verdana",
        "Georgia",
        "Tahoma",
        "Courier New",
        "Times New Roman"
    ];

    if (fuentesPermitidas.includes(apariencia.fuenteTitulo)) {
        contenedor.style.setProperty(
            "--plantilla-fuente-titulo",
            `"${apariencia.fuenteTitulo}"`
        );
    }

    if (fuentesPermitidas.includes(apariencia.fuenteTexto)) {
        contenedor.style.setProperty(
            "--plantilla-fuente-texto",
            `"${apariencia.fuenteTexto}"`
        );
    }

    const columnas = Number(interfaz.columnas);
    const separacion = Number(interfaz.separacion);
    const radio = Number(apariencia.radioBorde);

    contenedor.dataset.columnasFicha = String(
        Math.min(6, Math.max(1, Number.isFinite(columnas) ? columnas : 4))
    );

    contenedor.style.setProperty(
        "--plantilla-columnas",
        Math.min(6, Math.max(1, Number.isFinite(columnas) ? columnas : 4))
    );

    contenedor.style.setProperty(
        "--plantilla-separacion",
        `${Math.min(60, Math.max(0, Number.isFinite(separacion) ? separacion : 20))}px`
    );

    contenedor.style.setProperty(
        "--plantilla-radio-borde",
        `${Math.min(50, Math.max(0, Number.isFinite(radio) ? radio : 8))}px`
    );

    contenedor.dataset.formaFicha = interfaz.formaFicha || "rectangular";
    contenedor.dataset.tamanoFicha = interfaz.tamanoFicha || "mediano";
    contenedor.dataset.vista = interfaz.vista || "grid";
    contenedor.dataset.mostrarImagen = "true";
    contenedor.dataset.mostrarIndice ="true";

    contenedor.classList.add("con-plantilla");
}

// =======================================================
// DEBUG
// =======================================================

console.log(
    "[explorador] explorador.js cargado correctamente."
);