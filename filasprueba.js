console.log("Modulo fichas cargado");


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

let fichaEliminar = null;
let fichaEditando = null;

// =========================================================
// RELACIONES PENDIENTES
// =========================================================

// Relaciones que quedarán guardadas al actualizar.
let relacionesPendientes = [];

// Relaciones existentes que el usuario quitó con la X.
// Se eliminan realmente de la BD recién al guardar.
let relacionesEliminadasPendientes = [];


/* =========================================================
   CABECERA DE FICHAS
========================================================= */

function actualizarCabeceraFichas() {

    const titulo =
        document.getElementById("tituloFichas");

    const subtitulo =
        document.getElementById("subtituloFichas");

    const volver =
        document.getElementById("barraVolver");

    if (!titulo || !subtitulo) {
        return;
    }

    /*
     * =====================================================
     * FICHAS DE UN MENÚ
     * =====================================================
     */

    if (menuSeleccionado && nombreMenuSeleccionado) {

        titulo.textContent =
            "Fichas del menú";

        subtitulo.innerHTML = `
            <strong>${nombreMenuSeleccionado}</strong>
        `;

        subtitulo.style.display =
            "block";

        if (volver) {
            volver.style.display =
                "inline-flex";
        }

    }

    /*
     * =====================================================
     * TODAS LAS FICHAS
     * =====================================================
     */

    else {

        titulo.textContent =
            "Gestión de Fichas";

        subtitulo.innerHTML =
            "";

        subtitulo.style.display =
            "none";

        if (volver) {
            volver.style.display =
                "none";
        }
    }
}


/* =========================================================
   CARGAR FICHAS
========================================================= */

async function cargarFichas() {

    actualizarCabeceraFichas();

    try {

        const botonNuevaFicha =
            document.getElementById("nuevaFicha");

        const barraVolver =
            document.getElementById("barraVolver");

        let url =
            "/api/fichas";

        /*
         * Si hay un menú seleccionado,
         * mostramos solamente sus fichas.
         */

        if (menuSeleccionado) {

            url =
                `/api/fichas/menu/${menuSeleccionado}`;

            if (botonNuevaFicha) {
                botonNuevaFicha.style.display =
                    "inline-flex";
            }

            if (barraVolver) {
                barraVolver.style.display =
                    "inline-flex";
            }

        } else {

            /*
             * Gestión general:
             * mostramos todas las fichas.
             */

            if (botonNuevaFicha) {
                botonNuevaFicha.style.display =
                    "inline-flex";
            }

            if (barraVolver) {
                barraVolver.style.display =
                    "none";
            }
        }


        const respuesta =
            await window.fetchProtegido(url);

        if (!respuesta.ok) {

            console.error(
                "Error obteniendo fichas:",
                respuesta.status
            );

            return;
        }


        const fichas =
            await respuesta.json();


        const esConsulta =
            window.usuarioActual?.rol === "consulta";


        const contenedor =
            document.getElementById("listaFichas");


        if (!contenedor) {

            console.error(
                "No existe listaFichas"
            );

            return;
        }


        contenedor.innerHTML =
            "";



    const tarjetas = fichas.map(ficha => {

        const fechaFicha = obtenerFechaFicha(ficha);

        return `

            <article class="ficha-tarjeta ${
                ficha.visible == 0
                    ? "ficha-desactivada"
                    : ""
            }">

                <div class="ficha-imagen">

                    <img
                        src="${obtenerRutaImagenFicha(ficha.imagen)}"
                        onerror="
                            this.onerror=null;
                            this.src='/img/no-image.png'
                        "
                    />

                </div>

                <div class="ficha-info">

                    <span class="campo-titulo-ficha">
                        TÍTULO
                    </span>

                    <h3>
                        ${ficha.titulo || "Sin título"}
                    </h3>

                    <p>
                        ${(ficha.resumen || "Sin descripción").replace(/\n/g, " ")}
                    </p>

                    <div class="datos-menu">

                        <small>
                            <i data-lucide="layers" aria-hidden="true"></i>
                            Menú: ${ficha.menu ? `${ficha.menu} - #${ficha.id_menu}` : (ficha.id_menu ? `Menú #${ficha.id_menu}` : "Sin asignar")}
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
    });

    contenedor.innerHTML = tarjetas.join("");


        // Si el menú seleccionado no tiene fichas, informar al usuario.
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
        }

        // Inicializar los iconos de las tarjetas de fichas.
        if (window.lucide) {
            window.lucide.createIcons();
        }

    } catch (error) {

        console.error(
            "Error cargando fichas:",
            error
        );
    }
}

/* =========================================================
   VISTA PREVIA FICHA
========================================================= */

