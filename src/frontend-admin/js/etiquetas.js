// =========================================================
// ETIQUETAS
// Museo Malvinas
// Gestión de etiquetas
// Versión consolidada
// =========================================================


let etiquetaEliminar = null;


// =========================================================
// CARGAR ETIQUETAS
// =========================================================

async function cargarEtiquetas() {

    try {

        const respuesta =
            await window.fetchProtegido("/api/etiquetas");

        const etiquetas =
            await respuesta.json();

        const esConsulta =
            window.usuarioActual?.rol === "consulta";

        const contenedor =
            document.getElementById("gridEtiquetas");

        if (!contenedor) return;

        contenedor.innerHTML = "";

        etiquetas.forEach(etiqueta => {

            contenedor.innerHTML += `

                <div class="tarjeta-etiqueta ${etiqueta.activo ? "" : "etiqueta-inactiva"}">

                    <div class="info-etiqueta">

                        <h3>
                            ${etiqueta.nombre}
                        </h3>

                        <p>
                            ${etiqueta.descripcion ?? ""}
                        </p>

                    </div>

                    <div class="acciones-etiqueta">

                        <button
                            type="button"
                            class="btn-vista-previa"
                            onclick="vistaPreviaEtiqueta(${etiqueta.id_etiqueta})">

                            Vista previa

                        </button>

                        ${!esConsulta ? `

                            <button
                                type="button"
                                class="btn-editar"
                                onclick="editarEtiqueta(${etiqueta.id_etiqueta})">

                                Editar

                            </button>

                            <button
                                type="button"
                                class="btn-eliminar"
                                onclick="confirmarEliminarEtiqueta(
                                    ${etiqueta.id_etiqueta},
                                    '${String(etiqueta.nombre)
                                        .replace(/'/g, "\\'")}'
                                )">

                                Eliminar

                            </button>

                        ` : ""}

                    </div>

                </div>

            `;

        });

    } catch (error) {

        console.error(
            "Error al cargar etiquetas:",
            error
        );

        mostrarMensaje(
            "Error",
            "No se pudieron cargar las etiquetas."
        );

    }

}


// =========================================================
// GUARDAR / EDITAR ETIQUETA
// =========================================================

async function guardarEtiqueta() {

    const nombre =
        document
            .getElementById("nombreEtiqueta")
            ?.value
            .trim();

    if (!nombre) {

        mostrarMensaje(
            "Campo obligatorio",
            "Debe ingresar un nombre para la etiqueta."
        );

        document
            .getElementById("nombreEtiqueta")
            ?.focus();

        return;
    }


    const datos = {

        nombre,

        descripcion:
            document
                .getElementById("descripcionEtiqueta")
                ?.value
                .trim() || "",

        activo:
            document
                .getElementById("activoEtiqueta")
                ?.checked
                ? 1
                : 0

    };


    let url = "/api/etiquetas";
    let metodo = "POST";


    if (window.etiquetaEditando) {

        url += `/${window.etiquetaEditando}`;

        metodo = "PUT";

    }


    try {

        const respuesta =
            await window.fetchProtegido(
                url,
                {
                    method: metodo,

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(datos)
                }
            );


        const resultado =
            await respuesta.json().catch(() => ({}));


        if (!respuesta.ok) {

            mostrarMensaje(
                "Error",
                resultado.error ||
                "No se pudo guardar la etiqueta."
            );

            return;
        }


        limpiarFormularioEtiqueta();

        cerrarModal("modalEtiqueta");

        await cargarEtiquetas();

    } catch (error) {

        console.error(
            "Error al guardar etiqueta:",
            error
        );

        mostrarMensaje(
            "Error",
            "No se pudo guardar la etiqueta."
        );

    }

}


// =========================================================
// LIMPIAR FORMULARIO
// =========================================================

function limpiarFormularioEtiqueta() {

    const nombre =
        document.getElementById("nombreEtiqueta");

    const descripcion =
        document.getElementById("descripcionEtiqueta");

    const activo =
        document.getElementById("activoEtiqueta");


    if (nombre)
        nombre.value = "";

    if (descripcion)
        descripcion.value = "";

    if (activo)
        activo.checked = true;


    window.etiquetaEditando = null;

}


// =========================================================
// ABRIR NUEVA ETIQUETA
// =========================================================

