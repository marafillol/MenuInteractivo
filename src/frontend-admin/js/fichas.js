console.log("Modulo fichas cargado");

/* =========================================================
   NOTA SOBRE LA CARGA DEL SCRIPT
   panel.js puede cargar este archivo más de una vez, por eso:
   - el estado usa "var" (no "let"/"const") y
   - los helpers son "function" con prefijo "fc"
   así no hay errores de "Identifier already declared".
========================================================= */


/* =========================================================
   CACHÉ Y HELPERS DE RED
========================================================= */

var FC_TTL = 60000; // 1 minuto

// La caché sobrevive aunque el script se vuelva a cargar.
var fcCache = window.__fcCache || (window.__fcCache = new Map());

// Guarda la PROMESA: dos llamadas simultáneas comparten un solo fetch.
function fcCargar(clave, cargador, ttl) {
    ttl = ttl || FC_TTL;

    var item = fcCache.get(clave);

    if (item && Date.now() - item.hora < ttl) {
        return item.promesa;
    }

    var promesa = cargador().catch(function (error) {
        fcCache.delete(clave);
        throw error;
    });

    fcCache.set(clave, { promesa: promesa, hora: Date.now() });

    return promesa;
}

function fcInvalidar(prefijo) {
    prefijo = prefijo || "";

    Array.from(fcCache.keys()).forEach(function (clave) {
        if (clave.startsWith(prefijo)) {
            fcCache.delete(clave);
        }
    });
}

async function fcJson(url) {
    var respuesta = await window.fetchProtegido(url);

    if (!respuesta.ok) {
        throw new Error("HTTP " + respuesta.status + " en " + url);
    }

    return respuesta.json();
}

function fcMenus() {
    return fcCargar("menus", function () {
        return fcJson("/api/menus");
    });
}

function fcEtiquetas() {
    return fcCargar("etiquetas", function () {
        return fcJson("/api/etiquetas");
    });
}

// Lista de fichas: TTL corto porque cambia más seguido.
function fcFichas() {
    return fcCargar("fichas", function () {
        return fcJson("/api/fichas");
    }, 15000);
}

function fcPlantilla(idMenu) {
    return fcCargar("plantilla:" + idMenu, function () {
        return fcJson("/api/plantillas/menu/" + idMenu);
    });
}

// id_ficha -> ficha (título, imagen, visible).
// Reemplaza N fetches individuales por una sola lista cacheada.
async function fcMapaFichas() {
    var fichas = await fcFichas();

    return new Map(
        fichas.map(function (f) {
            return [String(f.id_ficha), f];
        })
    );
}

function fcEscapar(valor) {
    return String(valor == null ? "" : valor).replace(
        /[&<>"']/g,
        function (c) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[c];
        }
    );
}

function fcSeguro(promesa) {
    return promesa.catch(function (error) {
        console.error(error);
        return null;
    });
}


/* =========================================================
   FECHAS E IMÁGENES
========================================================= */

function obtenerFechaFicha(ficha) {
    const creado = ficha.creado;
    const actualizado = ficha.actualizado;

    if (!actualizado) {
        return {
            etiqueta: "Creada",
            fecha: formatearFechaFicha(creado)
        };
    }

    const fechaCreacion = new Date(creado).getTime();
    const fechaActualizacion = new Date(actualizado).getTime();

    if (
        Number.isFinite(fechaCreacion) &&
        fechaCreacion === fechaActualizacion
    ) {
        return {
            etiqueta: "Creada",
            fecha: formatearFechaFicha(creado)
        };
    }

    return {
        etiqueta: "Última modificación",
        fecha: formatearFechaFicha(actualizado)
    };
}

function formatearFechaFicha(fecha) {
    if (!fecha) {
        return "-";
    }

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "America/Argentina/Buenos_Aires"
    }).format(valor);
}

function mostrarFechaArgentina(fecha) {
    if (
        fecha === null ||
        fecha === undefined ||
        fecha === "" ||
        fecha === "undefined" ||
        fecha === "null"
    ) {
        return "-";
    }

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return "-";
    }

    const fechaFormateada = valor.toLocaleDateString("es-AR");

    const horaFormateada = valor.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });

    return `${fechaFormateada} — ${horaFormateada}`;
}

function obtenerRutaImagenFicha(ruta) {
    if (!ruta) {
        return "/imagenes/default.png";
    }

    if (/^(https?:|data:)/i.test(ruta)) {
        return ruta;
    }

    const rutaLimpia = ruta.replace("public/", "");

    return rutaLimpia.startsWith("/") ? rutaLimpia : `/${rutaLimpia}`;
}


/* =========================================================
   ESTADO
========================================================= */

var fichaEliminar = null;
var fichaEditando = null;
// Menú recordado para crear otra ficha mientras
// permanezcamos en la misma ventana de Fichas.
if (window.__menuCreacionFicha === undefined) {
    window.__menuCreacionFicha = null;
}

// Relaciones que quedarán guardadas al actualizar.
var relacionesPendientes = [];

// Relaciones existentes que el usuario quitó con la X.
// Se eliminan realmente de la BD recién al guardar.
var relacionesEliminadasPendientes = [];


/* =========================================================
   CABECERA DE FICHAS
========================================================= */

function actualizarCabeceraFichas() {
    const titulo = document.getElementById("tituloFichas");
    const subtitulo = document.getElementById("subtituloFichas");
    const volver = document.getElementById("barraVolver");

    if (!titulo || !subtitulo) {
        return;
    }

    if (menuSeleccionado && nombreMenuSeleccionado) {
        titulo.textContent = "Fichas del menú";

        subtitulo.innerHTML =
            `<strong>${fcEscapar(nombreMenuSeleccionado)}</strong>`;

        subtitulo.style.display = "block";

        if (volver) {
            volver.style.display = "inline-flex";
        }
    } else {
        titulo.textContent = "Gestión de Fichas";
        subtitulo.innerHTML = "";
        subtitulo.style.display = "none";

        if (volver) {
            volver.style.display = "none";
        }
    }
}

/* =========================================================
   FILTRO DE FICHAS POR MENÚ
========================================================= */

/* =========================================================
   FILTRO BUSCABLE DE FICHAS POR MENÚ
========================================================= */