async function vistaPreviaFicha(id_ficha) {

    try {

        const respuesta =
            await window.fetchProtegido(
                `/api/fichas/${id_ficha}`
            );


        if (!respuesta.ok) {

            console.error(
                "No se pudo obtener la ficha."
            );

            return;
        }


        const ficha =
            await respuesta.json();


        /*
         * DATOS GENERALES
         */

        document.getElementById(
            "vpFichaId"
        ).textContent =
            ficha.id_ficha;


        let nombreMenu = `Menú #${ficha.id_menu}`;

        try {
            const respuestaMenus = await window.fetchProtegido("/api/menus");

            if (respuestaMenus.ok) {
                const menus = await respuestaMenus.json();

                const menu = menus.find(
                    m => String(m.id_menu) === String(ficha.id_menu)
                );

                if (menu?.nombre) {
                    nombreMenu = `#${ficha.id_menu} — ${menu.nombre}`;
                }
            }
        } catch (error) {
            console.error("Error obteniendo el nombre del menú:", error);
        }

        document.getElementById("vpFichaMenu").textContent = nombreMenu;


        document.getElementById(
            "vpFichaTitulo"
        ).textContent =
            ficha.titulo;


        document.getElementById(
            "vpFichaResumen"
        ).textContent =
            ficha.resumen || "-";


        document.getElementById(
            "vpFichaTexto"
        ).textContent =
            ficha.texto || "-";


        document.getElementById(
            "vpFichaVisible"
        ).textContent =
            ficha.visible == 1
                ? "Sí"
                : "No";


        document.getElementById(
            "vpFichaUsuario"
        ).textContent =
            ficha.id_usuario || "-";


        document.getElementById(
            "vpFichaCreado"
        ).textContent =
            mostrarFechaArgentina(
                ficha.creado
            );


        document.getElementById(
            "vpFichaActualizado"
        ).textContent =
            mostrarFechaArgentina(
                ficha.actualizado
            );


        /*
         * IMAGEN
         */

        const imagen =
            document.getElementById(
                "vpFichaImagen"
            );


        if (ficha.imagen) {

            console.log("Imagen recibida de la API:", ficha.imagen);
            console.log(
                "Imagen después de obtenerRutaImagenFicha:",
                obtenerRutaImagenFicha(ficha.imagen)
            );

            imagen.src = obtenerRutaImagenFicha(ficha.imagen);

        } else {

            imagen.src =
                "/imagenes/default.png";
        }



        /*
         * DATOS DINÁMICOS, ETIQUETAS Y RELACIONES
         * Las tres consultas se ejecutan en paralelo.
         */

        const contenedor =
            document.getElementById("vpCamposDinamicos");

        const contenedorEtiquetas =
            document.getElementById("vistaEtiquetasFicha");

        const contenedorRelaciones =
            document.getElementById("vistaRelacionesFicha");

        if (contenedor) contenedor.innerHTML = "";
        if (contenedorEtiquetas) contenedorEtiquetas.innerHTML = "";
        if (contenedorRelaciones) contenedorRelaciones.innerHTML = "";

        const [
            respuestaPlantilla,
            respuestaEtiquetas,
            respuestaRelaciones
        ] = await Promise.all([
            window.fetchProtegido(
                `/api/plantillas/menu/${ficha.id_menu}`
            ),
            window.fetchProtegido(
                `/api/fichas/${id_ficha}/etiquetas`
            ),
            window.fetchProtegido(
                `/api/relacion-ficha/${id_ficha}`
            )
        ]);

        /*
         * PLANTILLA Y CAMPOS DINÁMICOS
         */

        if (contenedor) {
            if (respuestaPlantilla.ok) {
                const plantilla = await respuestaPlantilla.json();

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

                const htmlCampos = campos.map(campo => `
                    <div class="campo-preview">
                        <span class="titulo-preview">
                            ${campo.etiqueta}
                        </span>
                        <span class="valor-preview">
                            ${datos[campo.nombre] || "-"}
                        </span>
                    </div>
                `);

                contenedor.innerHTML = htmlCampos.join("");
            } else {
                contenedor.innerHTML =
                    "<p>No fue posible cargar la plantilla.</p>";
            }
        }

        /*
         * ETIQUETAS
         */

        if (contenedorEtiquetas) {
            if (respuestaEtiquetas.ok) {
                const etiquetas = await respuestaEtiquetas.json();

                if (!Array.isArray(etiquetas) || etiquetas.length === 0) {
                    contenedorEtiquetas.innerHTML =
                        "<span class='sin-etiquetas'>Sin etiquetas</span>";
                } else {
                    contenedorEtiquetas.innerHTML = etiquetas.map(etiqueta => `
                        <span class="etiqueta-vista ${
                            etiqueta.activo ? "" : "etiqueta-vista-desactivada"
                        }">
                            ${etiqueta.nombre}
                        </span>
                    `).join("");
                }
            } else {
                contenedorEtiquetas.innerHTML =
                    "<span class='sin-etiquetas'>No fue posible cargar las etiquetas.</span>";
            }
        }

        /*
         * FICHAS RELACIONADAS
         */

        if (contenedorRelaciones) {
            if (respuestaRelaciones.ok) {
                const relaciones = await respuestaRelaciones.json();

                if (!Array.isArray(relaciones) || relaciones.length === 0) {
                    contenedorRelaciones.innerHTML = `
                        <span class="sin-relaciones">
                            Sin fichas relacionadas
                        </span>
                    `;
                } else {
                    // Consultar los detalles de las fichas en paralelo.
                    const fichasRelacionadas = await Promise.all(
                        relaciones.map(async relacion => {
                            try {
                                const respuestaFicha =
                                    await window.fetchProtegido(
                                        `/api/fichas/${relacion.id_ficha_destino}`
                                    );

                                if (respuestaFicha.ok) {
                                    const fichaRelacionada =
                                        await respuestaFicha.json();

                                    return {
                                        ...relacion,
                                        titulo:
                                            fichaRelacionada.titulo ||
                                            relacion.titulo ||
                                            relacion.ficha_relacionada ||
                                            "Sin título",
                                        imagen: fichaRelacionada.imagen || null,
                                        visible: fichaRelacionada.visible
                                    };
                                }
                            } catch (error) {
                                console.error(
                                    "Error obteniendo ficha relacionada:",
                                    error
                                );
                            }

                            return relacion;
                        })
                    );

                    const htmlRelaciones = fichasRelacionadas.map(relacion => {
                        const imagen = relacion.imagen
                            ? (
                                /^(https?:|data:)/i.test(relacion.imagen)
                                    ? relacion.imagen
                                    : "/" + relacion.imagen
                                        .replace(/^\/+/, "")
                                        .replace("public/", "")
                            )
                            : "/imagenes/default.png";

                        return `
                            <article class="relacion-vista ${
                                relacion.visible == 0
                                    ? "relacion-vista-desactivada"
                                    : ""
                            }">
                                <div class="relacion-vista-imagen">
                                    <img
                                        src="${imagen}"
                                        alt="${relacion.titulo || "Ficha"}"
                                        onerror="
                                            this.onerror=null;
                                            this.src='/imagenes/default.png';
                                        "
                                    >
                                </div>

                                <div class="relacion-vista-contenido">
                                    <span class="relacion-vista-id">
                                        FICHA #${relacion.id_ficha_destino}
                                    </span>

                                    <strong>
                                        ${
                                            relacion.titulo ||
                                            relacion.ficha_relacionada ||
                                            "Sin título"
                                        }
                                    </strong>

                                    <span class="relacion-vista-tipo">
                                        ${relacion.tipo_relacion || "Sin relación"}
                                    </span>
                                </div>
                            </article>
                        `;
                    });

                    contenedorRelaciones.innerHTML = htmlRelaciones.join("");
                }
            }
        }

        /*
         * MOSTRAR MODAL
         */

        document.getElementById(
            "modalVistaFicha"
        ).style.display =
            "flex";


    } catch (error) {

        console.error(
            "Error vista previa:",
            error
        );
    }
}