function abrirNuevaEtiqueta() {

    limpiarFormularioEtiqueta();

    abrirModal("modalEtiqueta");

}


// =========================================================
// EDITAR ETIQUETA
// =========================================================

async function editarEtiqueta(id) {

    try {

        const respuesta =
            await window.fetchProtegido(
                `/api/etiquetas/${id}`
            );

        const etiqueta =
            await respuesta.json();


        document
            .getElementById("nombreEtiqueta")
            .value =
            etiqueta.nombre || "";


        document
            .getElementById("descripcionEtiqueta")
            .value =
            etiqueta.descripcion || "";


        document
            .getElementById("activoEtiqueta")
            .checked =
            etiqueta.activo == 1;


        window.etiquetaEditando = id;

        abrirModal("modalEtiqueta");


    } catch (error) {

        console.error(
            "Error al editar etiqueta:",
            error
        );

        mostrarMensaje(
            "Error",
            "No se pudo cargar la etiqueta."
        );

    }

}


// =========================================================
// VISTA PREVIA
// =========================================================

async function vistaPreviaEtiqueta(id) {

    try {

        const respuesta =
            await window.fetchProtegido(
                `/api/etiquetas/${id}`
            );

        const etiqueta =
            await respuesta.json();


        const campoId =
            document.getElementById(
                "vistaIdEtiqueta"
            );

        const campoNombre =
            document.getElementById(
                "vistaNombreEtiqueta"
            );

        const campoDescripcion =
            document.getElementById(
                "vistaDescripcionEtiqueta"
            );

        const estado =
            document.getElementById(
                "vistaActivoEtiqueta"
            );


        if (campoId)
            campoId.value =
                etiqueta.id_etiqueta;

        if (campoNombre)
            campoNombre.value =
                etiqueta.nombre || "";

        if (campoDescripcion)
            campoDescripcion.value =
                etiqueta.descripcion || "";

        if (estado)
            estado.textContent =
                etiqueta.activo
                    ? "Activa"
                    : "Inactiva";


        abrirModal("modalVistaEtiqueta");

    } catch (error) {

        console.error(
            "Error en vista previa:",
            error
        );

        mostrarMensaje(
            "Error",
            "No se pudo cargar la etiqueta."
        );

    }

}


// =========================================================
// CONFIRMAR ELIMINACIÓN
// =========================================================

function confirmarEliminarEtiqueta(id, nombre) {

    etiquetaEliminar = id;


    const nombreElemento =
        document.getElementById(
            "nombreEliminarEtiqueta"
        );


    if (nombreElemento) {

        nombreElemento.textContent =
            nombre;

    }


    abrirModal(
        "modalEliminarEtiqueta"
    );

}


// =========================================================
// ELIMINAR ETIQUETA
// =========================================================

async function eliminarEtiqueta() {

    if (!etiquetaEliminar)
        return;


    try {

        const respuesta =
            await window.fetchProtegido(
                `/api/etiquetas/${etiquetaEliminar}`,
                {
                    method: "DELETE"
                }
            );


        const resultado =
            await respuesta.json()
                .catch(() => ({}));


        if (!respuesta.ok) {

            mostrarMensaje(
                "Error",
                resultado.error ||
                "No se pudo eliminar la etiqueta."
            );

            return;
        }


        etiquetaEliminar = null;

        cerrarModal(
            "modalEliminarEtiqueta"
        );

        await cargarEtiquetas();


    } catch (error) {

        console.error(
            "Error al eliminar etiqueta:",
            error
        );

        mostrarMensaje(
            "Error",
            "No se pudo eliminar la etiqueta."
        );

    }

}


// =========================================================
// CERRAR MENSAJE
// =========================================================

function cerrarMensaje() {

    cerrarModal("modalMensaje");

}


// =========================================================
// MOSTRAR MENSAJE
// =========================================================

function mostrarMensaje(titulo, mensaje) {

    const modal =
        document.getElementById(
            "modalMensaje"
        );


    if (!modal) {

        alert(
            `${titulo}\n\n${mensaje}`
        );

        return;
    }


    const tituloElemento =
        document.getElementById(
            "tituloMensaje"
        );

    const textoElemento =
        document.getElementById(
            "textoMensaje"
        );


    if (tituloElemento)
        tituloElemento.textContent =
            titulo;

    if (textoElemento)
        textoElemento.textContent =
            mensaje;


    abrirModal("modalMensaje");

}