async function inicializarFiltroMenuFichas() {
    const contenedor = document.getElementById(
        "filtroMenuFichasContenedor"
    );
    const boton = document.getElementById("btnFiltroMenuFichas");
    const textoBoton = document.getElementById("textoFiltroMenuFichas");
    const flecha = boton?.querySelector(".flecha-selector-fichas");
    const panel = document.getElementById("panelFiltroMenuFichas");
    const opciones = document.getElementById("opcionesMenuFichas");
    const buscar = document.getElementById("buscarMenuFichas");

    if (
        !contenedor ||
        !boton ||
        !textoBoton ||
        !panel ||
        !opciones ||
        !buscar
    ) {
        return;
    }

    // Dentro de un menú específico, el filtro general no se muestra.
    if (menuSeleccionado) {
        contenedor.style.display = "none";
        return;
    }

    contenedor.style.display = "block";

    // No volver a cargar menús, fichas ni registrar eventos
    // si el filtro ya fue inicializado en este mismo elemento.
    if (contenedor.dataset.inicializado === "true") {
        return;
    }

    try {
        const [menus, fichas] = await Promise.all([
            fcMenus(),
            fcFichas()
        ]);

        const idsMenusConFichas = new Set(
            fichas
                .filter(ficha => ficha.id_menu != null)
                .map(ficha => String(ficha.id_menu))
        );

        const menusConFichas = menus.filter(menu =>
            idsMenusConFichas.has(String(menu.id_menu))
        );

        // Guardar las opciones para la búsqueda y el teclado.
        window.__menusFiltroFichas = menusConFichas;

        let filtroActual = window.__filtroMenuFichas || "";

        // Si el menú seleccionado ya no está disponible, limpiar el filtro.
        if (
            filtroActual &&
            !menusConFichas.some(
                menu => String(menu.id_menu) === String(filtroActual)
            )
        ) {
            filtroActual = "";
            window.__filtroMenuFichas = "";
        }

        const menuActual = menusConFichas.find(
            menu => String(menu.id_menu) === String(filtroActual)
        );

        textoBoton.textContent = menuActual
            ? `Menú: ${menuActual.nombre}`
            : "Menú: Todos";

        function cerrarPanel(devolverFoco) {
            panel.style.display = "none";
            boton.setAttribute("aria-expanded", "false");

            if (flecha) {
                flecha.style.transform = "rotate(0deg)";
            }

            window.__indiceOpcionMenuFichas = -1;

            if (devolverFoco) {
                boton.focus();
            }
        }

        function abrirPanel() {
            panel.style.display = "block";
            boton.setAttribute("aria-expanded", "true");

            if (flecha) {
                flecha.style.transform = "rotate(180deg)";
            }

            buscar.value = "";
            window.__indiceOpcionMenuFichas = -1;

            renderizarOpcionesMenuFichas();

            buscar.focus();
        }

        window.__cerrarFiltroMenuFichas = cerrarPanel;

        function crearOpcion(texto, valor) {
            const opcion = document.createElement("button");

            opcion.type = "button";
            opcion.textContent = texto;
            opcion.dataset.valor = String(valor);
            opcion.setAttribute("role", "option");
            opcion.setAttribute(
                "aria-selected",
                String(String(valor) === String(
                    window.__filtroMenuFichas || ""
                ))
            );

            opcion.style.cssText = `
                display: block;
                width: 100%;
                padding: 9px 10px;
                border: none;
                border-radius: 4px;
                background: ${
                    String(valor) === String(
                        window.__filtroMenuFichas || ""
                    )
                        ? "#eee6d2"
                        : "transparent"
                };
                color: #222;
                text-align: left;
                cursor: pointer;
            `;

            opcion.addEventListener("mouseenter", () => {
                const lista = obtenerOpcionesVisibles();
                const indice = lista.indexOf(opcion);

                if (indice !== -1) {
                    resaltarOpcion(indice);
                }
            });


            opcion.addEventListener("click", () => {

                // Quitar el aviso y restaurar las fichas de la búsqueda global.
                if (typeof window.limpiarFiltroBuscadorGlobal === "function") {
                    window.limpiarFiltroBuscadorGlobal();
                }

                window.__filtroMenuFichas = valor;

                textoBoton.textContent = valor
                    ? `Menú: ${texto}`
                    : "Menú: Todos";

                cerrarPanel(false);

                cargarFichas();
            });


            opciones.appendChild(opcion);
        }

        window.__renderizarOpcionesMenuFichas = function () {
            renderizarOpcionesMenuFichas();
        };


        function renderizarOpcionesMenuFichas() {
            const busqueda = buscar.value.trim().toLocaleLowerCase("es");

            opciones.innerHTML = "";
            window.__indiceOpcionMenuFichas = -1;

            const menusFiltrados = menusConFichas.filter(menu =>
                String(menu.nombre || "")
                    .toLocaleLowerCase("es")
                    .includes(busqueda)
            );

            if (
                !busqueda ||
                "Menú: Todos".includes(busqueda) ||
                "Menú: Todos".includes(busqueda)
            ) {
                crearOpcion("Menú: Todos", "");
            }

            menusFiltrados.forEach(menu => {
                crearOpcion(menu.nombre, String(menu.id_menu));
            });

            if (opciones.children.length === 0) {
                const mensaje = document.createElement("div");
                mensaje.textContent = "No se encontraron menús.";
                mensaje.style.cssText = `
                    padding: 10px;
                    color: #666;
                    font-size: 13px;
                `;
                opciones.appendChild(mensaje);
                return;
            }

            Array.from(opciones.querySelectorAll("button")).forEach(
                (opcion, indice) => {
                    opcion.dataset.indice = String(indice);
                }
            );
        }


        function obtenerOpcionesVisibles() {
            return Array.from(
                opciones.querySelectorAll("button")
            );
        }


        function resaltarOpcion(indice) {
            const lista = obtenerOpcionesVisibles();

            if (lista.length === 0) {
                window.__indiceOpcionMenuFichas = -1;
                return;
            }

            indice = Math.max(0, Math.min(indice, lista.length - 1));
            window.__indiceOpcionMenuFichas = indice;

            lista.forEach((opcion, i) => {
                const seleccionada =
                    opcion.getAttribute("aria-selected") === "true";

                opcion.style.outline =
                    i === indice ? "2px solid #c7a85b" : "none";

                opcion.style.background =
                    i === indice || seleccionada
                        ? "#eee6d2"
                        : "transparent";
            });

            lista[indice].scrollIntoView({
                block: "nearest",
                behavior: "auto"
            });
        }


        function manejarTeclado(event) {
            const lista = obtenerOpcionesVisibles();
            const indice = window.__indiceOpcionMenuFichas ?? -1;

            if (event.key === "ArrowDown") {
                event.preventDefault();

                if (lista.length > 0) {
                    resaltarOpcion(
                        indice < 0 ? 0 : (indice + 1) % lista.length
                    );
                }

                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();

                if (lista.length > 0) {
                    resaltarOpcion(
                        indice < 0
                            ? lista.length - 1
                            : (indice - 1 + lista.length) % lista.length
                    );
                }

                return;
            }

            if (event.key === "Enter") {
                event.preventDefault();

                if (indice >= 0 && lista[indice]) {
                    lista[indice].click();
                } else if (lista.length === 1) {
                    lista[0].click();
                }

                return;
            }

            if (event.key === "Escape") {
                event.preventDefault();
                cerrarPanel(true);
            }
        }

        // Registrar los eventos una sola vez.
        if (boton.dataset.eventoRegistrado !== "true") {
            boton.addEventListener("click", event => {
                event.stopPropagation();

                if (panel.style.display === "block") {
                    cerrarPanel(false);
                } else {
                    abrirPanel();
                }
            });

            boton.dataset.eventoRegistrado = "true";
        }

        if (buscar.dataset.eventosRegistrados !== "true") {
            buscar.addEventListener("input", () => {
                window.__indiceOpcionMenuFichas = -1;
                renderizarOpcionesMenuFichas();
            });

            buscar.addEventListener("keydown", manejarTeclado);



            buscar.dataset.eventosRegistrados = "true";
        }

        if (document.body.dataset.cerrarFiltroMenuRegistrado !== "true") {
            document.addEventListener("click", event => {
                const contenedorActual = document.getElementById(
                    "filtroMenuFichasContenedor"
                );

                if (
                    contenedorActual &&
                    !contenedorActual.contains(event.target)
                ) {
                    const panelActual = document.getElementById(
                        "panelFiltroMenuFichas"
                    );

                    const botonActual = document.getElementById(
                        "btnFiltroMenuFichas"
                    );

                    const flechaActual = botonActual?.querySelector(
                        ".flecha-selector-fichas"
                    );

                    if (panelActual) {
                        panelActual.style.display = "none";
                    }

                    if (botonActual) {
                        botonActual.setAttribute("aria-expanded", "false");
                    }

                    if (flechaActual) {
                        flechaActual.style.transform = "rotate(0deg)";
                    }

                    window.__indiceOpcionMenuFichas = -1;
                }
            });

            document.body.dataset.cerrarFiltroMenuRegistrado = "true";
        }

        renderizarOpcionesMenuFichas();

        contenedor.dataset.inicializado = "true";

    } catch (error) {
        console.error(
            "Error cargando menús para filtrar fichas:",
            error
        );
    }
}


/* =========================================================
   CARGAR FICHAS
========================================================= */