async function editarFicha(id_ficha) {
    const cargaActual = (window.cargaEditarFicha || 0) + 1;
    window.cargaEditarFicha = cargaActual;

    const modal = document.getElementById("modalFicha");

    if (!modal) {
        console.error("No existe modalFicha.");
        return;
    }

    // Ocultar el modal mientras se prepara la ficha nueva.
    modal.style.display = "none";

    // Limpiar los identificadores de la ficha anterior.
    modal.dataset.idFicha = "";
    modal.dataset.idMenu = "";

    // Limpiar los campos básicos.
    document.getElementById("tituloFicha").value = "";
    document.getElementById("resumenFicha").value = "";
    document.getElementById("textoFicha").value = "";
    document.getElementById("visibleFicha").checked = false;
    document.getElementById("imagenFicha").value = "";

    // Limpiar la imagen anterior.
    const imagenAnterior = document.getElementById("imagenActualFicha");
    const contenedorImagenAnterior = document.getElementById(
        "contenedorImagenActual"
    );

    if (imagenAnterior) {
        imagenAnterior.src = "";
        imagenAnterior.style.display = "none";
    }

    if (contenedorImagenAnterior) {
        contenedorImagenAnterior.style.display = "none";
    }

    // Limpiar los campos dinámicos.
    document.querySelectorAll(".campo-dinamico").forEach(campo => {
        campo.value = "";
    });

    // Limpiar el estado de las relaciones anteriores.
    relacionesPendientes = [];
    relacionesEliminadasPendientes = [];

    const botonGuardar = document.getElementById("btnGuardarFicha");

    if (botonGuardar) {
        botonGuardar.textContent = "Cargando ficha...";
    }

    console.log("Editando ficha:", id_ficha);

    try {
        fichaEditando = id_ficha;

        // =====================================================
        // 1. OBTENER LA FICHA
        // =====================================================


        const promesaFicha = window.fetchProtegido(
            `/api/fichas/${id_ficha}`
        );

        const promesaMenus = cargarTiposFicha();

        const respuesta = await promesaFicha;


        if (cargaActual !== window.cargaEditarFicha) return;

        if (!respuesta.ok) {
            console.error(
                "No se pudo obtener la ficha:",
                respuesta.status
            );

            if (botonGuardar) {
                botonGuardar.textContent = "Editar ficha";
            }

            return;
        }

        const ficha = await respuesta.json();

        if (cargaActual !== window.cargaEditarFicha) return;

        console.log("Ficha recibida:", ficha);

        // Guardar los identificadores reales de la ficha.
        modal.dataset.idFicha = String(id_ficha);
        modal.dataset.idMenu = String(ficha.id_menu);

        // =====================================================
        // 2. LEER EL BORRADOR DE ESTA FICHA
        // =====================================================

        const borradorEdicion = window.Borradores?.leer(
            "fichas",
            String(id_ficha)
        )?.datos;

        // =====================================================
        // 3. CARGAR LOS MENÚES
        // =====================================================


        await promesaMenus;

        if (cargaActual !== window.cargaEditarFicha) return;


        const tipoFicha = document.getElementById("tipoFicha");

        if (tipoFicha) {
            tipoFicha.value = String(ficha.id_menu);

            if (tipoFicha.value !== String(ficha.id_menu)) {
                console.warn(
                    "El menú de la ficha no aparece en el selector:",
                    ficha.id_menu
                );
            } else {
                const opcion = tipoFicha.options[
                    tipoFicha.selectedIndex
                ];

                const nombreMenu = opcion
                    ? opcion.textContent.trim()
                    : `Menú ${ficha.id_menu}`;

                const nombreTipo = document.getElementById(
                    "nombreTipoFicha"
                );

                if (nombreTipo) {
                    nombreTipo.textContent = nombreMenu;
                }

                const tituloDatos = document.getElementById(
                    "tituloDatosEspecificos"
                );

                if (tituloDatos) {
                    tituloDatos.textContent =
                        `Datos específicos de ${nombreMenu}`;
                }
            }
        }

        // =====================================================
        // 4. DATOS BÁSICOS
        // El borrador tiene prioridad sobre la base de datos.
        // =====================================================

        document.getElementById("tituloFicha").value =
            borradorEdicion?.titulo ?? ficha.titulo ?? "";

        document.getElementById("resumenFicha").value =
            borradorEdicion?.resumen ?? ficha.resumen ?? "";

        document.getElementById("textoFicha").value =
            borradorEdicion?.texto ?? ficha.texto ?? "";

        document.getElementById("visibleFicha").checked =
            borradorEdicion?.visible ?? (ficha.visible == 1);

        // =====================================================
        // 5. IMAGEN ACTUAL
        // =====================================================

        const imagenActual = document.getElementById(
            "imagenActualFicha"
        );

        const contenedorImagenActual = document.getElementById(
            "contenedorImagenActual"
        );

        if (ficha.imagen) {
            if (imagenActual) {
                imagenActual.src = obtenerRutaImagenFicha(ficha.imagen);
                imagenActual.style.display = "block";
            }

            if (contenedorImagenActual) {
                contenedorImagenActual.style.display = "block";
            }
        } else {
            if (imagenActual) {
                imagenActual.src = "";
                imagenActual.style.display = "none";
            }

            if (contenedorImagenActual) {
                contenedorImagenActual.style.display = "none";
            }
        }

        const labelImagen = document.getElementById("labelImagenFicha");

        if (labelImagen) {
            labelImagen.textContent = "Cambiar imagen";
        }

        document.getElementById("imagenFicha").value = "";

        const tituloModal = document.getElementById("tituloModalFicha");

        if (tituloModal) {
            tituloModal.textContent = "Editar ficha";
        }

        // =====================================================
        // 6. ETIQUETAS
        // =====================================================

        const etiquetasSeleccionadas =
            await obtenerEtiquetasFicha(id_ficha);

        if (cargaActual !== window.cargaEditarFicha) return;

        const selectRelacion = document.getElementById("fichaRelacion");
        const tipoRelacion = document.getElementById("tipoRelacion");

        const tareasCarga = [
            cargarEtiquetasFicha(etiquetasSeleccionadas)
        ];

        if (selectRelacion) {
            selectRelacion.disabled = false;
            tareasCarga.push(cargarFichasDisponibles(id_ficha));
        }

        if (tipoRelacion) {
            tipoRelacion.disabled = false;
        }

        await Promise.all(tareasCarga);

        if (cargaActual !== window.cargaEditarFicha) return;

        // =====================================================
        // 7. FICHAS DISPONIBLES PARA RELACIONAR
        // Ya se cargaron en Promise.all, en el paso 6.
        // =====================================================

        if (tipoRelacion) {
            tipoRelacion.disabled = false;
        }


        // =====================================================
        // 8 y 9. CARGAR RELACIONES Y PLANTILLA EN PARALELO
        // =====================================================

        const [
            respuestaRelaciones,
            plantillaRespuesta
        ] = await Promise.all([
            window.fetchProtegido(
                `/api/relacion-ficha/${id_ficha}`
            ),
            window.fetchProtegido(
                `/api/plantillas/menu/${ficha.id_menu}`
            )
        ]);

        if (cargaActual !== window.cargaEditarFicha) return;

        // -----------------------------------------------------
        // RELACIONES EXISTENTES
        // -----------------------------------------------------

        if (!respuestaRelaciones.ok) {
            console.error("No se pudieron cargar las relaciones");

            relacionesPendientes = [];
            relacionesEliminadasPendientes = [];
        } else {
            const relaciones = await respuestaRelaciones.json();

            if (cargaActual !== window.cargaEditarFicha) return;

            relacionesPendientes = [];
            relacionesEliminadasPendientes = [];

            const fichasYaRelacionadas = new Set();

            relaciones.forEach(relacion => {
                const idDestino = Number(relacion.id_ficha_destino);

                if (!idDestino || fichasYaRelacionadas.has(idDestino)) {
                    return;
                }

                fichasYaRelacionadas.add(idDestino);

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

            if (cargaActual !== window.cargaEditarFicha) return;
        }

        // -----------------------------------------------------
        // PLANTILLA DEL MENÚ
        // -----------------------------------------------------

        if (!plantillaRespuesta.ok) {
            console.error(
                "No se pudo cargar la plantilla del menú:",
                ficha.id_menu
            );

            window.plantillaActual = null;
            generarCampos([]);
        } else {
            const plantilla = await plantillaRespuesta.json();

            if (cargaActual !== window.cargaEditarFicha) return;

            window.plantillaActual = plantilla;

            const campos =
                plantilla.plantilla_json?.estructura?.campos || [];

            generarCampos(campos);
        }


        // =====================================================
        // 10. DATOS DINÁMICOS DE LA BASE DE DATOS
        // =====================================================

        let datos = {};

        try {
            datos = ficha.datos_json
                ? window.interpretarDatosJson(ficha.datos_json)
                : {};
        } catch (error) {
            console.warn("Error leyendo datos_json:", error);
        }

        document.querySelectorAll(".campo-dinamico").forEach(input => {
            const nombre = input.dataset.campo;

            if (nombre && datos[nombre] !== undefined) {
                input.value = datos[nombre];
            }
        });

        // =====================================================
        // 11. RESTAURAR LOS CAMPOS DINÁMICOS DEL BORRADOR
        // =====================================================

        if (borradorEdicion?.camposDinamicos) {
            document.querySelectorAll(".campo-dinamico").forEach(campo => {
                const nombre = campo.dataset.campo;

                if (
                    nombre &&
                    Object.prototype.hasOwnProperty.call(
                        borradorEdicion.camposDinamicos,
                        nombre
                    )
                ) {
                    campo.value = borradorEdicion.camposDinamicos[nombre];
                }
            });
        }

        if (cargaActual !== window.cargaEditarFicha) return;

        // =====================================================
        // 12. FINALIZAR Y MOSTRAR EL MODAL
        // =====================================================

        if (botonGuardar) {
            botonGuardar.textContent = "Actualizar ficha";
        }

        modal.style.display = "flex";

        console.log(
            borradorEdicion
                ? "Ficha cargada con su borrador."
                : "Ficha cargada desde la base de datos."
        );

    } catch (error) {
        // No mostrar errores de una carga que ya quedó obsoleta.
        if (cargaActual !== window.cargaEditarFicha) return;

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

    document.getElementById(
        "modalVistaFicha"
    ).style.display =
        "none";
}


/* =========================================================
   MULTIMEDIA
========================================================= */

function verMultimediaFicha(id_ficha, titulo) {

    console.log("VER MULTIMEDIA FICHA:", {
        id_ficha,
        titulo
    });

    fichaSeleccionada = id_ficha;
    nombreFichaSeleccionada = titulo || "";

    cargarVentana("multimedia", true);
}


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

    document.addEventListener("input", (e) => {
        if (e.target.closest("#modalFicha")) {
            guardarBorradorFicha();
        }
    });

    document.addEventListener("change", (e) => {
        if (e.target.closest("#modalFicha")) {
            guardarBorradorFicha();
        }
    });
}



/* =========================================================
   NUEVA FICHA
========================================================= */

async function abrirNuevaFicha() {

    console.log(
        "Nueva ficha. Menú seleccionado:",
        menuSeleccionado
    );




    // Recuperar automáticamente el menú del borrador
    // más reciente al pulsar Nueva ficha.
    if (!menuSeleccionado && window.Borradores) {
        const borradores = window.Borradores.obtenerTodos("fichas");

        const borradorNuevo = borradores.find(borrador =>
            String(borrador.idRegistro ?? "").startsWith("nuevo-menu-")
        );

        if (borradorNuevo) {
            const clave = String(borradorNuevo.idRegistro);
            menuSeleccionado = clave.substring("nuevo-menu-".length);

            const modalFicha = document.getElementById("modalFicha");

            if (modalFicha) {
                modalFicha.dataset.origenBorrador = "general";
            }

            console.log(
                "Reabriendo borrador de ficha del menú:",
                menuSeleccionado
            );
        }
    }



    /*
     * =====================================================
     * SI ESTAMOS DENTRO DE UN MENÚ
     * =====================================================
     */

    if (menuSeleccionado) {

        try {

            const idMenu =
                String(
                    menuSeleccionado
                );


            const respuesta =
                await window.fetchProtegido(
                    `/api/plantillas/menu/${idMenu}`
                );


            if (!respuesta.ok) {

                console.error(
                    "No se pudo cargar la plantilla del menú."
                );


                mostrarMensaje(
                    "Error",
                    "No se pudo cargar la plantilla de este menú."
                );


                return;
            }


            const plantilla =
                await respuesta.json();


            window.plantillaActual =
                plantilla;


            const campos =
                plantilla
                    .plantilla_json
                    ?.estructura
                    ?.campos || [];


            generarCampos(
                campos
            );


            const modalFicha =
                document.getElementById(
                    "modalFicha"
                );


            if (!modalFicha) {

                return;
            }


            /*
             * MENÚ ASOCIADO
             */

            modalFicha.dataset.idFicha =
                "";

            modalFicha.dataset.idMenu =
                idMenu;


            /*
             * SELECT
             */

            const tipoFicha =
                document.getElementById(
                    "tipoFicha"
                );


            if (tipoFicha) {

                await cargarTiposFicha();

                tipoFicha.value =
                    idMenu;


                const opcion =
                    tipoFicha.options[
                        tipoFicha.selectedIndex
                    ];


                const nombre =
                    opcion
                        ? opcion.textContent.trim()
                        : nombreMenuSeleccionado;


                const nombreTipo =
                    document.getElementById(
                        "nombreTipoFicha"
                    );


                if (nombreTipo) {

                    nombreTipo.textContent =
                        nombre;
                }


                const tituloDatos =
                    document.getElementById(
                        "tituloDatosEspecificos"
                    );


                if (tituloDatos) {

                    tituloDatos.textContent =
                        `Datos específicos de ${nombre}`;
                }
            }


            /*
             * ESTADO
             */

            fichaEditando =
                null;

            relacionesPendientes = [];

            relacionesEliminadasPendientes = [];


            document.getElementById(
                "btnGuardarFicha"
            ).textContent =
                "Guardar ficha";


            document.getElementById(
                "tituloModalFicha"
            ).textContent =
                "Nueva ficha";


            /*
             * LIMPIAR DATOS
             */

            document.getElementById(
                "tituloFicha"
            ).value =
                "";


            document.getElementById(
                "resumenFicha"
            ).value =
                "";


            document.getElementById(
                "textoFicha"
            ).value =
                "";


            document.getElementById(
                "imagenFicha"
            ).value =
                "";


            document.getElementById(
                "labelImagenFicha"
            ).textContent =
                "Seleccionar imagen";


            /*
             * IMAGEN ACTUAL
             */

            const imagenActual =
                document.getElementById(
                    "imagenActualFicha"
                );


            if (imagenActual) {

                imagenActual.src =
                    "";

                imagenActual.style.display =
                    "none";
            }


            const contenedorImagenActual =
                document.getElementById(
                    "contenedorImagenActual"
                );


            if (contenedorImagenActual) {

                contenedorImagenActual.style.display =
                    "none";
            }


            /*
             * VISIBLE
             */

            document.getElementById(
                "visibleFicha"
            ).checked =
                true;


            /*
             * CAMPOS DINÁMICOS
             */

            document
                .querySelectorAll(
                    ".campo-dinamico"
                )
                .forEach(campo => {

                    campo.value =
                        "";
                });


            /*
             * ETIQUETAS
             */

            await cargarEtiquetasFicha();


            /*
             * RELACIONES
             */

            const selectRelacion =
                document.getElementById(
                    "fichaRelacion"
                );


            const tipoRelacion =
                document.getElementById(
                    "tipoRelacion"
                );


            if (selectRelacion) {

                selectRelacion.disabled =
                    false;


                await cargarFichasDisponibles();
            }


            if (tipoRelacion) {

                tipoRelacion.disabled =
                    false;
            }


            mostrarRelacionesPendientes();


            /*
             * ABRIR MODAL
             */

            modalFicha.style.display =
                "flex";

            // Recuperar el borrador guardado para este menú.
const borradorRecuperado = recuperarBorradorFicha();

if (borradorRecuperado) {
    console.log("Borrador de ficha recuperado.");
}


        } catch (error) {

            console.error(
                "Error abriendo nueva ficha:",
                error
            );


            mostrarMensaje(
                "Error",
                "No se pudo abrir el formulario de nueva ficha."
            );
        }


        return;
    }


    /*
     * =====================================================
     * GESTIÓN GENERAL DE FICHAS
     * =====================================================
     */

    console.log(
        "Abriendo selector de tipo"
    );


    const modal =
        document.getElementById(
            "modalTipoFicha"
        );


    if (modal) {

        modal.style.display =
            "flex";


        await cargarTiposFicha();
    }
}


/*
 * =========================================================
 * EVENTO NUEVA FICHA
 *
 * Se protege para que no se registre varias veces
 * cuando panel.js vuelve a cargar fichas.js.
 * =========================================================
 */

if (!window.__fichasEventoNuevaRegistrado) {

    document.addEventListener(
        "click",
        async function(e) {

            const boton =
                e.target.closest(
                    "#nuevaFicha"
                );


            if (!boton) {
                return;
            }


            e.preventDefault();


            await abrirNuevaFicha();
        }
    );


    window.__fichasEventoNuevaRegistrado =
        true;
}


/* =========================================================
   CERRAR MODAL FICHA
========================================================= */

function cerrarFicha() {
    const modal = document.getElementById("modalFicha");

    if (!modal) return;

    const clave = obtenerClaveBorradorFicha();

    if (window.Borradores && clave) {
        window.Borradores.eliminar("fichas", clave);
    }

    // Cerrar el formulario.
    modal.style.display = "none";

    // Si estábamos creando una ficha desde Gestión general,
    // limpiar el menú recuperado del borrador.
    if (modal.dataset.origenBorrador === "general") {
        menuSeleccionado = null;
        nombreMenuSeleccionado = "";
    }

    delete modal.dataset.origenBorrador;
}




/* =========================================================
   GUARDAR FICHA
========================================================= */

async function guardarFicha() {

    if (window.guardandoFicha) {
        return;
    }

    window.guardandoFicha = true;

    const modalFicha =
        document.getElementById(
            "modalFicha"
        );


    if (!modalFicha) {

        console.error(
            "No existe modalFicha."
        );

        window.guardandoFicha = false;

        return;
    }


    const id_ficha =
        modalFicha.dataset.idFicha || "";

    const claveBorradorFicha = obtenerClaveBorradorFicha();


    const titulo =
        document.getElementById(
            "tituloFicha"
        ).value.trim();


    if (titulo === "") {

        mostrarMensaje(
            "Campos obligatorios",
            "Debe ingresar un título para la ficha."
        );


        document.getElementById(
            "tituloFicha"
        ).focus();

        window.guardandoFicha = false;
        return;
    }


    const formulario =
        new FormData();


    /*
     * =====================================================
     * DATOS DINÁMICOS
     * =====================================================
     */

    const datos = {};


    document
        .querySelectorAll(
            ".campo-dinamico"
        )
        .forEach(campo => {

            datos[
                campo.dataset.campo
            ] =
                campo.value;
        });


    /*
     * =====================================================
     * MENÚ DE LA FICHA
     * =====================================================
     *
     * ORDEN DE PRIORIDAD:
     *
     * 1. dataset.idMenu del modal
     * 2. menú seleccionado
     * 3. select tipoFicha
     *
     * El dataset es el más importante porque identifica
     * el menú al que realmente pertenece la ficha.
     */

    let id_menu = "";


    if (modalFicha.dataset.idMenu) {

        id_menu =
            modalFicha.dataset.idMenu;

    } else if (menuSeleccionado) {

        id_menu =
            String(
                menuSeleccionado
            );

    } else {

        id_menu =
            document.getElementById(
                "tipoFicha"
            )?.value || "";
    }


    console.log(
        "========== GUARDANDO FICHA =========="
    );


    console.log(
        "menuSeleccionado:",
        menuSeleccionado
    );


    console.log(
        "dataset.idMenu:",
        modalFicha.dataset.idMenu
    );


    console.log(
        "tipoFicha:",
        document.getElementById(
            "tipoFicha"
        )?.value
    );


    console.log(
        "id_menu FINAL:",
        id_menu
    );


    /*
     * VALIDAR MENÚ
     */

    if (!id_menu) {

        mostrarMensaje(
            "Menú requerido",
            "Debe seleccionar un menú para la ficha."
        );

        window.guardandoFicha = false;


        return;
    }


    /*
     * DATOS GENERALES
     */

    formulario.append(
        "id_menu",
        String(id_menu)
    );


    formulario.append(
        "titulo",
        titulo
    );


    formulario.append(
        "resumen",
        document.getElementById(
            "resumenFicha"
        ).value
    );


    formulario.append(
        "texto",
        document.getElementById(
            "textoFicha"
        ).value
    );


    formulario.append(
        "visible",
        document.getElementById(
            "visibleFicha"
        ).checked
            ? 1
            : 0
    );


    formulario.append(
        "datos_json",
        JSON.stringify(datos)
    );


    /*
     * =====================================================
     * IMAGEN
     * =====================================================
     *
     * Se utiliza directamente la imagen seleccionada.
     * No se realiza ningún recorte ni ajuste.
     */

    const imagen =
        document.getElementById(
            "imagenFicha"
        ).files[0];

    if (imagen) {

        formulario.append(
            "imagen",
            imagen
        );
    }


    try {

        let url =
            "/api/fichas";

        let metodo =
            "POST";


        /*
         * EDITAR
         */

        if (id_ficha) {

            url =
                `/api/fichas/${id_ficha}`;

            metodo =
                "PUT";
        }


        const respuesta =
            await window.fetchProtegido(
                url,
                {
                    method: metodo,
                    body: formulario
                }
            );


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            mostrarMensaje(
                "No se pudo guardar",
                resultado.error ||
                "Ocurrió un error al guardar la ficha."
            );


            return;
        }


        const idGuardado =
            id_ficha ||
            resultado.id_ficha;


        fichaEditando =
            idGuardado;


        /*
         * =====================================================
         * ETIQUETAS
         * =====================================================
         */

        await guardarEtiquetasFicha(
            idGuardado
        );


        /* =====================================================
           RELACIONES
        ===================================================== */

        /*
         * Primero eliminamos de la BD las relaciones
         * que el usuario quitó con la X.
         */

        /* =====================================================
           RELACIONES
        ===================================================== */


        /*
         * =====================================================
         * 1. ELIMINAR RELACIONES QUITADAS
         * =====================================================
         */

        for (
            const idRelacion
            of relacionesEliminadasPendientes
        ) {

            try {

                const respuestaEliminar =
                    await window.fetchProtegido(

                        `/api/relacion-ficha/${idRelacion}`,

                        {
                            method: "DELETE"
                        }
                    );


                if (!respuestaEliminar.ok) {
                    throw new Error(
                        `No se pudo eliminar la relación ${idRelacion}.`
                    );
                }

            } catch (error) {
                throw error;
            }
        }


        /*
         * =====================================================
         * 2. SOLO RELACIONES NUEVAS
         * =====================================================
         *
         * Las que tienen id_relacion ya existían en BD.
         *
         * Las que tienen id_relacion === null son nuevas.
         */

        const relacionesNuevas =
            relacionesPendientes
                .filter(
                    relacion =>
                        !relacion.id_relacion
                )
                .map(
                    relacion => ({

                        id_ficha_destino:
                            relacion.id_ficha_destino,

                        tipo_relacion:
                            relacion.tipo_relacion

                    })
                );


        /*
         * =====================================================
         * 3. GUARDAR NUEVAS RELACIONES
         * =====================================================
         */

        if (
            relacionesNuevas.length > 0
        ) {

            const respuestaRelaciones =
                await window.fetchProtegido(

                    `/api/relacion-ficha/${idGuardado}`,

                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            relaciones:
                                relacionesNuevas

                        })
                    }
                );


            if (!respuestaRelaciones.ok) {
                throw new Error(
                    "No se pudieron guardar las relaciones de la ficha."
                );
            }
        }



        /*
         * =====================================================
         * LIMPIAR
         * =====================================================
         */

        relacionesPendientes = [];

        relacionesEliminadasPendientes = [];

        fichaEditando = null;

        // Eliminar el borrador después de guardar la ficha.
        if (window.Borradores && claveBorradorFicha) {
            window.Borradores.eliminar(
                "fichas",
                claveBorradorFicha
            );
        }


        cerrarFicha();


        modalFicha.dataset.idFicha =
            "";


        modalFicha.dataset.idMenu =
            "";


        document.getElementById(
            "btnGuardarFicha"
        ).textContent =
            "Guardar ficha";


        /*
         * IMPORTANTE:
         *
         * Después de guardar mantenemos la vista actual.
         * Si estamos dentro de un menú, se muestran solamente
         * las fichas de ese menú.
         */

        await cargarFichas();


    } catch (error) {

        console.error(
            "Error guardando ficha:",
            error
        );

        mostrarMensaje(
            "Error",
            "Ocurrió un error al guardar la ficha."
        );

    } finally {
        window.guardandoFicha = false;
    }
}


