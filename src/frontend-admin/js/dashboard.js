console.log("dashboard.js cargado");


// =======================================================
// CONFIGURACIÓN VISUAL
// =======================================================

const CONFIG_DASHBOARD = {

    tipos: {

        menus: {
            nombre: "Menús",
            singular: "Menú",
            icono: "folder-open",
            clase: "menu"
        },

        fichas: {
            nombre: "Fichas",
            singular: "Ficha",
            icono: "file-text",
            clase: "ficha"
        },

        etiquetas: {
            nombre: "Etiquetas",
            singular: "Etiqueta",
            icono: "tag",
            clase: "etiqueta"
        },

        multimedia: {
            nombre: "Multimedia",
            singular: "Multimedia",
            icono: "image",
            clase: "multimedia"
        },

        plantillas: {
            nombre: "Plantillas",
            singular: "Plantilla",
            icono: "layout-template",
            clase: "plantilla"
        }

    }

};


// =======================================================
// ESCAPAR HTML
// =======================================================

function escaparHTML(valor) {

    if (valor === null || valor === undefined) {
        return "";
    }

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =======================================================
// OBTENER CONFIGURACIÓN DE TIPO
// =======================================================

function obtenerTipoDashboard(tipo) {

    return CONFIG_DASHBOARD.tipos[tipo] || {

        nombre: tipo,
        singular: tipo,
        icono: "database",
        clase: "generico"

    };

}


// =======================================================
// CARGAR DASHBOARD
// =======================================================

async function cargarDashboard() {

    try {

        const respuesta = await window.fetchProtegido(
            "/api/dashboard"
        );


        if (!respuesta.ok) {

            throw new Error(
                `Error HTTP ${respuesta.status}`
            );

        }


        const datos = await respuesta.json();


        console.log(
            "Datos dashboard:",
            datos
        );


        // ===================================================
        // RESUMEN
        // ===================================================

        actualizarElemento(
            "totalMenus",
            datos.resumen?.menus ?? 0
        );


        actualizarElemento(
            "totalFichas",
            datos.resumen?.fichas ?? 0
        );


        actualizarElemento(
            "totalMultimedia",
            datos.resumen?.multimedia ?? 0
        );


        actualizarElemento(
            "totalPlantillas",
            datos.resumen?.plantillas ?? 0
        );


        actualizarElemento(
            "totalEtiquetas",
            datos.resumen?.etiquetas ?? 0
        );



        // ===================================================
        // ÚLTIMAS FICHAS
        // ===================================================

        mostrarUltimasFichas(
            datos.fichas || []
        );



        // ===================================================
        // ÚLTIMOS MENÚS
        // ===================================================

        mostrarUltimosMenus(
            datos.menus || []
        );



        // ===================================================
        // MULTIMEDIA
        // ===================================================

        mostrarMultimedia(
            datos.multimedia || []
        );



        // ===================================================
        // GRÁFICO FICHAS POR MENÚ
        // ===================================================

        crearGraficoBarras(

            document.getElementById(
                "graficoFichasMenu"
            ),

            datos.fichasMenu || [],

            "nombre",

            "cantidad"

        );



        // ===================================================
        // GRÁFICO MULTIMEDIA
        // ===================================================

        crearGraficoBarras(

            document.getElementById(
                "graficoMultimedia"
            ),

            datos.multimedia || [],

            "tipo_multi",

            "cantidad"

        );



        // ===================================================
        // ESTADO DEL CONTENIDO
        // ===================================================

        mostrarEstadoContenido(

            datos.estado || [],

            datos.contenidoOculto || {}

        );



        // ===================================================
        // ACTIVAR ICONOS
        // ===================================================

        activarIconos();


    } catch (error) {

        console.error(
            "Error cargando dashboard:",
            error
        );

    }

}



// =======================================================
// ACTUALIZAR ELEMENTO
// =======================================================

function actualizarElemento(
    id,
    valor
) {

    const elemento =
        document.getElementById(id);


    if (elemento) {

        elemento.textContent =
            valor;

    }

}



// =======================================================
// ACTIVAR LUCIDE
// =======================================================

function activarIconos() {

    if (window.lucide) {

        window.lucide.createIcons();

    }

}



// =======================================================
// ÚLTIMAS FICHAS
// =======================================================

function mostrarUltimasFichas(
    fichas
) {

    const lista =
        document.getElementById(
            "listaFichas"
        );


    if (!lista) {
        return;
    }


    if (!fichas.length) {

        lista.innerHTML = `

            <div class="dashboard-sin-datos">

                <i
                    data-lucide="file-x"
                    aria-hidden="true">
                </i>

                <div>

                    <strong>
                        No hay fichas
                    </strong>

                    <span>
                        Todavía no se registraron fichas.
                    </span>

                </div>

            </div>

        `;

        activarIconos();

        return;

    }


    lista.innerHTML =
        fichas.map(function (f) {

            return `

                <div class="item-dashboard item-ficha">

                    <div class="item-dashboard-icono">

                        <i
                            data-lucide="file-text"
                            aria-hidden="true">
                        </i>

                    </div>


                    <div class="item-dashboard-contenido">

                        <div class="item-dashboard-titulo">

                            <strong>
                                ${escaparHTML(f.titulo)}
                            </strong>

                            <span class="badge-dashboard badge-ficha">
                                FICHA
                            </span>

                        </div>


                        <span class="item-dashboard-subtitulo">

                            ${escaparHTML(
                                f.creado || "Sin fecha"
                            )}

                        </span>

                    </div>


                    <i
                        class="item-dashboard-flecha"
                        data-lucide="chevron-right"
                        aria-hidden="true">
                    </i>

                </div>

            `;

        }).join("");


    activarIconos();

}



// =======================================================
// ÚLTIMOS MENÚS
// =======================================================

function mostrarUltimosMenus(
    menus
) {

    const lista =
        document.getElementById(
            "listaMenus"
        );


    if (!lista) {
        return;
    }


    if (!menus.length) {

        lista.innerHTML = `

            <div class="dashboard-sin-datos">

                <i
                    data-lucide="folder-x"
                    aria-hidden="true">
                </i>

                <div>

                    <strong>
                        No hay menús
                    </strong>

                    <span>
                        Todavía no se registraron menús.
                    </span>

                </div>

            </div>

        `;

        activarIconos();

        return;

    }


    lista.innerHTML =
        menus.map(function (m) {

            return `

                <div class="item-dashboard item-menu">

                    <div class="item-dashboard-icono">

                        <i
                            data-lucide="folder-open"
                            aria-hidden="true">
                        </i>

                    </div>


                    <div class="item-dashboard-contenido">

                        <div class="item-dashboard-titulo">

                            <strong>
                                ${escaparHTML(m.nombre)}
                            </strong>

                            <span class="badge-dashboard badge-menu">
                                MENÚ
                            </span>

                        </div>


                        <span class="item-dashboard-subtitulo">

                            ${escaparHTML(
                                m.actualizado || "Sin fecha"
                            )}

                        </span>

                    </div>


                    <i
                        class="item-dashboard-flecha"
                        data-lucide="chevron-right"
                        aria-hidden="true">
                    </i>

                </div>

            `;

        }).join("");


    activarIconos();

}



// =======================================================
// MULTIMEDIA
// =======================================================

function mostrarMultimedia(
    multimedia
) {

    const lista =
        document.getElementById(
            "listaMultimedia"
        );


    if (!lista) {
        return;
    }


    if (!multimedia.length) {

        lista.innerHTML = `

            <div class="dashboard-sin-datos">

                <i
                    data-lucide="image-off"
                    aria-hidden="true">
                </i>

                <div>

                    <strong>
                        No hay multimedia
                    </strong>

                    <span>
                        Todavía no se registraron archivos.
                    </span>

                </div>

            </div>

        `;

        activarIconos();

        return;

    }


    lista.innerHTML =
        multimedia.map(function (m) {

            const tipo =
                escaparHTML(
                    m.tipo_multi || "Recurso"
                );


            return `

                <div class="item-dashboard item-multimedia">

                    <div class="item-dashboard-icono">

                        <i
                            data-lucide="image"
                            aria-hidden="true">
                        </i>

                    </div>


                    <div class="item-dashboard-contenido">

                        <div class="item-dashboard-titulo">

                            <strong>
                                ${tipo}
                            </strong>

                            <span class="badge-dashboard badge-multimedia">
                                MULTIMEDIA
                            </span>

                        </div>


                        <span class="item-dashboard-subtitulo">

                            ${Number(m.cantidad) || 0}
                            archivo(s)

                        </span>

                    </div>


                    <span class="item-dashboard-cantidad">

                        ${Number(m.cantidad) || 0}

                    </span>

                </div>

            `;

        }).join("");


    activarIconos();

}



// =======================================================
// GRÁFICOS
// =======================================================

function crearGraficoBarras(
    elemento,
    datos,
    campoNombre,
    campoValor
) {

    if (!elemento) {
        return;
    }


    if (!datos || datos.length === 0) {

        elemento.innerHTML = `

            <div class="dashboard-sin-datos">

                <i
                    data-lucide="bar-chart-3"
                    aria-hidden="true">
                </i>

                <div>

                    <strong>
                        Sin datos
                    </strong>

                    <span>
                        No hay información suficiente para mostrar.
                    </span>

                </div>

            </div>

        `;

        activarIconos();

        return;

    }


    const valores =
        datos.map(function (d) {

            return Number(
                d[campoValor]
            ) || 0;

        });


    const max =
        Math.max(
            ...valores,
            1
        );


    elemento.innerHTML =
        datos.map(function (d) {

            const valor =
                Number(
                    d[campoValor]
                ) || 0;


            const porcentaje =
                (valor / max) * 100;


            return `

                <div class="dashboard-barra-item">

                    <div class="dashboard-barra-titulo">

                        <span>

                            <i
                                data-lucide="folder"
                                aria-hidden="true">
                            </i>

                            ${escaparHTML(
                                d[campoNombre]
                            )}

                        </span>


                        <strong>
                            ${valor}
                        </strong>

                    </div>


                    <div class="dashboard-barra-fondo">

                        <div
                            class="dashboard-barra-progreso"
                            style="width:${porcentaje}%">
                        </div>

                    </div>

                </div>

            `;

        }).join("");


    activarIconos();

}



// =======================================================
// ESTADO DEL CONTENIDO
// =======================================================

function mostrarEstadoContenido(
    datos,
    contenidoOculto
) {

    const contenedor =
        document.getElementById(
            "estadoContenido"
        );


    if (!contenedor) {
        return;
    }


    if (!datos || datos.length === 0) {

        contenedor.innerHTML = `

            <div class="dashboard-sin-datos">

                <i
                    data-lucide="database"
                    aria-hidden="true">
                </i>

                <div>

                    <strong>
                        Sin información
                    </strong>

                    <span>
                        No hay datos de estado disponibles.
                    </span>

                </div>

            </div>

        `;

        activarIconos();

        return;

    }


    contenedor.innerHTML =
        datos.map(function (item) {

            const tipo =
                obtenerTipoDashboard(
                    item.tipo
                );


            const visibles =
                Number(
                    item.visibles
                ) || 0;


            const noVisibles =
                Number(
                    item.no_visibles
                ) || 0;


            return `

                <div
                    class="
                        estado-contenido-card
                        estado-${tipo.clase}
                    "
                >

                    <div class="estado-contenido-icono">

                        <i
                            data-lucide="${tipo.icono}"
                            aria-hidden="true">
                        </i>

                    </div>


                    <div class="estado-contenido-info">

                        <div class="estado-contenido-titulo">

                            <div class="estado-titulo-principal">

                                <strong>
                                    ${tipo.nombre}
                                </strong>

                                <span
                                    class="
                                        badge-dashboard
                                        badge-${tipo.clase}
                                    "
                                >
                                    ${tipo.singular}
                                </span>

                            </div>


                            <span class="estado-activo">

                                <span></span>

                                Activo

                            </span>

                        </div>


                        <div class="estado-contenido-datos">

                            <div class="estado-dato visible">

                                <i
                                    data-lucide="eye"
                                    aria-hidden="true">
                                </i>

                                <strong>
                                    ${visibles}
                                </strong>

                                <span>
                                    visibles
                                </span>

                            </div>


                            <div class="estado-dato oculto">

                                <i
                                    data-lucide="eye-off"
                                    aria-hidden="true">
                                </i>

                                <strong>
                                    ${noVisibles}
                                </strong>

                                <span>
                                    ocultos
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

            `;

        }).join("");


    mostrarContenidoOculto(
        contenidoOculto || {}
    );


    activarIconos();

}



// =======================================================
// CONTENIDO OCULTO
// =======================================================

function mostrarContenidoOculto(
    contenido
) {

    const tipos = [

        "menus",
        "fichas",
        "etiquetas",
        "multimedia"

    ];


    tipos.forEach(function (tipo) {

        const lista =
            document.getElementById(
                `ocultos-${tipo}`
            );


        const contador =
            document.getElementById(
                `cantidad-${tipo}-ocultos`
            );


        if (!lista) {
            return;
        }


        const elementos =
            contenido[tipo] || [];


        // ===================================================
        // CONTADOR
        // ===================================================

        if (contador) {

            contador.textContent =
                elementos.length;

        }


        // ===================================================
        // SIN ELEMENTOS
        // ===================================================

        if (elementos.length === 0) {

            lista.innerHTML = `

                <div class="sin-fichas-ocultas">

                    <i
                        data-lucide="check-circle-2">
                    </i>

                    <span>
                        No hay ${nombreTipo(tipo)}
                        ocultos.
                    </span>

                </div>

            `;

            return;

        }


        // ===================================================
        // ELEMENTOS
        // ===================================================

        const tipoConfig =
            obtenerTipoDashboard(
                tipo
            );


        lista.innerHTML =
            elementos.map(function (item) {

                return `

                    <div
                        class="
                            ficha-oculta
                            oculto-${tipoConfig.clase}
                        "
                    >

                        <div class="ficha-oculta-icono">

                            <i
                                data-lucide="${tipoConfig.icono}"
                                aria-hidden="true">
                            </i>

                        </div>


                        <div class="ficha-oculta-info">

                            <div class="ficha-oculta-titulo">

                                <span
                                    class="ficha-oculta-nombre"
                                >
                                    ${escaparHTML(
                                        item.nombre ||
                                        "Sin nombre"
                                    )}
                                </span>


                                <span
                                    class="
                                        badge-dashboard
                                        badge-${tipoConfig.clase}
                                    "
                                >
                                    ${tipoConfig.singular}
                                </span>

                            </div>


                            <span class="ficha-oculta-menu">

                                ${escaparHTML(
                                    item.subtitulo ||
                                    tipoConfig.nombre
                                )}

                            </span>

                        </div>


                        <span class="ficha-oculta-estado">

                            <i
                                data-lucide="eye-off"
                                aria-hidden="true">
                            </i>

                            No visible

                        </span>

                    </div>

                `;

            }).join("");

    });


    activarIconos();

}



// =======================================================
// NOMBRE TIPO
// =======================================================

function nombreTipo(
    tipo
) {

    return {

        menus: "menús",
        fichas: "fichas",
        etiquetas: "etiquetas",
        multimedia: "elementos multimedia"

    }[tipo] || tipo;

}



// =======================================================
// ABRIR / CERRAR CONTENIDO OCULTO
// =======================================================

function alternarContenidoOculto(
    tipo,
    boton
) {

    const lista =
        document.getElementById(
            `ocultos-${tipo}`
        );


    if (!lista) {
        return;
    }


    if (lista.hidden) {

        lista.hidden = false;

        boton.classList.add(
            "abierto"
        );


        const flecha =
            boton.querySelector(
                ".estado-flecha"
            );


        if (flecha) {

            flecha.setAttribute(
                "data-lucide",
                "chevron-up"
            );

        }

    } else {

        lista.hidden = true;

        boton.classList.remove(
            "abierto"
        );


        const flecha =
            boton.querySelector(
                ".estado-flecha"
            );


        if (flecha) {

            flecha.setAttribute(
                "data-lucide",
                "chevron-down"
            );

        }

    }


    activarIconos();

}



// =======================================================
// INICIAR DASHBOARD
// =======================================================

cargarDashboard();