async function cargarFichas() {

    const idCargaFichas = window.__idCargaVentana;

    actualizarCabeceraFichas();

    try {
        await inicializarFiltroMenuFichas();

        // Si el usuario cambió de ventana durante la espera,
        // no continuar con la carga anterior.
        if (idCargaFichas !== window.__idCargaVentana) {
            return;
        }

        const botonNuevaFicha = document.getElementById("nuevaFicha");
        const barraVolver = document.getElementById("barraVolver");

        let url = "/api/fichas";

        if (menuSeleccionado) {
            // Navegación existente: fichas de un menú específico.
            url = `/api/fichas/menu/${menuSeleccionado}`;

            if (barraVolver) {
                barraVolver.style.display = "inline-flex";
            }

        } else {
            // Gestión general: permitir filtrar sin cambiar
            // el menú usado para crear o editar fichas.
            const filtroMenu = window.__filtroMenuFichas || "";

            if (filtroMenu) {
                url = `/api/fichas/menu/${filtroMenu}`;
            }

            if (barraVolver) {
                barraVolver.style.display = "none";
            }
        }

        if (botonNuevaFicha) {
            botonNuevaFicha.style.display = "inline-flex";
        }

        const respuesta = await window.fetchProtegido(url);

        if (idCargaFichas !== window.__idCargaVentana) {
            return;
        }

        if (!respuesta.ok) {
            console.error("Error obteniendo fichas:", respuesta.status);
            return;
        }

        const fichas = await respuesta.json();

        if (idCargaFichas !== window.__idCargaVentana) {
            return;
        }

        // Si es la lista completa, aprovecharla como caché
        // (la usan el select y las mini-fichas de relaciones).
        if (url === "/api/fichas") {
            fcCache.set("fichas", {
                promesa: Promise.resolve(fichas),
                hora: Date.now()
            });
        }

        const esConsulta = window.usuarioActual?.rol === "consulta";

        const contenedor = document.getElementById("listaFichas");

        if (!contenedor) {
            console.error("No existe listaFichas");
            return;
        }

        if (fichas.length === 0) {
            contenedor.innerHTML = menuSeleccionado
                ? `
                    <div class="mensaje-sin-fichas">
                        <p>Este menú todavía no tiene fichas asociadas.</p>
                    </div>
                  `
                : `
                    <div class="mensaje-sin-fichas">
                        <p>No hay fichas para mostrar.</p>
                    </div>
                  `;

            return;
        }

        contenedor.innerHTML = fichas.map(ficha => {

            const fechaFicha = obtenerFechaFicha(ficha);

            const textoMenu = ficha.menu
                ? `${ficha.menu} - #${ficha.id_menu}`
                : (ficha.id_menu
                    ? `Menú #${ficha.id_menu}`
                    : "Sin asignar");

            return `
                <article class="ficha-tarjeta ${
                    ficha.visible == 0 ? "ficha-desactivada" : ""
                }">

                    <div class="ficha-imagen">
                        <img
                            src="${obtenerRutaImagenFicha(ficha.imagen)}"
                            loading="lazy"
                            decoding="async"
                            onerror="this.onerror=null;this.src='/img/no-image.png'"
                        />
                    </div>

                    <div class="ficha-info">

                        <span class="campo-titulo-ficha">TÍTULO</span>

                        <h3>${fcEscapar(ficha.titulo || "Sin título")}</h3>

                        <p>
                            ${fcEscapar(
                                (ficha.resumen || "Sin descripción")
                                    .replace(/\n/g, " ")
                            )}
                        </p>

                        <div class="datos-menu">

                            <small>
                                <i data-lucide="layers" aria-hidden="true"></i>
                                Menú: ${fcEscapar(textoMenu)}
                            </small>

                            <small>
                                <i data-lucide="calendar" aria-hidden="true"></i>
                                ${fechaFicha.etiqueta}: ${fechaFicha.fecha}
                            </small>

                        </div>

                        <div class="ficha-acciones">

                            <button
                                class="ficha-btn-vista"
                                onclick="vistaPreviaFicha(${ficha.id_ficha})"
                            >
                                Vista previa
                            </button>

                            <button
                                class="ficha-btn-ver"
                                onclick="verMultimediaFicha(${ficha.id_ficha})"
                            >
                                Ver multimedia
                            </button>

                            ${
                                !esConsulta
                                    ? `
                                    <button
                                        class="ficha-btn-editar"
                                        onclick="editarFicha(${ficha.id_ficha})"
                                    >
                                        Editar
                                    </button>

                                    <button
                                        class="ficha-btn-eliminar"
                                        onclick="abrirEliminarFicha(${ficha.id_ficha})"
                                    >
                                        Eliminar
                                    </button>
                                    `
                                    : ""
                            }

                        </div>

                    </div>

                </article>
            `;
        }).join("");

        if (window.lucide) {
            window.lucide.createIcons();
        }

    } catch (error) {
        console.error("Error cargando fichas:", error);
    }
}


/* =========================================================
   VISTA PREVIA FICHA
   - Todo se pide en paralelo.
   - El modal se abre apenas llega la ficha.
   - Sin fetch por cada ficha relacionada.
========================================================= */

async function vistaPreviaFicha(id_ficha) {

    const token = (window.cargaVistaFicha || 0) + 1;
    window.cargaVistaFicha = token;

    const setTexto = (id, valor) => {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    };

    try {

        // Estas peticiones solo necesitan id_ficha: arrancan YA.
        const promesaEtiquetas =
            fcSeguro(fcJson(`/api/fichas/${id_ficha}/etiquetas`));

        const promesaRelaciones =
            fcSeguro(fcJson(`/api/relacion-ficha/${id_ficha}`));

        const promesaMenus = fcSeguro(fcMenus());
        const promesaMapa = fcSeguro(fcMapaFichas());

        const ficha = await fcJson(`/api/fichas/${id_ficha}`);

        // La plantilla necesita id_menu.
        const promesaPlantilla = fcSeguro(fcPlantilla(ficha.id_menu));

        // ---- Datos básicos ----
        setTexto("vpFichaId", ficha.id_ficha);
        setTexto("vpFichaMenu", `Menú #${ficha.id_menu}`);
        setTexto("vpFichaTitulo", ficha.titulo);
        setTexto("vpFichaResumen", ficha.resumen || "-");
        setTexto("vpFichaTexto", ficha.texto || "-");
        setTexto("vpFichaVisible", ficha.visible == 1 ? "Sí" : "No");
        setTexto("vpFichaUsuario", ficha.id_usuario || "-");
        setTexto("vpFichaCreado", mostrarFechaArgentina(ficha.creado));
        setTexto(
            "vpFichaActualizado",
            mostrarFechaArgentina(ficha.actualizado)
        );

        const imagen = document.getElementById("vpFichaImagen");

        if (imagen) {
            imagen.src = obtenerRutaImagenFicha(ficha.imagen);
        }

        const contenedor =
            document.getElementById("vpCamposDinamicos");
        const contenedorEtiquetas =
            document.getElementById("vistaEtiquetasFicha");
        const contenedorRelaciones =
            document.getElementById("vistaRelacionesFicha");

        if (contenedor) contenedor.innerHTML = "<p>Cargando...</p>";
        if (contenedorEtiquetas) contenedorEtiquetas.innerHTML = "";
        if (contenedorRelaciones) contenedorRelaciones.innerHTML = "";

        // Abrir el modal ya: el resto se completa después.
        document.getElementById("modalVistaFicha").style.display = "flex";

        const [menus, plantilla, etiquetas, relaciones, mapa] =
            await Promise.all([
                promesaMenus,
                promesaPlantilla,
                promesaEtiquetas,
                promesaRelaciones,
                promesaMapa
            ]);

        // Si se abrió otra vista previa mientras tanto, abortar.
        if (token !== window.cargaVistaFicha) return;

        // Nombre del menú
        const menu = Array.isArray(menus)
            ? menus.find(m => String(m.id_menu) === String(ficha.id_menu))
            : null;

        if (menu?.nombre) {
            setTexto("vpFichaMenu", `#${ficha.id_menu} — ${menu.nombre}`);
        }

        // Campos dinámicos
        if (contenedor) {
            if (plantilla) {
                let datos = {};

                try {
                    datos = ficha.datos_json
                        ? window.interpretarDatosJson(ficha.datos_json)
                        : {};
                } catch (error) {
                    console.warn("Error leyendo datos_json:", error);
                }

                const campos =
                    plantilla.plantilla_json?.estructura?.campos || [];

                contenedor.innerHTML = campos.map(campo => `
                    <div class="campo-preview">
                        <span class="titulo-preview">
                            ${fcEscapar(campo.etiqueta)}
                        </span>
                        <span class="valor-preview">
                            ${fcEscapar(datos[campo.nombre] || "-")}
                        </span>
                    </div>
                `).join("");
            } else {
                contenedor.innerHTML =
                    "<p>No fue posible cargar la plantilla.</p>";
            }
        }

        // Etiquetas
        if (contenedorEtiquetas) {
            if (!etiquetas) {
                contenedorEtiquetas.innerHTML =
                    "<span class='sin-etiquetas'>No fue posible cargar las etiquetas.</span>";
            } else if (!Array.isArray(etiquetas) || etiquetas.length === 0) {
                contenedorEtiquetas.innerHTML =
                    "<span class='sin-etiquetas'>Sin etiquetas</span>";
            } else {
                contenedorEtiquetas.innerHTML = etiquetas.map(etiqueta => `
                    <span class="etiqueta-vista ${
                        etiquetaEstaActiva(etiqueta)
                            ? ""
                            : "etiqueta-vista-desactivada"
                    }">
                        ${fcEscapar(etiqueta.nombre)}
                    </span>
                `).join("");
            }
        }

        // Fichas relacionadas (datos desde el mapa cacheado)
        if (contenedorRelaciones && relaciones) {
            if (!Array.isArray(relaciones) || relaciones.length === 0) {
                contenedorRelaciones.innerHTML =
                    "<span class='sin-relaciones'>Sin fichas relacionadas</span>";
            } else {
                contenedorRelaciones.innerHTML = relaciones.map(relacion => {

                    const f = mapa?.get(String(relacion.id_ficha_destino));

                    const titulo =
                        f?.titulo ||
                        relacion.titulo ||
                        relacion.ficha_relacionada ||
                        "Sin título";

                    const visible = f ? f.visible : 1;

                    return `
                        <article class="relacion-vista ${
                            visible == 0 ? "relacion-vista-desactivada" : ""
                        }">
                            <div class="relacion-vista-imagen">
                                <img
                                    src="${obtenerRutaImagenFicha(f?.imagen)}"
                                    alt="${fcEscapar(titulo)}"
                                    loading="lazy"
                                    onerror="this.onerror=null;this.src='/imagenes/default.png';"
                                >
                            </div>

                            <div class="relacion-vista-contenido">
                                <span class="relacion-vista-id">
                                    FICHA #${relacion.id_ficha_destino}
                                </span>

                                <strong>${fcEscapar(titulo)}</strong>

                                <span class="relacion-vista-tipo">
                                    ${fcEscapar(
                                        relacion.tipo_relacion ||
                                        "Sin relación"
                                    )}
                                </span>
                            </div>
                        </article>
                    `;
                }).join("");
            }
        }

    } catch (error) {
        console.error("Error vista previa:", error);
    }
}