/* =========================================================
   ELIMINAR FICHA
========================================================= */

async function eliminarFicha(id_ficha) {

    console.log(
        "BOTON ELIMINAR PRESIONADO:",
        id_ficha
    );


    const confirmar =
        confirm(
            "¿Eliminar esta ficha?"
        );


    if (!confirmar) {
        return;
    }


    try {

        const respuesta =
            await window.fetchProtegido(
                `/api/fichas/${id_ficha}`,
                {
                    method: "DELETE"
                }
            );


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            alert(
                resultado.error
            );


            return;
        }


        alert(
            resultado.mensaje
        );


        cargarFichas();


    } catch (error) {

        console.error(
            "Error guardando ficha:",
            error
        );

        mostrarMensaje(
            "Error",
            "Ocurrió un error al guardar la ficha."
        );

    } finally {
        window.guardandoFicha = false;
    }
}


/* =========================================================
   CERRAR MULTIMEDIA
========================================================= */

function cerrarMultimedia() {

    document.getElementById(
        "modalMultimedia"
    ).style.display =
        "none";
}


/* =========================================================
   CAMBIO DE TIPO DE FICHA
========================================================= */

async function cambioTipoFicha(
    e
) {

    if (
        !e ||
        !e.target ||
        e.target.id !== "tipoFicha"
    ) {
        return;
    }


    const id_menu =
        e.target.value;


    const opcion =
        e.target.options[
            e.target.selectedIndex
        ];


    const nombre =
        opcion
            ? opcion.textContent.trim()
            : "";


    const nombreTipo =
        document.getElementById(
            "nombreTipoFicha"
        );


    if (nombreTipo) {

        nombreTipo.textContent =
            nombre;
    }


    const tituloDatos =
        document.getElementById(
            "tituloDatosEspecificos"
        );


    if (tituloDatos) {

        tituloDatos.textContent =
            `Datos específicos de ${nombre}`;
    }


    if (!id_menu) {

        document.getElementById(
            "camposDinamicos"
        ).innerHTML =
            "";


        return;
    }


    try {

        const respuesta =
            await window.fetchProtegido(
                `/api/plantillas/menu/${id_menu}`
            );


        if (!respuesta.ok) {

            console.error(
                "No se pudo cargar la plantilla."
            );


            return;
        }


        const plantilla =
            await respuesta.json();


        window.plantillaActual =
            plantilla;


        const campos =
            plantilla
                .plantilla_json
                ?.estructura
                ?.campos || [];


        generarCampos(
            campos
        );


        /*
         * =====================================================
         * ABRIR FORMULARIO PARA NUEVA FICHA
         * =====================================================
         */

        cerrarTipoFicha();


        const modalFicha =
            document.getElementById(
                "modalFicha"
            );


        modalFicha.style.display =
            "flex";


        /*
         * El menú elegido queda guardado en el modal.
         */

        modalFicha.dataset.idFicha =
            "";


        modalFicha.dataset.idMenu =
            String(id_menu);


        fichaEditando =
            null;


        relacionesPendientes = [];

        relacionesEliminadasPendientes = [];


        document.getElementById(
            "btnGuardarFicha"
        ).textContent =
            "Guardar ficha";


        document.getElementById(
            "tituloModalFicha"
        ).textContent =
            "Nueva ficha";


        /*
         * LIMPIAR FORMULARIO
         */

        document.getElementById(
            "tituloFicha"
        ).value =
            "";


        document.getElementById(
            "resumenFicha"
        ).value =
            "";


        document.getElementById(
            "textoFicha"
        ).value =
            "";


        document.getElementById(
            "imagenFicha"
        ).value =
            "";


        document.getElementById(
            "labelImagenFicha"
        ).textContent =
            "Seleccionar imagen";


        /*
         * IMAGEN ACTUAL
         */

        const imagenActual =
            document.getElementById(
                "imagenActualFicha"
            );


        if (imagenActual) {

            imagenActual.src =
                "";


            imagenActual.style.display =
                "none";
        }


        const contenedorImagenActual =
            document.getElementById(
                "contenedorImagenActual"
            );


        if (contenedorImagenActual) {

            contenedorImagenActual.style.display =
                "none";
        }


        /*
         * VISIBLE
         */

        document.getElementById(
            "visibleFicha"
        ).checked =
            true;


        /*
         * CAMPOS DINÁMICOS
         */

        document
            .querySelectorAll(
                ".campo-dinamico"
            )
            .forEach(campo => {

                campo.value =
                    "";
            });


        /*
         * ETIQUETAS
         */

        await cargarEtiquetasFicha();


        /*
         * RELACIONES
         */

        const selectRelacion =
            document.getElementById(
                "fichaRelacion"
            );


        const tipoRelacion =
            document.getElementById(
                "tipoRelacion"
            );


        if (selectRelacion) {

            selectRelacion.disabled =
                false;


            await cargarFichasDisponibles();
        }


        if (tipoRelacion) {

            tipoRelacion.disabled =
                false;
        }


        mostrarRelacionesPendientes();

// Recuperar el borrador correspondiente al menú elegido.
const borradorRecuperado = recuperarBorradorFicha();

if (borradorRecuperado) {
    console.log("Borrador de ficha recuperado.");
}

} catch (error) {

        console.error(
            "Error cargando plantilla:",
            error
        );
    }
}


