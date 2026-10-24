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
 
 
// Fichas de la lista actual (sin filtrar) y menú elegido en el filtro.
var fcFichasLista = [];
var fcFiltroMenu = "";
 
// "" = todos | "__sin__" = fichas sin menú | "<id_menu>" = un menú
function fcFichasFiltradas() {
 
    // Dentro de un menú la lista ya viene filtrada desde la API.
    if (menuSeleccionado || !fcFiltroMenu) {
        return fcFichasLista;
    }
 
    if (fcFiltroMenu === "__sin__") {
        return fcFichasLista.filter(function (f) {
            return !f.id_menu;
        });
    }
 
    return fcFichasLista.filter(function (f) {
        return String(f.id_menu) === fcFiltroMenu;
    });
}
 
// Llena el desplegable de menús y lo conecta con la lista.
// La barra solo se muestra en la gestión general (sin menú elegido).
function fcPrepararFiltroMenu(menus) {
 
    const barra = document.getElementById("filtrosFichas");
    const select = document.getElementById("filtroMenuFichas");
 
    if (!barra || !select) {
        return;
    }
 
    if (menuSeleccionado) {
        barra.style.display = "none";
        return;
    }
 
    barra.style.display = "flex";
 
    const lista = Array.isArray(menus)
        ? menus.slice().sort(function (a, b) {
            return String(a.nombre).localeCompare(String(b.nombre), "es");
        })
        : [];
 
    select.innerHTML = "";
 
    const agregar = function (valor, texto) {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;
        select.appendChild(opcion);
    };
 
    agregar("", "Todos los menús");
 
    lista.forEach(function (menu) {
        agregar(String(menu.id_menu), menu.nombre);
    });
 
    if (fcFichasLista.some(function (f) { return !f.id_menu; })) {
        agregar("__sin__", "Sin asignar");
    }
 
    // Conserva el menú elegido si todavía existe (p. ej. después de guardar).
    select.value = fcFiltroMenu;
 
    if (select.value !== fcFiltroMenu) {
        select.value = "";
    }
 
    fcFiltroMenu = select.value;
 
    select.onchange = function () {
        fcFiltroMenu = select.value;
        fcPintarFichas();
    };
}
 
function fcTarjetaFichaHTML(ficha, esConsulta) {
 
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
}
 
// Dibuja la grilla según el filtro elegido (todo de una sola vez).
function fcPintarFichas() {
 
    const contenedor = document.getElementById("listaFichas");
 
    if (!contenedor) {
        console.error("No existe listaFichas");
        return;
    }
 
    const fichas = fcFichasFiltradas();
    const total = fcFichasLista.length;
 
    const contador = document.getElementById("contadorFichas");
 
    if (contador) {
        contador.textContent =
            fichas.length === total
                ? `${total} ficha${total === 1 ? "" : "s"}`
                : `${fichas.length} de ${total} fichas`;
    }
 
    if (fichas.length === 0) {
        const mensaje =
            (menuSeleccionado || total > 0)
                ? "Este menú todavía no tiene fichas asociadas."
                : "No hay fichas para mostrar.";
 
        contenedor.innerHTML = `
            <div class="mensaje-sin-fichas">
                <p>${mensaje}</p>
            </div>
        `;
 
        return;
    }
 
    const esConsulta = window.usuarioActual?.rol === "consulta";
 
    contenedor.innerHTML = fichas
        .map(function (ficha) {
            return fcTarjetaFichaHTML(ficha, esConsulta);
        })
        .join("");
 
    if (window.lucide) {
        window.lucide.createIcons();
    }
}
 
async function cargarFichas() {
 
    actualizarCabeceraFichas();
 
    try {
        const botonNuevaFicha = document.getElementById("nuevaFicha");
        const barraVolver = document.getElementById("barraVolver");
 
        let url = "/api/fichas";
 
        if (menuSeleccionado) {
            url = `/api/fichas/menu/${menuSeleccionado}`;
 
            if (barraVolver) {
                barraVolver.style.display = "inline-flex";
            }
        } else if (barraVolver) {
            barraVolver.style.display = "none";
        }
 
        if (botonNuevaFicha) {
            botonNuevaFicha.style.display = "inline-flex";
        }
 
        // Los menús del filtro se piden en paralelo con las fichas
        // (solo en la gestión general).
        const promesaMenus =
            menuSeleccionado ? null : fcSeguro(fcMenus());
 
        const respuesta = await window.fetchProtegido(url);
 
        if (!respuesta.ok) {
            console.error("Error obteniendo fichas:", respuesta.status);
            return;
        }
 
        const fichas = await respuesta.json();
 
        // Si es la lista completa, aprovecharla como caché
        // (la usan el select y las mini-fichas de relaciones).
        if (url === "/api/fichas") {
            fcCache.set("fichas", {
                promesa: Promise.resolve(fichas),
                hora: Date.now()
            });
        }
 
        fcFichasLista = Array.isArray(fichas) ? fichas : [];
 
        fcPrepararFiltroMenu(
            promesaMenus ? await promesaMenus : null
        );
 
        fcPintarFichas();
 
    } catch (error) {
        console.error("Error cargando fichas:", error);
    }
}
 