/* =========================================================
   APLICAR EL MENÚ ELEGIDO AL FORMULARIO
========================================================= */

function aplicarMenuEnFormulario(idMenu) {

    const tipoFicha = document.getElementById("tipoFicha");

    if (!tipoFicha) return;

    tipoFicha.value = String(idMenu);

    if (tipoFicha.value !== String(idMenu)) {
        console.warn(
            "El menú de la ficha no aparece en el selector:",
            idMenu
        );
    }

    const opcion = tipoFicha.options[tipoFicha.selectedIndex];

    const nombre =
        opcion && tipoFicha.value
            ? opcion.textContent.trim()
            : (nombreMenuSeleccionado || `Menú ${idMenu}`);

    const nombreTipo = document.getElementById("nombreTipoFicha");

    if (nombreTipo) {
        nombreTipo.textContent = nombre;
    }

    const tituloDatos = document.getElementById("tituloDatosEspecificos");

    if (tituloDatos) {
        tituloDatos.textContent = `Datos específicos de ${nombre}`;
    }
}


/* =========================================================
   EDITAR FICHA
   Todo arranca en paralelo y se espera una sola vez.
========================================================= */

async function editarFicha(id_ficha) {

    const cargaActual = (window.cargaEditarFicha || 0) + 1;
    window.cargaEditarFicha = cargaActual;

    const obsoleta = () => cargaActual !== window.cargaEditarFicha;

    const modal = document.getElementById("modalFicha");

    if (!modal) {
        console.error("No existe modalFicha.");
        return;
    }

    // ---- Reset del formulario ----
    modal.style.display = "none";
    modal.dataset.idFicha = "";
    modal.dataset.idMenu = "";

    document.getElementById("tituloFicha").value = "";
    document.getElementById("resumenFicha").value = "";
    document.getElementById("textoFicha").value = "";
    document.getElementById("visibleFicha").checked = false;
    document.getElementById("imagenFicha").value = "";

    const imagenActual = document.getElementById("imagenActualFicha");
    const contenedorImagenActual =
        document.getElementById("contenedorImagenActual");

    if (imagenActual) {
        imagenActual.src = "";
        imagenActual.style.display = "none";
    }

    if (contenedorImagenActual) {
        contenedorImagenActual.style.display = "none";
    }

    relacionesPendientes = [];
    relacionesEliminadasPendientes = [];

    const botonGuardar = document.getElementById("btnGuardarFicha");

    if (botonGuardar) {
        botonGuardar.textContent = "Cargando ficha...";
    }

    try {
        fichaEditando = id_ficha;

        // ---- TODO EN PARALELO ----
        const promesaFicha = fcJson(`/api/fichas/${id_ficha}`);

        // La plantilla depende de id_menu: arranca apenas llega la ficha.
        const promesaPlantilla = promesaFicha
            .then(f => fcPlantilla(f.id_menu))
            .catch(() => null);

        const promesaMenus = cargarTiposFicha();

        const promesaEtiquetasFicha =
            fcSeguro(obtenerEtiquetasFicha(id_ficha));

        const promesaRelaciones =
            fcSeguro(fcJson(`/api/relacion-ficha/${id_ficha}`));

        // Precalentar cachés que usan los renders de más abajo.
        fcSeguro(fcEtiquetas());
        fcSeguro(fcFichas());

        const [
            ficha,
            ,
            etiquetasSeleccionadas,
            relaciones,
            plantilla
        ] = await Promise.all([
            promesaFicha,
            promesaMenus,
            promesaEtiquetasFicha,
            promesaRelaciones,
            promesaPlantilla
        ]);

        if (obsoleta()) return;

        modal.dataset.idFicha = String(id_ficha);
        modal.dataset.idMenu = String(ficha.id_menu);

        // Borrador de esta ficha (tiene prioridad sobre la BD).
        const borrador = window.Borradores?.leer(
            "fichas",
            String(id_ficha)
        )?.datos;

        // ---- Menú ----
        aplicarMenuEnFormulario(ficha.id_menu);

        // ---- Datos básicos ----
        document.getElementById("tituloFicha").value =
            borrador?.titulo ?? ficha.titulo ?? "";

        document.getElementById("resumenFicha").value =
            borrador?.resumen ?? ficha.resumen ?? "";

        document.getElementById("textoFicha").value =
            borrador?.texto ?? ficha.texto ?? "";

        document.getElementById("visibleFicha").checked =
            borrador?.visible ?? (ficha.visible == 1);

        // ---- Imagen ----
        if (ficha.imagen && imagenActual) {
            imagenActual.src = obtenerRutaImagenFicha(ficha.imagen);
            imagenActual.style.display = "block";

            if (contenedorImagenActual) {
                contenedorImagenActual.style.display = "block";
            }
        }

        const labelImagen = document.getElementById("labelImagenFicha");

        if (labelImagen) {
            labelImagen.textContent = "Cambiar imagen";
        }

        const tituloModal = document.getElementById("tituloModalFicha");

        if (tituloModal) {
            tituloModal.textContent = "Editar ficha";
        }

        // ---- Etiquetas y fichas disponibles (desde caché) ----
        const selectRelacion = document.getElementById("fichaRelacion");
        const tipoRelacion = document.getElementById("tipoRelacion");

        await Promise.all([
            cargarEtiquetasFicha(etiquetasSeleccionadas || []),
            selectRelacion
                ? cargarFichasDisponibles(id_ficha)
                : Promise.resolve()
        ]);

        if (obsoleta()) return;

        if (selectRelacion) selectRelacion.disabled = false;
        if (tipoRelacion) tipoRelacion.disabled = false;

        // ---- Relaciones existentes ----
        const vistos = new Set();

        (relaciones || []).forEach(relacion => {
            const idDestino = Number(relacion.id_ficha_destino);

            if (!idDestino || vistos.has(idDestino)) return;

            vistos.add(idDestino);

            relacionesPendientes.push({
                id_relacion: relacion.id_relacion,
                id_ficha_destino: idDestino,
                tipo_relacion: relacion.tipo_relacion,
                titulo:
                    relacion.titulo ||
                    relacion.ficha_relacionada ||
                    `Ficha ${idDestino}`
            });
        });

        await mostrarRelacionesPendientes();

        if (obsoleta()) return;

        // ---- Plantilla y campos dinámicos ----
        window.plantillaActual = plantilla;

        generarCampos(plantilla?.plantilla_json?.estructura?.campos || []);

        let datos = {};

        try {
            datos = ficha.datos_json
                ? window.interpretarDatosJson(ficha.datos_json)
                : {};
        } catch (error) {
            console.warn("Error leyendo datos_json:", error);
        }

        // BD primero, borrador por encima.
        const valores = {
            ...datos,
            ...(borrador?.camposDinamicos || {})
        };

        document.querySelectorAll(".campo-dinamico").forEach(input => {
            const nombre = input.dataset.campo;

            if (nombre && valores[nombre] !== undefined) {
                input.value = valores[nombre];
            }
        });

        // ---- Mostrar ----
        if (botonGuardar) {
            botonGuardar.textContent = "Actualizar ficha";
        }

        modal.style.display = "flex";

    } catch (error) {
        if (obsoleta()) return;

        console.error("Error cargando ficha para editar:", error);

        if (botonGuardar) {
            botonGuardar.textContent = "Editar ficha";
        }
    }
}