/*
 * =========================================================
 * EVENTO CHANGE
 *
 * Se registra una sola vez.
 * =========================================================
 */

if (!window.__fichasEventoTipoRegistrado) {

    document.addEventListener(
        "change",
        cambioTipoFicha
    );


    window.__fichasEventoTipoRegistrado =
        true;
}


/* =========================================================
   CARGAR TIPOS DE FICHA / MENÚES
========================================================= */

async function cargarTiposFicha() {

    try {

        const respuesta =
            await window.fetchProtegido(
                "/api/menus"
            );


        if (!respuesta.ok) {

            console.error(
                "Error obteniendo menús:",
                respuesta.status
            );


            return;
        }


        const menus =
            await respuesta.json();


        const select =
            document.getElementById(
                "tipoFicha"
            );


        if (!select) {

            console.error(
                "No existe tipoFicha"
            );


            return;
        }


        select.innerHTML = `
            <option value="">
                Seleccionar...
            </option>
        `;


        menus.forEach(menu => {

            const opcion =
                document.createElement(
                    "option"
                );


            opcion.value =
                menu.id_menu;


            opcion.textContent =
                menu.nombre;


            select.appendChild(
                opcion
            );
        });


    } catch (error) {

        console.error(
            "Error cargando tipos:",
            error
        );
    }
}