// =========================================================
// ABRIR MODAL
// =========================================================

function abrirModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal)
        return;

    modal.style.display = "flex";

}


// =========================================================
// CERRAR MODAL
// =========================================================

function cerrarModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal)
        return;

    modal.style.display = "none";

}


// =========================================================
// INICIALIZAR ETIQUETAS
// =========================================================

function iniciarEtiquetas() {

    cargarEtiquetas();


    // -----------------------------------------------------
    // NUEVA ETIQUETA
    // -----------------------------------------------------

    document
        .getElementById("nuevaEtiqueta")
        ?.addEventListener(
            "click",
            abrirNuevaEtiqueta
        );


    // -----------------------------------------------------
    // GUARDAR
    // -----------------------------------------------------

    document
        .getElementById("guardarEtiqueta")
        ?.addEventListener(
            "click",
            guardarEtiqueta
        );


    // -----------------------------------------------------
    // CANCELAR
    // -----------------------------------------------------

    document
        .getElementById("cancelarEtiqueta")
        ?.addEventListener(
            "click",
            () => {

                limpiarFormularioEtiqueta();

                cerrarModal(
                    "modalEtiqueta"
                );

            }
        );


    // -----------------------------------------------------
    // CERRAR NUEVA / EDITAR
    // -----------------------------------------------------

    document
        .getElementById("cerrarModalEtiqueta")
        ?.addEventListener(
            "click",
            () => {

                limpiarFormularioEtiqueta();

                cerrarModal(
                    "modalEtiqueta"
                );

            }
        );


    // -----------------------------------------------------
    // CERRAR VISTA PREVIA
    // -----------------------------------------------------

    document
        .getElementById("cerrarVistaEtiqueta")
        ?.addEventListener(
            "click",
            () => {

                cerrarModal(
                    "modalVistaEtiqueta"
                );

            }
        );


    document
        .getElementById("btnCerrarVistaEtiqueta")
        ?.addEventListener(
            "click",
            () => {

                cerrarModal(
                    "modalVistaEtiqueta"
                );

            }
        );


    // -----------------------------------------------------
    // CONFIRMAR ELIMINACIÓN
    // -----------------------------------------------------

    document
        .getElementById(
            "confirmarEliminarEtiqueta"
        )
        ?.addEventListener(
            "click",
            eliminarEtiqueta
        );


    // -----------------------------------------------------
    // CANCELAR ELIMINACIÓN
    // -----------------------------------------------------

    document
        .getElementById(
            "cancelarEliminarEtiqueta"
        )
        ?.addEventListener(
            "click",
            () => {

                etiquetaEliminar = null;

                cerrarModal(
                    "modalEliminarEtiqueta"
                );

            }
        );


    // -----------------------------------------------------
    // CERRAR ELIMINACIÓN
    // -----------------------------------------------------

    document
        .getElementById(
            "cerrarEliminarEtiqueta"
        )
        ?.addEventListener(
            "click",
            () => {

                etiquetaEliminar = null;

                cerrarModal(
                    "modalEliminarEtiqueta"
                );

            }
        );


    // -----------------------------------------------------
    // CERRAR MODALES AL HACER CLIC AFUERA
    // -----------------------------------------------------

    document.addEventListener(
        "click",
        manejarClickFueraEtiquetas
    );

}


// =========================================================
// CLIC FUERA DE LOS MODALES
// =========================================================

function manejarClickFueraEtiquetas(event) {

    const ids = [

        "modalEtiqueta",
        "modalVistaEtiqueta",
        "modalEliminarEtiqueta",
        "modalMensaje"

    ];


    ids.forEach(id => {

        const modal =
            document.getElementById(id);

        if (!modal)
            return;


        /*
         * Solo se cierra cuando el clic
         * fue directamente sobre el fondo.
         *
         * Si se hace clic dentro del contenido,
         * no se cierra.
         */

        if (
            event.target === modal &&
            modal.style.display !== "none"
        ) {

            if (
                id === "modalEtiqueta"
            ) {

                limpiarFormularioEtiqueta();

            }


            if (
                id === "modalEliminarEtiqueta"
            ) {

                etiquetaEliminar = null;

            }


            cerrarModal(id);

        }

    });

}