/* =========================================================
   CERRAR VISTA FICHA
========================================================= */

function cerrarVistaFicha() {
    document.getElementById("modalVistaFicha").style.display = "none";
}


/* =========================================================
   MULTIMEDIA
========================================================= */

function verMultimediaFicha(id_ficha, titulo) {

    console.log("VER MULTIMEDIA FICHA:", { id_ficha, titulo });

    fichaSeleccionada = id_ficha;
    nombreFichaSeleccionada = titulo || "";

    cargarVentana("multimedia", true);
}

function cerrarMultimedia() {
    document.getElementById("modalMultimedia").style.display = "none";
}


/* =========================================================
   BORRADORES
========================================================= */

function obtenerClaveBorradorFicha() {
    const modal = document.getElementById("modalFicha");

    if (!modal) return null;

    const idFicha = modal.dataset.idFicha;
    const idMenu = modal.dataset.idMenu;

    if (idFicha) {
        return String(idFicha);
    }

    if (idMenu) {
        return `nuevo-menu-${idMenu}`;
    }

    return null;
}

function obtenerDatosBorradorFicha() {
    const obtenerValor = (id) =>
        document.getElementById(id)?.value ?? "";

    const camposDinamicos = {};

    document.querySelectorAll(".campo-dinamico").forEach(campo => {
        const nombre = campo.dataset.campo;

        if (nombre) {
            camposDinamicos[nombre] = campo.value;
        }
    });

    return {
        titulo: obtenerValor("tituloFicha"),
        resumen: obtenerValor("resumenFicha"),
        texto: obtenerValor("textoFicha"),
        visible: document.getElementById("visibleFicha")?.checked ?? true,
        camposDinamicos
    };
}

function guardarBorradorFicha() {
    const modal = document.getElementById("modalFicha");

    if (
        !window.Borradores ||
        !modal ||
        modal.style.display === "none"
    ) {
        return;
    }

    const clave = obtenerClaveBorradorFicha();

    if (!clave) return;

    window.Borradores.guardar(
        "fichas",
        clave,
        obtenerDatosBorradorFicha()
    );
}

function recuperarBorradorFicha() {
    const clave = obtenerClaveBorradorFicha();

    if (!window.Borradores || !clave) return false;

    const borrador = window.Borradores.leer("fichas", clave);

    if (!borrador?.datos) return false;

    const datos = borrador.datos;

    const titulo = document.getElementById("tituloFicha");
    const resumen = document.getElementById("resumenFicha");
    const texto = document.getElementById("textoFicha");
    const visible = document.getElementById("visibleFicha");

    if (titulo) titulo.value = datos.titulo ?? "";
    if (resumen) resumen.value = datos.resumen ?? "";
    if (texto) texto.value = datos.texto ?? "";
    if (visible) visible.checked = datos.visible ?? true;

    document.querySelectorAll(".campo-dinamico").forEach(campo => {
        const nombre = campo.dataset.campo;

        if (
            nombre &&
            datos.camposDinamicos &&
            Object.prototype.hasOwnProperty.call(
                datos.camposDinamicos,
                nombre
            )
        ) {
            campo.value = datos.camposDinamicos[nombre];
        }
    });

    return true;
}


if (!window.__autoguardadoFichasInicializado) {
    window.__autoguardadoFichasInicializado = true;

    window.__temporizadorBorradorFicha = null;

    const guardarDiferido = (e) => {
        if (!e.target.closest("#modalFicha")) return;

        clearTimeout(window.__temporizadorBorradorFicha);

        window.__temporizadorBorradorFicha = setTimeout(
            guardarBorradorFicha,
            400
        );
    };

    document.addEventListener("input", guardarDiferido);
    document.addEventListener("change", guardarDiferido);
}



/* =========================================================
   PREPARAR FORMULARIO DE NUEVA FICHA
   (lo usan abrirNuevaFicha y cambioTipoFicha)
========================================================= */

async function prepararFormularioNuevaFicha(idMenu) {

    const modalFicha = document.getElementById("modalFicha");

    if (!modalFicha) return;

    idMenu = String(idMenu);

    // Todo lo necesario en paralelo.
    const [plantilla] = await Promise.all([
        fcPlantilla(idMenu),
        cargarTiposFicha(),
        cargarEtiquetasFicha(),
        cargarFichasDisponibles()
    ]);

    window.plantillaActual = plantilla;

    generarCampos(plantilla.plantilla_json?.estructura?.campos || []);

    modalFicha.dataset.idFicha = "";
    modalFicha.dataset.idMenu = idMenu;

    // Recordar el menú para volver a abrir el formulario,
    // sin modificar el filtro de la lista general.
    window.__menuCreacionFicha = String(idMenu);

    aplicarMenuEnFormulario(idMenu);

    fichaEditando = null;
    relacionesPendientes = [];
    relacionesEliminadasPendientes = [];

    document.getElementById("btnGuardarFicha").textContent =
        "Guardar ficha";

    document.getElementById("tituloModalFicha").textContent =
        "Nueva ficha";

    document.getElementById("tituloFicha").value = "";
    document.getElementById("resumenFicha").value = "";
    document.getElementById("textoFicha").value = "";
    document.getElementById("imagenFicha").value = "";

    document.getElementById("labelImagenFicha").textContent =
        "Seleccionar imagen";

    document.getElementById("visibleFicha").checked = true;

    const imagenActual = document.getElementById("imagenActualFicha");

    if (imagenActual) {
        imagenActual.src = "";
        imagenActual.style.display = "none";
    }

    const contenedorImagenActual =
        document.getElementById("contenedorImagenActual");

    if (contenedorImagenActual) {
        contenedorImagenActual.style.display = "none";
    }

    const selectRelacion = document.getElementById("fichaRelacion");
    if (selectRelacion) selectRelacion.disabled = false;

    const tipoRelacion = document.getElementById("tipoRelacion");
    if (tipoRelacion) tipoRelacion.disabled = false;

    await mostrarRelacionesPendientes();

    modalFicha.style.display = "flex";

    // Recuperar el borrador guardado para este menú.
    if (recuperarBorradorFicha()) {
        console.log("Borrador de ficha recuperado.");
    }
}


/* =========================================================
   NUEVA FICHA
========================================================= */