/* =========================================================
   GENERAR CAMPOS DINÁMICOS
========================================================= */

function generarCampos(campos) {

    const contenedor =
        document.getElementById(
            "camposDinamicos"
        );


    if (!contenedor) {

        console.error(
            "No existe camposDinamicos."
        );


        return;
    }


    contenedor.innerHTML =
        "";


    if (
        !campos ||
        campos.length === 0
    ) {

        contenedor.innerHTML =
            "<p>No hay atributos definidos para este tipo</p>";


        return;
    }


    campos.forEach(campo => {

        contenedor.innerHTML += `

            <div class="campo-dinamico-item">

                <label>
                    ${
                        campo.etiqueta ||
                        campo.nombre
                    }
                </label>


                <input
                    type="${campo.tipo || "text"}"
                    class="campo-dinamico"
                    data-campo="${campo.nombre}"
                >

            </div>

        `;
    });
}


/* =========================================================
   CERRAR TIPO FICHA
========================================================= */

function cerrarTipoFicha() {

    const modal =
        document.getElementById(
            "modalTipoFicha"
        );


    if (modal) {

        modal.style.display =
            "none";
    }
}


/* =========================================================
   VOLVER MENÚS
========================================================= */

function volverMenus() {

    menuSeleccionado =
        null;


    nombreMenuSeleccionado =
        "";


    cargarVentana(
        "menus"
    );
}


