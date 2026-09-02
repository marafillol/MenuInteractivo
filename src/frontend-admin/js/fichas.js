console.log("Modulo fichas cargado");

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


        fichas.forEach(ficha => {

            console.log(ficha);

            contenedor.innerHTML += `

                <article class="ficha-tarjeta ${
                    ficha.visible == 0
                        ? "ficha-desactivada"
                        : ""
                }">

                    <div class="ficha-imagen">

                        <img
                            src="/${
                                ficha.imagen
                                    ? ficha.imagen.replace(
                                        "public/",
                                        ""
                                    )
                                    : "imagenes/default.png"
                            }"

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
                            ${
                                ficha.titulo ||
                                "Sin título"
                            }
                        </h3>


                        <p>
                            ${
                                (
                                    ficha.resumen ||
                                    "Sin descripción"
                                ).replace(
                                    /\n/g,
                                    " "
                                )
                            }
                        </p>


                        <div class="ficha-acciones">

                            <button
                                class="ficha-btn-vista"
                                onclick="
                                    vistaPreviaFicha(
                                        ${ficha.id_ficha}
                                    )
                                "
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
                                        onclick="
                                            editarFicha(
                                                ${ficha.id_ficha}
                                            )
                                        "
                                    >
                                        Editar
                                    </button>


                                    <button
                                        class="ficha-btn-eliminar"
                                        onclick="
                                            abrirEliminarFicha(
                                                ${ficha.id_ficha}
                                            )
                                        "
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


        document.getElementById(
            "vpFichaMenu"
        ).textContent =
            ficha.id_menu;


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

            imagen.src =
                "/" +
                ficha.imagen.replace(
                    "public/",
                    ""
                );

        } else {

            imagen.src =
                "/imagenes/default.png";
        }


        /*
         * DATOS DINÁMICOS
         */

        const contenedor =
            document.getElementById(
                "vpCamposDinamicos"
            );


        contenedor.innerHTML =
            "";


        const respuestaPlantilla =
            await window.fetchProtegido(
                `/api/plantillas/menu/${ficha.id_menu}`
            );


        if (respuestaPlantilla.ok) {

            const plantilla =
                await respuestaPlantilla.json();


            let datos = {};


            try {

                datos =
                    ficha.datos_json
                        ? JSON.parse(
                            ficha.datos_json
                        )
                        : {};

            } catch (error) {

                console.warn(
                    "Error leyendo datos_json:",
                    error
                );
            }


            const campos =
                plantilla
                    .plantilla_json
                    ?.estructura
                    ?.campos || [];


            campos.forEach(campo => {

                contenedor.innerHTML += `

                    <div class="campo-preview">

                        <span class="titulo-preview">
                            ${campo.etiqueta}
                        </span>

                        <span class="valor-preview">
                            ${
                                datos[campo.nombre] ||
                                "-"
                            }
                        </span>

                    </div>

                `;
            });

        } else {

            contenedor.innerHTML =
                "<p>No fue posible cargar la plantilla.</p>";
        }


        /*
         * ETIQUETAS
         */

        const respuestaEtiquetas =
            await window.fetchProtegido(
                `/api/fichas/${id_ficha}/etiquetas`
            );


        const etiquetas =
            await respuestaEtiquetas.json();


        const contenedorEtiquetas =
            document.getElementById(
                "vistaEtiquetasFicha"
            );


        contenedorEtiquetas.innerHTML =
            "";


        if (etiquetas.length === 0) {

            contenedorEtiquetas.innerHTML =
                "<span class='sin-etiquetas'>Sin etiquetas</span>";

        } else {

            etiquetas.forEach(etiqueta => {

                contenedorEtiquetas.innerHTML += `

                    <span class="etiqueta-vista ${
                        etiqueta.activo
                            ? ""
                            : "etiqueta-vista-desactivada"
                    }">
                        ${etiqueta.nombre}
                    </span>

                `;

            });
        }


        /*
         * =====================================================
         * FICHAS RELACIONADAS
         * =====================================================
         */

        const respuestaRelaciones =
            await window.fetchProtegido(
                `/api/relacion-ficha/${id_ficha}`
            );


        const contenedorRelaciones =
            document.getElementById(
                "vistaRelacionesFicha"
            );


        if (
            respuestaRelaciones.ok &&
            contenedorRelaciones
        ) {

            const relaciones =
                await respuestaRelaciones.json();


            contenedorRelaciones.innerHTML =
                "";


            if (relaciones.length === 0) {

                contenedorRelaciones.innerHTML =
                    `
                    <span class="sin-relaciones">
                        Sin fichas relacionadas
                    </span>
                    `;

            } else {

                /*
                 * Obtenemos los datos completos de cada
                 * ficha relacionada para conseguir también
                 * su imagen.
                 */

                const fichasRelacionadas =
                    await Promise.all(

                        relaciones.map(
                            async relacion => {

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
                                                "Sin título",

                                            imagen:
                                                fichaRelacionada.imagen ||
                                                null,

                                            visible:
                                                fichaRelacionada.visible
                                        };
                                    }

                                } catch (error) {

                                    console.error(
                                        "Error obteniendo ficha relacionada:",
                                        error
                                    );
                                }


                                return relacion;
                            }
                        )
                    );


                /*
                 * MOSTRAR MINI FICHAS
                 */

                fichasRelacionadas.forEach(
                    relacion => {

                        const imagen =
                            relacion.imagen
                                ? "/" +
                                  relacion.imagen.replace(
                                      "public/",
                                      ""
                                  )
                                : "/imagenes/default.png";


                        contenedorRelaciones.innerHTML += `

                            <article class="relacion-vista ${
                                relacion.visible == 0
                                    ? "relacion-vista-desactivada"
                                    : ""
                            }">

                                <div class="relacion-vista-imagen">

                                    <img
                                        src="${imagen}"

                                        alt="${
                                            relacion.titulo ||
                                            "Ficha"
                                        }"

                                        onerror="
                                            this.onerror=null;
                                            this.src='/imagenes/default.png';
                                        "
                                    >

                                </div>


                                <div class="relacion-vista-contenido">

                                    <span class="relacion-vista-id">
                                        FICHA #${
                                            relacion.id_ficha_destino
                                        }
                                    </span>


                                    <strong>
                                        ${
                                            relacion.titulo ||
                                            "Sin título"
                                        }
                                    </strong>


                                    <span class="relacion-vista-tipo">
                                        ${
                                            relacion.tipo_relacion ||
                                            "Sin relación"
                                        }
                                    </span>

                                </div>

                            </article>

                        `;
                    }
                );
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


/* =========================================================
   EDITAR FICHA
========================================================= */

async function editarFicha(id_ficha) {

    console.log(
        "Editando ficha:",
        id_ficha
    );


    try {

        fichaEditando =
            id_ficha;


        /*
         * OBTENER FICHA
         */

        const respuesta =
            await window.fetchProtegido(
                `/api/fichas/${id_ficha}`
            );


        if (!respuesta.ok) {

            console.error(
                "No se pudo obtener la ficha:",
                respuesta.status
            );

            return;
        }


        const ficha =
            await respuesta.json();


        console.log(
            "Ficha recibida:",
            ficha
        );


        const modal =
            document.getElementById(
                "modalFicha"
            );


        if (!modal) {

            console.error(
                "No existe modalFicha."
            );

            return;
        }


        /*
         * =====================================================
         * GUARDAMOS EL MENÚ REAL DE LA FICHA
         * =====================================================
         *
         * Este dato es MUY IMPORTANTE.
         *
         * No usamos menuSeleccionado porque podemos
         * estar entrando desde "Gestión general".
         */

        modal.dataset.idFicha =
            String(id_ficha);

        modal.dataset.idMenu =
            String(ficha.id_menu);


        console.log(
            "Menú de la ficha:",
            ficha.id_menu
        );


        /*
         * CARGAR MENÚES EN SELECT
         */

        await cargarTiposFicha();


        const tipoFicha =
            document.getElementById(
                "tipoFicha"
            );


        if (tipoFicha) {

            /*
             * Seleccionamos el menú de la ficha.
             *
             * IMPORTANTE:
             * NO hacemos dispatchEvent("change").
             *
             * El change está pensado para NUEVA FICHA
             * y abriría/resetea el formulario.
             */

            tipoFicha.value =
                String(ficha.id_menu);


            /*
             * Si por algún motivo el option no existe,
             * lo agregamos.
             */

            if (
                tipoFicha.value !==
                String(ficha.id_menu)
            ) {

                console.warn(
                    "El menú de la ficha no aparece en el selector:",
                    ficha.id_menu
                );

            } else {

                const opcion =
                    tipoFicha.options[
                        tipoFicha.selectedIndex
                    ];


                const nombreMenu =
                    opcion
                        ? opcion.textContent.trim()
                        : `Menú ${ficha.id_menu}`;


                const nombreTipo =
                    document.getElementById(
                        "nombreTipoFicha"
                    );


                if (nombreTipo) {

                    nombreTipo.textContent =
                        nombreMenu;
                }


                const tituloDatos =
                    document.getElementById(
                        "tituloDatosEspecificos"
                    );


                if (tituloDatos) {

                    tituloDatos.textContent =
                        `Datos específicos de ${nombreMenu}`;
                }
            }
        }


        /*
         * ABRIR MODAL
         */

        modal.style.display =
            "flex";


        /*
         * DATOS BÁSICOS
         */

        document.getElementById(
            "tituloFicha"
        ).value =
            ficha.titulo || "";


        document.getElementById(
            "resumenFicha"
        ).value =
            ficha.resumen || "";


        document.getElementById(
            "textoFicha"
        ).value =
            ficha.texto || "";


        document.getElementById(
            "visibleFicha"
        ).checked =
            ficha.visible == 1;


        /*
         * IMAGEN ACTUAL
         */

        const imagenActual =
            document.getElementById(
                "imagenActualFicha"
            );


        const contenedorImagenActual =
            document.getElementById(
                "contenedorImagenActual"
            );


        if (ficha.imagen) {

            imagenActual.src =
                "/" +
                ficha.imagen.replace(
                    "public/",
                    ""
                );


            imagenActual.style.display =
                "block";


            contenedorImagenActual.style.display =
                "block";

        } else {

            imagenActual.src =
                "";


            imagenActual.style.display =
                "none";


            contenedorImagenActual.style.display =
                "none";
        }


        document.getElementById(
            "labelImagenFicha"
        ).textContent =
            "Cambiar imagen";


        document.getElementById(
            "imagenFicha"
        ).value =
            "";


        if (window.limpiarImagenFichaRecortada) {
            window.limpiarImagenFichaRecortada();
        }


        /*
         * TÍTULO MODAL
         */

        document.getElementById(
            "tituloModalFicha"
        ).textContent =
            "Editar ficha";


        /*
         * ETIQUETAS
         */

        const etiquetasSeleccionadas =
            await obtenerEtiquetasFicha(
                id_ficha
            );


        await cargarEtiquetasFicha(
            etiquetasSeleccionadas
        );


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


            await cargarFichasDisponibles(
                id_ficha
            );
        }


        if (tipoRelacion) {

            tipoRelacion.disabled =
                false;
        }


        /*
         * RELACIONES EXISTENTES
         */

        const respuestaRelaciones =
            await window.fetchProtegido(
                `/api/relacion-ficha/${id_ficha}`
            );


        if (!respuestaRelaciones.ok) {

            console.error(
                "No se pudieron cargar las relaciones"
            );


            relacionesPendientes =
                [];

        } else {

            const relaciones =
                await respuestaRelaciones.json();


            /* =====================================================
               REINICIAR RELACIONES PENDIENTES
            ===================================================== */

            relacionesPendientes = [];

            relacionesEliminadasPendientes = [];


            /* =====================================================
               ELIMINAR DUPLICADOS

               Una ficha destino solamente puede aparecer una vez.
            ===================================================== */

            const fichasYaRelacionadas =
                new Set();


            relaciones.forEach(relacion => {

                const idDestino =
                    Number(
                        relacion.id_ficha_destino
                    );


                if (!idDestino) {
                    return;
                }


                /*
                 * Si ya tenemos esta ficha,
                 * ignoramos la relación duplicada.
                 */

                if (
                    fichasYaRelacionadas.has(
                        idDestino
                    )
                ) {

                    return;
                }


                fichasYaRelacionadas.add(
                    idDestino
                );


                relacionesPendientes.push({

                    id_relacion:
                        relacion.id_relacion,

                    id_ficha_destino:
                        idDestino,

                    tipo_relacion:
                        relacion.tipo_relacion,

                    titulo:
                        relacion.titulo ||
                        relacion.ficha_relacionada ||
                        `Ficha ${idDestino}`

                });

            });


            /* =====================================================
               MOSTRAR UNA SOLA VEZ
            ===================================================== */

            await mostrarRelacionesPendientes();

        }


        /*
         * PLANTILLA DINÁMICA
         *
         * Usamos ficha.id_menu.
         * NO menuSeleccionado.
         */

        const plantillaRespuesta =
            await window.fetchProtegido(
                `/api/plantillas/menu/${ficha.id_menu}`
            );


        if (!plantillaRespuesta.ok) {

            console.error(
                "No se pudo cargar la plantilla del menú:",
                ficha.id_menu
            );

            generarCampos([]);

        } else {

            const plantilla =
                await plantillaRespuesta.json();


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
        }


        /*
         * DATOS DINÁMICOS
         */

        let datos = {};


        try {

            datos =
                ficha.datos_json
                    ? JSON.parse(
                        ficha.datos_json
                    )
                    : {};

        } catch (error) {

            console.warn(
                "Error leyendo datos_json:",
                error
            );
        }


        document
            .querySelectorAll(
                ".campo-dinamico"
            )
            .forEach(input => {

                const nombre =
                    input.dataset.campo;


                if (
                    datos[nombre] !==
                    undefined
                ) {

                    input.value =
                        datos[nombre];
                }
            });


        /*
         * BOTÓN ACTUALIZAR
         */

        document.getElementById(
            "btnGuardarFicha"
        ).textContent =
            "Actualizar ficha";


    } catch (error) {

        console.error(
            "Error cargando ficha para editar:",
            error
        );
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


/* =========================================================
   NUEVA FICHA
========================================================= */

async function abrirNuevaFicha() {

    console.log(
        "Nueva ficha. Menú seleccionado:",
        menuSeleccionado
    );


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


            if (window.limpiarImagenFichaRecortada) {
                window.limpiarImagenFichaRecortada();
            }


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

    const modal =
        document.getElementById(
            "modalFicha"
        );


    if (modal) {

        modal.style.display =
            "none";
    }
}


/* =========================================================
   GUARDAR FICHA
========================================================= */

async function guardarFicha() {

    const modalFicha =
        document.getElementById(
            "modalFicha"
        );


    if (!modalFicha) {

        console.error(
            "No existe modalFicha."
        );

        return;
    }


    const id_ficha =
        modalFicha.dataset.idFicha || "";


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
     * IMAGEN
     *
     * Si el admin recortó la portada (recorteImagen.js),
     * se usa esa versión ya recortada en cuadrado.
     * Si no, se usa el archivo original tal cual.
     */

    console.log(
        "[GUARDAR FICHA] window.imagenFichaRecortada en este momento:",
        window.imagenFichaRecortada
    );

    if (window.imagenFichaRecortada) {

        console.log("[GUARDAR FICHA] Usando imagen RECORTADA.");

        formulario.append(
            "imagen",
            window.imagenFichaRecortada,
            "portada.jpg"
        );

    } else {

        console.log("[GUARDAR FICHA] Usando imagen ORIGINAL (sin recorte).");

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

                    console.error(
                        "No se pudo eliminar la relación:",
                        idRelacion
                    );

                }

            } catch (error) {

                console.error(
                    "Error eliminando relación:",
                    error
                );
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

                console.error(
                    "Error guardando relaciones."
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
            "Error eliminando ficha:",
            error
        );


        alert(
            "Ocurrió un error al eliminar la ficha."
        );
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


        if (window.limpiarImagenFichaRecortada) {
            window.limpiarImagenFichaRecortada();
        }


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

async function mostrarRelacionesPendientes() {

    const contenedor =
        document.getElementById(
            "listaRelacionesFicha"
        );


    if (!contenedor) {
        return;
    }


    contenedor.innerHTML = "";


    if (
        !relacionesPendientes ||
        relacionesPendientes.length === 0
    ) {

        contenedor.innerHTML =
            "<span class='sin-relaciones'>No hay relaciones agregadas</span>";

        return;
    }


    /*
     * =====================================================
     * ELIMINAR DUPLICADOS ANTES DE MOSTRAR
     * =====================================================
     *
     * Una ficha destino solamente puede aparecer una vez.
     */

    const unicas = [];

    const idsUsados = new Set();


    relacionesPendientes.forEach(
        relacion => {

            const idDestino =
                Number(
                    relacion.id_ficha_destino
                );


            if (!idDestino) {
                return;
            }


            if (
                idsUsados.has(
                    idDestino
                )
            ) {

                return;
            }


            idsUsados.add(
                idDestino
            );


            unicas.push(
                relacion
            );
        }
    );


    /*
     * Actualizamos el array para que
     * tampoco queden duplicados internamente.
     */

    relacionesPendientes =
        unicas;


    /*
     * =====================================================
     * OBTENER DATOS COMPLETOS
     * =====================================================
     */

    const fichasCompletas =
        await Promise.all(

            relacionesPendientes.map(
                async relacion => {

                    try {

                        const respuesta =
                            await window.fetchProtegido(

                                `/api/fichas/${relacion.id_ficha_destino}`

                            );


                        if (
                            respuesta.ok
                        ) {

                            const ficha =
                                await respuesta.json();


                            return {

                                ...relacion,

                                titulo:
                                    ficha.titulo ||
                                    relacion.titulo ||
                                    "Sin título",

                                imagen:
                                    ficha.imagen ||
                                    null,

                                visible:
                                    ficha.visible

                            };
                        }

                    } catch (error) {

                        console.error(
                            "Error obteniendo ficha relacionada:",
                            error
                        );
                    }


                    return relacion;

                }
            )
        );


    /*
     * =====================================================
     * MOSTRAR MINI FICHAS
     * =====================================================
     */

    fichasCompletas.forEach(
        (relacion, index) => {

            const imagen =
                relacion.imagen

                    ? "/" +
                      relacion.imagen.replace(
                          "public/",
                          ""
                      )

                    : "/imagenes/default.png";


            contenedor.innerHTML += `

                <article class="mini-ficha-relacion ${
                    relacion.visible == 0
                        ? "mini-ficha-desactivada"
                        : ""
                }">

                    <div class="mini-ficha-imagen">

                        <img
                            src="${imagen}"

                            alt="${
                                relacion.titulo ||
                                "Ficha"
                            }"

                            onerror="
                                this.onerror=null;
                                this.src='/imagenes/default.png';
                            "
                        >

                    </div>


                    <div class="mini-ficha-contenido">

                        <span class="mini-ficha-id">
                            FICHA #${
                                relacion.id_ficha_destino
                            }
                        </span>


                        <h4>
                            ${
                                relacion.titulo ||
                                "Sin título"
                            }
                        </h4>


                        <span class="mini-ficha-tipo">
                            ${
                                relacion.tipo_relacion ||
                                "Sin relación"
                            }
                        </span>

                    </div>


                    <button
                        type="button"
                        class="mini-ficha-eliminar"

                        onclick="
                            eliminarRelacionFichaEditar(
                                ${index}
                            )
                        "

                        title="Eliminar relación"
                    >
                        ×
                    </button>

                </article>

            `;
        }
    );
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

function mostrarFechaArgentina(
    fecha
) {

    if (!fecha) {
        return "-";
    }


    const partes =
        fecha.split(" ");


    return `${partes[0]} ${partes[1]}`;
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