async function abrirNuevaFicha() {
    // Si estamos dentro de un menú específico, respetarlo.
    const menuContextual = menuSeleccionado || null;

    // En Gestión general, recuperar el menú anterior solamente
    // si todavía existe un borrador pendiente para ese menú.
    const menuRecordado = window.__menuCreacionFicha;

    const borradorPendiente =
        !menuContextual &&
        menuRecordado &&
        window.Borradores?.leer(
            "fichas",
            `nuevo-menu-${menuRecordado}`
        )?.datos;

    const idMenu = menuContextual ||
        (borradorPendiente ? menuRecordado : null);

    console.log("Nueva ficha. Menú para crear:", idMenu);

    if (idMenu) {
        try {
            await prepararFormularioNuevaFicha(idMenu);
        } catch (error) {
            console.error("Error abriendo nueva ficha:", error);

            mostrarMensaje(
                "Error",
                "No se pudo abrir el formulario de nueva ficha."
            );
        }

        return;
    }

    // Si no hay borrador, pedir el menú nuevamente.
    const modal = document.getElementById("modalTipoFicha");

    if (modal) {
        await cargarTiposFicha();
        modal.style.display = "flex";
    }
}



// Se registra una sola vez aunque panel.js recargue este archivo.
if (!window.__fichasEventoNuevaRegistrado) {

    document.addEventListener("click", async function (e) {

        const boton = e.target.closest("#nuevaFicha");

        if (!boton) return;

        e.preventDefault();

        await abrirNuevaFicha();
    });

    window.__fichasEventoNuevaRegistrado = true;
}


function descartarBorradorFichaAlSalir() {
    const modal = document.getElementById("modalFicha");

    if (!modal || modal.style.display === "none") {
        return;
    }

    // Guardar inmediatamente los datos actuales antes de salir.
    clearTimeout(window.__temporizadorBorradorFicha);
    guardarBorradorFicha();

    // Ocultar el formulario, pero conservar el borrador,
    // el menú asociado y la clave necesaria para recuperarlo.
    modal.style.display = "none";

    // Salimos de la vista contextual, si corresponde.
    menuSeleccionado = null;
    nombreMenuSeleccionado = "";
}

window.descartarBorradorFichaAlSalir =
    descartarBorradorFichaAlSalir;


/* =========================================================
   CERRAR MODAL FICHA
========================================================= */



function cerrarFicha() {
    const modal = document.getElementById("modalFicha");

    if (!modal) return;

    // 1. Cancelar cualquier autoguardado pendiente.
    clearTimeout(window.__temporizadorBorradorFicha);

    // 2. Obtener la clave antes de limpiar el modal.
    const claveBorrador = obtenerClaveBorradorFicha();

    // 3. Eliminar el borrador con el tipo correcto: "fichas".
    if (window.Borradores && claveBorrador) {
        window.Borradores.eliminar("fichas", claveBorrador);
        console.log(
            "[Fichas] Borrador descartado:",
            claveBorrador
        );
    }

    // 4. Ocultar el modal antes de limpiar los campos.
    modal.style.display = "none";

    // 5. Limpiar los datos asociados a la ficha.
    modal.dataset.idFicha = "";
    modal.dataset.idMenu = "";
    delete modal.dataset.origenBorrador;

    // 6. Restablecer el formulario.
    const formulario = document.getElementById("formFicha");

    if (formulario) {
        formulario.reset();
    }

    // Limpiar también los campos dinámicos.
    document.querySelectorAll(
        "#modalFicha .campo-dinamico"
    ).forEach(campo => {
        campo.value = "";
    });

    // Limpiar relaciones temporales.
    relacionesPendientes = [];
    relacionesEliminadasPendientes = [];

    fichaEditando = null;

    window.__menuCreacionFicha = null;
}





/* =========================================================
   GUARDAR FICHA
========================================================= */