/* =========================================================
   ELIMINAR FICHA - MODAL
========================================================= */

function abrirEliminarFicha(id) {

    fichaEliminar =
        id;


    document.getElementById(
        "modalEliminarFicha"
    ).style.display =
        "flex";
}


function cerrarEliminarFicha() {

    fichaEliminar =
        null;


    document.getElementById(
        "modalEliminarFicha"
    ).style.display =
        "none";
}


async function confirmarEliminarFicha() {

    if (!fichaEliminar) {
        return;
    }


    try {

        const respuesta =
            await window.fetchProtegido(

                `/api/fichas/${fichaEliminar}`,

                {
                    method: "DELETE"
                }
            );


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            cerrarEliminarFicha();


            mostrarMensaje(
                "Error",
                resultado.error
            );


            return;
        }


        cerrarEliminarFicha();


        await cargarFichas();


    } catch (error) {

        console.error(
            error
        );
    }
}



/* =========================================================
   CERRAR MENSAJE FICHA
========================================================= */

function cerrarMensajeFicha() {

    const modal =
        document.getElementById(
            "modalMensajeFicha"
        );


    if (modal) {

        modal.style.display =
            "none";
    }
}


/* =========================================================
   ETIQUETAS
========================================================= */

async function cargarEtiquetasFicha(
    seleccionadas = []
) {

    try {

        const respuesta =
            await window.fetchProtegido(
                "/api/etiquetas"
            );


        if (!respuesta.ok) {

            console.error(
                "No se pudieron cargar las etiquetas."
            );


            return;
        }


        const etiquetas =
            await respuesta.json();


        const contenedor =
            document.getElementById(
                "listaEtiquetasFicha"
            );


        if (!contenedor) {
            return;
        }


        contenedor.innerHTML =
            "";


        etiquetas.forEach(etiqueta => {

            contenedor.innerHTML += `

                <label
                    class="item-etiqueta ${
                        etiqueta.activo
                            ? ""
                            : "etiqueta-desactivada"
                    }"
                >

                    <input
                        type="checkbox"
                        class="checkbox-etiqueta"
                        value="${etiqueta.id_etiqueta}"

                        ${
                            seleccionadas.includes(
                                etiqueta.id_etiqueta
                            )
                                ? "checked"
                                : ""
                        }
                    >

                    ${etiqueta.nombre}

                </label>

            `;
        });


    } catch (error) {

        console.error(
            "Error cargando etiquetas:",
            error
        );
    }
}


async function obtenerEtiquetasFicha(
    idFicha
) {

    const respuesta =
        await window.fetchProtegido(
            `/api/fichas/${idFicha}/etiquetas`
        );


    if (!respuesta.ok) {
        return [];
    }


    const etiquetas =
        await respuesta.json();


    return etiquetas.map(
        etiqueta =>
            etiqueta.id_etiqueta
    );
}


function obtenerEtiquetasSeleccionadas() {

    return Array.from(
        document.querySelectorAll(
            ".checkbox-etiqueta:checked"
        )
    ).map(
        checkbox =>
            Number(
                checkbox.value
            )
    );
}


async function guardarEtiquetasFicha(
    idFicha
) {

    const etiquetas =
        obtenerEtiquetasSeleccionadas();


    const respuesta =
        await window.fetchProtegido(

            `/api/fichas/${idFicha}/etiquetas`,

            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    etiquetas:
                        etiquetas
                })
            }
        );


    if (!respuesta.ok) {

        console.error(
            "No se pudieron guardar las etiquetas."
        );
    }
}


/* =========================================================
   FICHAS DISPONIBLES PARA RELACIONAR
========================================================= */

async function cargarFichasDisponibles(
    idActual
) {

    try {

        const respuesta =
            await window.fetchProtegido(
                "/api/fichas"
            );


        if (!respuesta.ok) {
            return;
        }


        const fichas =
            await respuesta.json();


        const select =
            document.getElementById(
                "fichaRelacion"
            );


        if (!select) {
            return;
        }


        select.innerHTML = `
            <option value="">
                Seleccionar ficha...
            </option>
        `;


        fichas.forEach(ficha => {

            if (
                ficha.id_ficha !=
                idActual
            ) {

                select.innerHTML += `

                    <option
                        value="${ficha.id_ficha}"
                    >
                        ${ficha.titulo}
                    </option>

                `;
            }
        });


    } catch (error) {

        console.error(
            "Error cargando fichas disponibles:",
            error
        );
    }
}


/* =========================================================
   CARGAR RELACIONES
========================================================= */

async function cargarRelacionesFicha(
    id_ficha
) {

    const respuesta =
        await window.fetchProtegido(
            `/api/relacion-ficha/${id_ficha}`
        );


    if (!respuesta.ok) {
        return;
    }


    const relaciones =
        await respuesta.json();


    const contenedor =
        document.getElementById(
            "listaRelacionesFicha"
        );


    if (!contenedor) {
        return;
    }


    contenedor.innerHTML =
        "";


    if (relaciones.length === 0) {

        contenedor.innerHTML = `
            <p>
                No hay fichas relacionadas
            </p>
        `;


        return;
    }


    relaciones.forEach(relacion => {

        contenedor.innerHTML += `

            <div class="item-relacion-ficha">

                <span>
                    ${
                        relacion.ficha_relacionada ||
                        relacion.titulo ||
                        `Ficha ${relacion.id_ficha_destino}`
                    }
                </span>


                <small>
                    ${relacion.tipo_relacion}
                </small>


                <button
                    class="btn-eliminar"

                    onclick="
                        eliminarRelacionFicha(
                            ${relacion.id_relacion}
                        )
                    "
                >
                    ✖
                </button>

            </div>

        `;
    });
}

async function agregarRelacionFicha() {

    const select =
        document.getElementById("fichaRelacion");

    if (!select) {
        return;
    }

    const destino =
        Number(select.value);

    const tipo =
        document.getElementById("tipoRelacion")?.value;


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


    /*
     * =====================================================
     * ¿YA EXISTE ACTUALMENTE?
     * =====================================================
     */

    const yaExiste =
        relacionesPendientes.some(
            relacion =>
                Number(relacion.id_ficha_destino) === destino
        );


    if (yaExiste) {

        mostrarMensaje(
            "Ficha ya relacionada",
            "Esta ficha ya está relacionada. No puede relacionarse con la misma ficha más de una vez."
        );

        select.value = "";

        return;
    }


    /*
     * =====================================================
     * SI EXISTÍA EN BD Y FUE ELIMINADA
     *
     * Quitamos su ID de la lista de eliminaciones.
     *
     * De esta forma, si el usuario elimina una relación
     * y después se arrepiente antes de guardar, no se
     * elimina de la BD.
     * =====================================================
     */

    const relacionesEliminadasFiltradas =
        [];

    for (
        const idRelacion
        of relacionesEliminadasPendientes
    ) {

        /*
         * No podemos saber el destino solamente con el ID
         * de relación, por eso buscamos primero la relación
         * original si todavía existe en memoria.
         */

        relacionesEliminadasFiltradas.push(
            idRelacion
        );
    }


    /*
     * =====================================================
     * OBTENER TÍTULO
     * =====================================================
     */

    const opcion =
        select.options[
            select.selectedIndex
        ];

    const titulo =
        opcion
            ? opcion.textContent.trim()
            : `Ficha ${destino}`;


    /*
     * =====================================================
     * AGREGAR RELACIÓN NUEVA
     * =====================================================
     */

    relacionesPendientes.push({

        id_relacion: null,

        id_ficha_destino:
            destino,

        tipo_relacion:
            tipo,

        titulo:
            titulo

    });


    await mostrarRelacionesPendientes();


    select.value = "";


    const tipoRelacion =
        document.getElementById(
            "tipoRelacion"
        );

    if (tipoRelacion) {
        tipoRelacion.value = "";
    }
}

/* =========================================================
   MOSTRAR RELACIONES PENDIENTES
   MINI FICHAS
========================================================= */

const cacheFichasRelacionadas = new Map();

async function mostrarRelacionesPendientes() {
    const contenedor = document.getElementById("listaRelacionesFicha");

    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (!relacionesPendientes || relacionesPendientes.length === 0) {
        contenedor.innerHTML =
            "<span class='sin-relaciones'>No hay relaciones agregadas</span>";
        return;
    }

    // Evitar relaciones duplicadas.
    const unicas = [];
    const idsUsados = new Set();

    relacionesPendientes.forEach(relacion => {
        const idDestino = Number(relacion.id_ficha_destino);

        if (!idDestino || idsUsados.has(idDestino)) return;

        idsUsados.add(idDestino);
        unicas.push(relacion);
    });

    relacionesPendientes = unicas;

    // Consultar en paralelo y reutilizar datos ya obtenidos.
    const fichasCompletas = await Promise.all(
        relacionesPendientes.map(async relacion => {
            const id = String(relacion.id_ficha_destino);

            try {
                let promesa = cacheFichasRelacionadas.get(id);

                if (!promesa) {
                    promesa = window.fetchProtegido(`/api/fichas/${id}`)
                        .then(async respuesta => {
                            if (!respuesta.ok) {
                                throw new Error(`Error cargando ficha ${id}`);
                            }

                            return await respuesta.json();
                        });

                    cacheFichasRelacionadas.set(id, promesa);
                }

                const ficha = await promesa;

                return {
                    ...relacion,
                    titulo: ficha.titulo || relacion.titulo || "Sin título",
                    imagen: ficha.imagen || null,
                    visible: ficha.visible
                };
            } catch (error) {
                // Si falla la consulta, permitir reintentar más adelante.
                cacheFichasRelacionadas.delete(id);

                console.error("Error obteniendo ficha relacionada:", error);

                return relacion;
            }
        })
    );

    // Evitar mostrar resultados si las relaciones cambiaron durante la carga.
    if (
        fichasCompletas.length !== relacionesPendientes.length ||
        fichasCompletas.some((ficha, i) =>
            Number(ficha.id_ficha_destino) !==
            Number(relacionesPendientes[i]?.id_ficha_destino)
        )
    ) {
        return;
    }

    contenedor.innerHTML = fichasCompletas.map((relacion, index) => {
        const imagen = relacion.imagen
            ? (
                /^(https?:|data:)/i.test(relacion.imagen)
                    ? relacion.imagen
                    : "/" + relacion.imagen.replace(/^\/+/, "").replace("public/", "")
            )
            : "/imagenes/default.png";

        return `
            <article class="mini-ficha-relacion ${
                relacion.visible == 0 ? "mini-ficha-desactivada" : ""
            }">
                <div class="mini-ficha-imagen">
                    <img
                        src="${imagen}"
                        alt="${relacion.titulo || "Ficha"}"
                        onerror="this.onerror=null;this.src='/imagenes/default.png';"
                    >
                </div>

                <div class="mini-ficha-contenido">
                    <span class="mini-ficha-id">
                        FICHA #${relacion.id_ficha_destino}
                    </span>

                    <h4>${relacion.titulo || "Sin título"}</h4>

                    <span class="mini-ficha-tipo">
                        ${relacion.tipo_relacion || "Sin relación"}
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

async function eliminarRelacionFichaEditar(
    index
) {

    const relacion =
        relacionesPendientes[index];


    if (!relacion) {
        return;
    }


    /*
     * Si existe en BD, guardamos su ID
     * para eliminarla cuando se actualice.
     */

    if (
        relacion.id_relacion &&
        !relacionesEliminadasPendientes.includes(
            relacion.id_relacion
        )
    ) {

        relacionesEliminadasPendientes.push(
            relacion.id_relacion
        );
    }


    /*
     * La quitamos solamente de la memoria.
     */

    relacionesPendientes.splice(
        index,
        1
    );


    /*
     * Actualizamos visualmente.
     */

    await mostrarRelacionesPendientes();
}


/* =========================================================
   ELIMINAR RELACIÓN PENDIENTE
========================================================= */

function eliminarRelacionPendiente(
    index
) {

    relacionesPendientes.splice(
        index,
        1
    );


    mostrarRelacionesPendientes();
}


/* =========================================================
   FECHA ARGENTINA
========================================================= */


/* =========================================================
   FECHA ARGENTINA
========================================================= */

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

    const fechaFormateada =
        valor.toLocaleDateString("es-AR");

    const horaFormateada =
        valor.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        });

    return `${fechaFormateada} — ${horaFormateada}`;
}



/* =========================================================
   MENSAJE
========================================================= */

function mostrarMensaje(
    titulo,
    mensaje
) {

    const modal =
        document.getElementById(
            "modalMensajeFicha"
        );


    if (!modal) {

        alert(
            `${titulo}\n\n${mensaje}`
        );


        return;
    }


    document.getElementById(
        "tituloMensaje"
    ).textContent =
        titulo;


    document.getElementById(
        "textoMensaje"
    ).textContent =
        mensaje;


    modal.style.display =
        "flex";
}