async function guardarFicha() {

    if (window.guardandoFicha) {
        return;
    }

    window.guardandoFicha = true;

    const modalFicha = document.getElementById("modalFicha");

    if (!modalFicha) {
        console.error("No existe modalFicha.");
        window.guardandoFicha = false;
        return;
    }

    const id_ficha = modalFicha.dataset.idFicha || "";

    const claveBorradorFicha = obtenerClaveBorradorFicha();

    const titulo =
        document.getElementById("tituloFicha").value.trim();

    if (titulo === "") {
        mostrarMensaje(
            "Campos obligatorios",
            "Debe ingresar un título para la ficha."
        );

        document.getElementById("tituloFicha").focus();

        window.guardandoFicha = false;
        return;
    }

    const formulario = new FormData();

    // ---- Datos dinámicos ----
    const datos = {};

    document.querySelectorAll(".campo-dinamico").forEach(campo => {
        datos[campo.dataset.campo] = campo.value;
    });

    // ---- Menú de la ficha ----
    // Prioridad: dataset.idMenu del modal > menú seleccionado > select.
    let id_menu = "";

    if (modalFicha.dataset.idMenu) {
        id_menu = modalFicha.dataset.idMenu;
    } else if (menuSeleccionado) {
        id_menu = String(menuSeleccionado);
    } else {
        id_menu = document.getElementById("tipoFicha")?.value || "";
    }

    if (!id_menu) {
        mostrarMensaje(
            "Menú requerido",
            "Debe seleccionar un menú para la ficha."
        );

        window.guardandoFicha = false;
        return;
    }

    formulario.append("id_menu", String(id_menu));
    formulario.append("titulo", titulo);
    formulario.append(
        "resumen",
        document.getElementById("resumenFicha").value
    );
    formulario.append(
        "texto",
        document.getElementById("textoFicha").value
    );
    formulario.append(
        "visible",
        document.getElementById("visibleFicha").checked ? 1 : 0
    );
    formulario.append("datos_json", JSON.stringify(datos));

    // ---- Imagen ----
    const imagen = document.getElementById("imagenFicha").files[0];

    if (imagen) {
        formulario.append("imagen", imagen);
    }

    try {

        let url = "/api/fichas";
        let metodo = "POST";

        if (id_ficha) {
            url = `/api/fichas/${id_ficha}`;
            metodo = "PUT";
        }

        const respuesta = await window.fetchProtegido(url, {
            method: metodo,
            body: formulario
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            mostrarMensaje(
                "No se pudo guardar",
                resultado.error ||
                "Ocurrió un error al guardar la ficha."
            );

            return;
        }

        const idGuardado = id_ficha || resultado.id_ficha;

        fichaEditando = idGuardado;

        // ---- Etiquetas ----
        await guardarEtiquetasFicha(idGuardado);

        // ---- Relaciones: 1) eliminar las quitadas ----
        for (const idRelacion of relacionesEliminadasPendientes) {

            const respuestaEliminar = await window.fetchProtegido(
                `/api/relacion-ficha/${idRelacion}`,
                { method: "DELETE" }
            );

            if (!respuestaEliminar.ok) {
                throw new Error(
                    `No se pudo eliminar la relación ${idRelacion}.`
                );
            }
        }

        // ---- Relaciones: 2) solo las nuevas (sin id_relacion) ----
        const relacionesNuevas = relacionesPendientes
            .filter(relacion => !relacion.id_relacion)
            .map(relacion => ({
                id_ficha_destino: relacion.id_ficha_destino,
                tipo_relacion: relacion.tipo_relacion
            }));

        // ---- Relaciones: 3) guardar las nuevas ----
        if (relacionesNuevas.length > 0) {

            const respuestaRelaciones = await window.fetchProtegido(
                `/api/relacion-ficha/${idGuardado}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        relaciones: relacionesNuevas
                    })
                }
            );

            if (!respuestaRelaciones.ok) {
                throw new Error(
                    "No se pudieron guardar las relaciones de la ficha."
                );
            }
        }

        // ---- Limpiar ----
        relacionesPendientes = [];
        relacionesEliminadasPendientes = [];
        fichaEditando = null;

        if (window.Borradores && claveBorradorFicha) {
            window.Borradores.eliminar("fichas", claveBorradorFicha);
        }

        cerrarFicha();

        modalFicha.dataset.idFicha = "";
        modalFicha.dataset.idMenu = "";

        document.getElementById("btnGuardarFicha").textContent =
            "Guardar ficha";

        // La lista de fichas cambió: invalidar la caché.
        fcInvalidar("fichas");

        // Se mantiene la vista actual (menú o gestión general).
        await cargarFichas();

    } catch (error) {

        console.error("Error guardando ficha:", error);

        mostrarMensaje(
            "Error",
            "Ocurrió un error al guardar la ficha."
        );

    } finally {
        window.guardandoFicha = false;
    }
}


/* =========================================================
   ELIMINAR FICHA (versión con confirm del navegador)
========================================================= */

async function eliminarFicha(id_ficha) {

    const confirmar = confirm("¿Eliminar esta ficha?");

    if (!confirmar) {
        return;
    }

    try {

        const respuesta = await window.fetchProtegido(
            `/api/fichas/${id_ficha}`,
            { method: "DELETE" }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            alert(resultado.error);
            return;
        }

        alert(resultado.mensaje);

        fcInvalidar("fichas");

        cargarFichas();

    } catch (error) {

        console.error("Error eliminando ficha:", error);

        mostrarMensaje(
            "Error",
            "Ocurrió un error al eliminar la ficha."
        );
    }
}


/* =========================================================
   CAMBIO DE TIPO DE FICHA
========================================================= */

async function cambioTipoFicha(e) {

    if (!e || !e.target || e.target.id !== "tipoFicha") {
        return;
    }

    const id_menu = e.target.value;

    // Si el formulario ya está abierto, no reiniciarlo.
    const modalFicha = document.getElementById("modalFicha");

    if (modalFicha && modalFicha.style.display === "flex") {
        return;
    }

    if (!id_menu) {
        const campos = document.getElementById("camposDinamicos");

        if (campos) campos.innerHTML = "";

        return;
    }

    try {
        cerrarTipoFicha();

        await prepararFormularioNuevaFicha(id_menu);

    } catch (error) {
        console.error("Error cargando plantilla:", error);
    }
}

// Se registra una sola vez.
if (!window.__fichasEventoTipoRegistrado) {
    document.addEventListener("change", cambioTipoFicha);
    window.__fichasEventoTipoRegistrado = true;
}


/* =========================================================
   CARGAR TIPOS DE FICHA / MENÚES (con caché)
========================================================= */

async function cargarTiposFicha() {

    try {
        const select = document.getElementById("tipoFicha");

        if (!select) {
            console.error("No existe tipoFicha");
            return;
        }

        const menus = await fcMenus();

        select.innerHTML =
            `<option value="">Seleccionar...</option>` +
            menus.map(menu => `
                <option value="${menu.id_menu}">
                    ${fcEscapar(menu.nombre)}
                </option>
            `).join("");

    } catch (error) {
        console.error("Error cargando tipos:", error);
    }
}


/* =========================================================
   GENERAR CAMPOS DINÁMICOS
========================================================= */

function generarCampos(campos) {

    const contenedor = document.getElementById("camposDinamicos");

    if (!contenedor) {
        console.error("No existe camposDinamicos.");
        return;
    }

    if (!campos || campos.length === 0) {
        contenedor.innerHTML =
            "<p>No hay atributos definidos para este tipo</p>";
        return;
    }

    contenedor.innerHTML = campos.map(campo => `
        <div class="campo-dinamico-item">
            <label>${fcEscapar(campo.etiqueta || campo.nombre)}</label>

            <input
                type="${fcEscapar(campo.tipo || "text")}"
                class="campo-dinamico"
                data-campo="${fcEscapar(campo.nombre)}"
            >
        </div>
    `).join("");
}


/* =========================================================
   CERRAR TIPO FICHA
========================================================= */

function cerrarTipoFicha() {
    const modal = document.getElementById("modalTipoFicha");

    if (modal) {
        modal.style.display = "none";
    }
}


/* =========================================================
   VOLVER MENÚS
========================================================= */

function volverMenus() {
    menuSeleccionado = null;
    nombreMenuSeleccionado = "";

    cargarVentana("menus");
}


/* =========================================================
   ELIMINAR FICHA - MODAL
========================================================= */

function abrirEliminarFicha(id) {
    fichaEliminar = id;

    document.getElementById("modalEliminarFicha").style.display = "flex";
}

function cerrarEliminarFicha() {
    fichaEliminar = null;

    document.getElementById("modalEliminarFicha").style.display = "none";
}

async function confirmarEliminarFicha() {

    if (!fichaEliminar) {
        return;
    }

    try {

        const respuesta = await window.fetchProtegido(
            `/api/fichas/${fichaEliminar}`,
            { method: "DELETE" }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            cerrarEliminarFicha();

            if (
                Array.isArray(resultado.multimedia) &&
                resultado.multimedia.length > 0
            ) {
                mostrarBloqueoEliminarFicha(resultado);
            } else {
                mostrarMensaje("Error", resultado.error);
            }

            return;
        }

        cerrarEliminarFicha();

        fcInvalidar("fichas");

        await cargarFichas();

    } catch (error) {
        console.error(error);
    }
}


/* =========================================================
   CERRAR MENSAJE FICHA
========================================================= */

function cerrarMensajeFicha() {
    const modal = document.getElementById("modalMensajeFicha");

    if (modal) {
        modal.style.display = "none";
    }
}


function etiquetaEstaActiva(etiqueta) {
    const valor = etiqueta?.activo;

    return (
        valor === true ||
        valor === 1 ||
        ["true", "1", "t"].includes(
            String(valor).trim().toLowerCase()
        )
    );
}


async function limpiarFiltrosFichas() {
    if (typeof window.limpiarFiltroBuscadorGlobal === "function") {
        window.limpiarFiltroBuscadorGlobal();
    }

    window.__filtroMenuFichas = "";
    window.__indiceOpcionMenuFichas = -1;

    const boton = document.getElementById("btnFiltroMenuFichas");
    const textoBoton = document.getElementById("textoFiltroMenuFichas");
    const panel = document.getElementById("panelFiltroMenuFichas");
    const buscar = document.getElementById("buscarMenuFichas");
    const flecha = boton?.querySelector(".flecha-selector-fichas");

    if (textoBoton) {
        textoBoton.textContent = "Menú: Todos";
    }

    if (panel) {
        panel.style.display = "none";
    }

    if (buscar) {
        buscar.value = "";
    }

    if (boton) {
        boton.setAttribute("aria-expanded", "false");
    }

    if (flecha) {
        flecha.style.transform = "rotate(0deg)";
    }

    await cargarFichas();
}


/* =========================================================
   ETIQUETAS
========================================================= */

async function cargarEtiquetasFicha(seleccionadas = []) {

    try {
        const contenedor =
            document.getElementById("listaEtiquetasFicha");

        if (!contenedor) {
            return;
        }

        const etiquetas = await fcEtiquetas();

        contenedor.innerHTML = etiquetas.map(etiqueta => `
            <label class="item-etiqueta ${
                etiquetaEstaActiva(etiqueta)
                    ? ""
                    : "etiqueta-desactivada"
            }">
                <input
                    type="checkbox"
                    class="checkbox-etiqueta"
                    value="${etiqueta.id_etiqueta}"
                    ${
                        seleccionadas.includes(etiqueta.id_etiqueta)
                            ? "checked"
                            : ""
                    }
                >
                ${fcEscapar(etiqueta.nombre)}
            </label>
        `).join("");

    } catch (error) {
        console.error("Error cargando etiquetas:", error);
    }
}

async function obtenerEtiquetasFicha(idFicha) {

    const respuesta = await window.fetchProtegido(
        `/api/fichas/${idFicha}/etiquetas`
    );

    if (!respuesta.ok) {
        return [];
    }

    const etiquetas = await respuesta.json();

    return etiquetas.map(etiqueta => etiqueta.id_etiqueta);
}

function obtenerEtiquetasSeleccionadas() {
    return Array.from(
        document.querySelectorAll(".checkbox-etiqueta:checked")
    ).map(checkbox => Number(checkbox.value));
}

async function guardarEtiquetasFicha(idFicha) {

    const etiquetas = obtenerEtiquetasSeleccionadas();

    const respuesta = await window.fetchProtegido(
        `/api/fichas/${idFicha}/etiquetas`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ etiquetas })
        }
    );

    if (!respuesta.ok) {
        console.error("No se pudieron guardar las etiquetas.");
    }
}


/* =========================================================
   FICHAS DISPONIBLES PARA RELACIONAR (con caché)
========================================================= */

async function cargarFichasDisponibles(idActual) {

    try {
        const select = document.getElementById("fichaRelacion");

        if (!select) {
            return;
        }

        const fichas = await fcFichas();

        select.innerHTML =
            `<option value="">Seleccionar ficha...</option>` +
            fichas
                .filter(f => f.id_ficha != idActual)
                .map(f => `
                    <option value="${f.id_ficha}">
                        ${fcEscapar(f.titulo)}
                    </option>
                `)
                .join("");

    } catch (error) {
        console.error("Error cargando fichas disponibles:", error);
    }
}


/* =========================================================
   CARGAR RELACIONES (lista simple, uso heredado)
========================================================= */

async function cargarRelacionesFicha(id_ficha) {

    const respuesta = await window.fetchProtegido(
        `/api/relacion-ficha/${id_ficha}`
    );

    if (!respuesta.ok) {
        return;
    }

    const relaciones = await respuesta.json();

    const contenedor =
        document.getElementById("listaRelacionesFicha");

    if (!contenedor) {
        return;
    }

    if (relaciones.length === 0) {
        contenedor.innerHTML = "<p>No hay fichas relacionadas</p>";
        return;
    }

    contenedor.innerHTML = relaciones.map(relacion => `
        <div class="item-relacion-ficha">

            <span>
                ${fcEscapar(
                    relacion.ficha_relacionada ||
                    relacion.titulo ||
                    `Ficha ${relacion.id_ficha_destino}`
                )}
            </span>

            <small>${fcEscapar(relacion.tipo_relacion)}</small>

            <button
                class="btn-eliminar"
                onclick="eliminarRelacionFicha(${relacion.id_relacion})"
            >
                ✖
            </button>

        </div>
    `).join("");
}


/* =========================================================
   AGREGAR RELACIÓN
========================================================= */

async function agregarRelacionFicha() {

    const select = document.getElementById("fichaRelacion");

    if (!select) {
        return;
    }

    const destino = Number(select.value);

    const tipo = document.getElementById("tipoRelacion")?.value;

    if (!destino) {
        mostrarMensaje(
            "Ficha requerida",
            "Debe seleccionar una ficha para crear la relación."
        );

        return;
    }

    if (!tipo) {
        mostrarMensaje(
            "Tipo de relación requerido",
            "Debe seleccionar qué relación existe entre las fichas antes de agregarla."
        );

        return;
    }

    const yaExiste = relacionesPendientes.some(
        relacion => Number(relacion.id_ficha_destino) === destino
    );

    if (yaExiste) {
        mostrarMensaje(
            "Ficha ya relacionada",
            "Esta ficha ya está relacionada. No puede relacionarse con la misma ficha más de una vez."
        );

        select.value = "";

        return;
    }

    const opcion = select.options[select.selectedIndex];

    const titulo = opcion
        ? opcion.textContent.trim()
        : `Ficha ${destino}`;

    // Relación nueva: id_relacion null (todavía no está en la BD).
    relacionesPendientes.push({
        id_relacion: null,
        id_ficha_destino: destino,
        tipo_relacion: tipo,
        titulo: titulo
    });

    await mostrarRelacionesPendientes();

    select.value = "";

    const tipoRelacion = document.getElementById("tipoRelacion");

    if (tipoRelacion) {
        tipoRelacion.value = "";
    }
}


/* =========================================================
   MOSTRAR RELACIONES PENDIENTES (MINI FICHAS)
   0 fetches extra: usa la lista cacheada de fichas.
========================================================= */

async function mostrarRelacionesPendientes() {

    const contenedor = document.getElementById("listaRelacionesFicha");

    if (!contenedor) return;

    if (!relacionesPendientes || relacionesPendientes.length === 0) {
        contenedor.innerHTML =
            "<span class='sin-relaciones'>No hay relaciones agregadas</span>";

        return;
    }

    // Evitar relaciones duplicadas (síncrono, antes de cualquier await).
    const idsUsados = new Set();

    relacionesPendientes = relacionesPendientes.filter(relacion => {
        const idDestino = Number(relacion.id_ficha_destino);

        if (!idDestino || idsUsados.has(idDestino)) return false;

        idsUsados.add(idDestino);

        return true;
    });

    let mapa = new Map();

    try {
        mapa = await fcMapaFichas();
    } catch (error) {
        console.error("Error obteniendo fichas relacionadas:", error);
    }

    // Se lee relacionesPendientes DESPUÉS del await: siempre actual.
    contenedor.innerHTML = relacionesPendientes.map((relacion, index) => {

        const f = mapa.get(String(relacion.id_ficha_destino));

        const titulo = f?.titulo || relacion.titulo || "Sin título";

        const visible = f ? f.visible : 1;

        return `
            <article class="mini-ficha-relacion ${
                visible == 0 ? "mini-ficha-desactivada" : ""
            }">
                <div class="mini-ficha-imagen">
                    <img
                        src="${obtenerRutaImagenFicha(f?.imagen)}"
                        alt="${fcEscapar(titulo)}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='/imagenes/default.png';"
                    >
                </div>

                <div class="mini-ficha-contenido">
                    <span class="mini-ficha-id">
                        FICHA #${relacion.id_ficha_destino}
                    </span>

                    <h4>${fcEscapar(titulo)}</h4>

                    <span class="mini-ficha-tipo">
                        ${fcEscapar(relacion.tipo_relacion || "Sin relación")}
                    </span>
                </div>

                <button
                    type="button"
                    class="mini-ficha-eliminar"
                    onclick="eliminarRelacionFichaEditar(${index})"
                    title="Eliminar relación"
                >
                    ×
                </button>
            </article>
        `;
    }).join("");
}


/* =========================================================
   ELIMINAR RELACIÓN DE LA VISTA
   NO ELIMINA DE LA BD TODAVÍA
========================================================= */

async function eliminarRelacionFichaEditar(index) {

    const relacion = relacionesPendientes[index];

    if (!relacion) {
        return;
    }

    // Si existe en la BD, guardar su ID para eliminarla al actualizar.
    if (
        relacion.id_relacion &&
        !relacionesEliminadasPendientes.includes(relacion.id_relacion)
    ) {
        relacionesEliminadasPendientes.push(relacion.id_relacion);
    }

    // Se quita solamente de la memoria.
    relacionesPendientes.splice(index, 1);

    await mostrarRelacionesPendientes();
}

function eliminarRelacionPendiente(index) {

    relacionesPendientes.splice(index, 1);

    mostrarRelacionesPendientes();
}


/* =========================================================
   MENSAJE
========================================================= */

function mostrarMensaje(titulo, mensaje) {

    const modal = document.getElementById("modalMensajeFicha");

    if (!modal) {
        alert(`${titulo}\n\n${mensaje}`);
        return;
    }

    document.getElementById("tituloMensaje").textContent = titulo;
    document.getElementById("textoMensaje").textContent = mensaje;

    const listaMultimedia = modal.querySelector("#listaMultimediaBloqueo");
    const accionesMultimedia = modal.querySelector("#accionesMultimediaBloqueo");

    if (listaMultimedia) {
        listaMultimedia.replaceChildren();
        listaMultimedia.style.display = "none";
    }

    if (accionesMultimedia) {
        accionesMultimedia.style.display = "none";
    }

    modal.style.display = "flex";
}


function mostrarBloqueoEliminarFicha(resultado) {
    const modal = document.getElementById("modalMensajeFicha");
    const titulo = modal?.querySelector("#tituloMensaje");
    const texto = modal?.querySelector("#textoMensaje");
    const lista = document.getElementById("listaMultimediaBloqueo");
    const acciones = document.getElementById("accionesMultimediaBloqueo");

    if (!modal || !titulo || !texto || !lista || !acciones) {
        mostrarMensaje("Error", resultado.error);
        return;
    }

    window.fichaBloqueadaParaMultimedia = resultado.ficha;

    titulo.textContent = "No se puede eliminar la ficha";
    texto.textContent = resultado.error;

    // No mostrar títulos, descripciones ni identificadores
    // de los archivos multimedia asociados.
    lista.replaceChildren();
    lista.style.display = "none";

    // Mantener los botones para cancelar o ir a multimedia.
    acciones.style.display = "flex";
    modal.style.display = "flex";
}

function irAMultimediaFichaBloqueada() {
    const ficha = window.fichaBloqueadaParaMultimedia;

    if (!ficha) return;

    cerrarMensajeFicha();
    verMultimediaFicha(ficha.id_ficha, ficha.titulo);
}