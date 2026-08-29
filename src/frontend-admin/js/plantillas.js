console.log("Módulo plantillas cargado");

/* =========================================================
   VARIABLES
========================================================= */

let plantillaEditando = null;
let indiceCampoEditando = null;
let campoEliminar = null;
let plantillaEliminar = null;


/* =========================================================
   PLANTILLA ACTUAL
========================================================= */

let plantillaActual = {
    interfaz: {
        vista: "grid",
        columnas: 4,
        mostrarImagen: true,
        mostrarResumen: true
    },

    estructura: {
        campos: []
    }
};


function nuevaPlantillaActual() {

    plantillaActual = {
        interfaz: {
            vista: "grid",
            columnas: 4,
            mostrarImagen: true,
            mostrarResumen: true
        },

        estructura: {
            campos: []
        }
    };
}


/* =========================================================
   CONFIGURACIÓN DE INTERFAZ
========================================================= */

function leerConfiguracionInterfaz() {

    plantillaActual.interfaz.vista =
        document.getElementById("vistaPlantilla").value;

    plantillaActual.interfaz.columnas =
        Number(
            document.getElementById("columnasPlantilla").value
        );

    plantillaActual.interfaz.mostrarImagen =
        document.getElementById(
            "mostrarImagenPlantilla"
        ).checked;

    plantillaActual.interfaz.mostrarResumen =
        document.getElementById(
            "mostrarResumenPlantilla"
        ).checked;

}


/* =========================================================
   CAMBIOS DE CONFIGURACIÓN
========================================================= */

document.addEventListener("change", e => {

    const ids = [
        "vistaPlantilla",
        "columnasPlantilla",
        "mostrarImagenPlantilla",
        "mostrarResumenPlantilla"
    ];

    if (ids.includes(e.target.id)) {

        leerConfiguracionInterfaz();
        actualizarVistaPreviaPlantilla();

    }

});


/* =========================================================
   INICIAR PLANTILLAS
========================================================= */

function iniciarPlantillas() {

    console.log("Inicializando módulo plantillas");

    const modulo =
        document.getElementById("moduloPlantillas");

    if (!modulo) {

        console.warn(
            "No existe moduloPlantillas"
        );

        return;
    }

    modulo.addEventListener("click", e => {

        const boton =
            e.target.closest("#nuevaPlantilla");

        if (!boton) {
            return;
        }

        limpiarFormularioPlantilla();

        document
            .getElementById("modalPlantilla")
            .style.display = "flex";

    });

}


/* =========================================================
   MODAL PLANTILLA
========================================================= */

function cerrarModalPlantilla() {

    const modal =
        document.getElementById("modalPlantilla");

    if (modal) {
        modal.style.display = "none";
    }

    plantillaEditando = null;
    indiceCampoEditando = null;

}


/* =========================================================
   NUEVO CAMPO
========================================================= */

function abrirNuevoCampo() {

    indiceCampoEditando = null;

    document.getElementById(
        "etiquetaCampo"
    ).value = "";

    document.getElementById(
        "nombreCampo"
    ).value = "";

    document.getElementById(
        "tipoCampo"
    ).value = "text";

    document.getElementById(
        "mostrarTarjetaCampo"
    ).checked = true;

    document.getElementById(
        "mostrarVistaPreviaCampo"
    ).checked = true;

    document.getElementById(
        "mostrarHistoriaCampo"
    ).checked = true;

    document.getElementById(
        "modalCampoPlantilla"
    ).style.display = "flex";

}


function cerrarCampoPlantilla() {

    document.getElementById(
        "modalCampoPlantilla"
    ).style.display = "none";

}


/* =========================================================
   EVENTOS CAMPOS
========================================================= */

document.addEventListener("click", e => {

    if (e.target.id === "btnNuevoCampo") {
        abrirNuevoCampo();
    }

    if (e.target.id === "btnGuardarCampo") {
        guardarCampo();
    }

    if (e.target.id === "btnGuardarPlantilla") {
        guardarPlantilla();
    }

});


/* =========================================================
   GUARDAR CAMPO
========================================================= */

function guardarCampo() {

    const etiqueta =
        document
            .getElementById("etiquetaCampo")
            .value
            .trim();

    const nombre =
        document
            .getElementById("nombreCampo")
            .value
            .trim();

    const tipo =
        document.getElementById(
            "tipoCampo"
        ).value;

    if (!etiqueta || !nombre) {

        mostrarMensajePlantilla(
            "Debes completar la etiqueta y el nombre interno del campo antes de guardar."
        );

        return;
    }

    const campo = {

        nombre,

        tipo,

        etiqueta,

        mostrarTarjeta:
            document.getElementById(
                "mostrarTarjetaCampo"
            ).checked,

        mostrarVistaPrevia:
            document.getElementById(
                "mostrarVistaPreviaCampo"
            ).checked,

        mostrarHistoria:
            document.getElementById(
                "mostrarHistoriaCampo"
            ).checked

    };


    if (indiceCampoEditando === null) {

        plantillaActual.estructura.campos.push(
            campo
        );

    } else {

        plantillaActual.estructura.campos[
            indiceCampoEditando
        ] = campo;

    }


    cerrarCampoPlantilla();

    mostrarCamposPlantilla();

    actualizarVistaPreviaPlantilla();

}


/* =========================================================
   MOSTRAR CAMPOS
========================================================= */

function mostrarCamposPlantilla() {

    const lista =
        document.getElementById(
            "listaCamposPlantilla"
        );

    if (!lista) {
        return;
    }

    lista.innerHTML = "";


    const campos =
        plantillaActual.estructura.campos;


    if (!campos.length) {

        lista.innerHTML = `
            <p class="sin-campos-plantilla">
                No hay campos.
            </p>
        `;

        return;
    }


    campos.forEach((campo, indice) => {

        lista.innerHTML += `

            <div class="item-campo">

                <div>

                    <strong>
                        ${campo.etiqueta}
                    </strong>

                    <br>

                    <small>
                        ${campo.nombre}
                    </small>

                    <br>

                    <small>
                        ${campo.tipo}
                    </small>

                    <br>

                    <small>

                        Tarjeta:
                        ${campo.mostrarTarjeta ? "✔" : "✖"}

                        |

                        Vista:
                        ${campo.mostrarVistaPrevia ? "✔" : "✖"}

                        |

                        Historia:
                        ${campo.mostrarHistoria ? "✔" : "✖"}

                    </small>

                </div>

                <div>

                    <button
                        class="btn-editar-plantilla"
                        onclick="editarCampo(${indice})">

                        Editar

                    </button>

                    <button
                        class="btn-eliminar-plantilla"
                        onclick="eliminarCampo(${indice})">

                        Eliminar

                    </button>

                </div>

            </div>

        `;

    });

}


/* =========================================================
   LIMPIAR FORMULARIO
========================================================= */

function limpiarFormularioPlantilla() {

    plantillaEditando = null;
    indiceCampoEditando = null;

    nuevaPlantillaActual();


    document.getElementById(
        "tituloModalPlantilla"
    ).textContent = "Nueva plantilla";


    document.getElementById(
        "nombrePlantilla"
    ).value = "";


    document.getElementById(
        "descripcionPlantilla"
    ).value = "";


    document.getElementById(
        "activoPlantilla"
    ).checked = true;


    document.getElementById(
        "vistaPlantilla"
    ).value = "grid";


    document.getElementById(
        "columnasPlantilla"
    ).value = 4;


    document.getElementById(
        "mostrarImagenPlantilla"
    ).checked = true;


    document.getElementById(
        "mostrarResumenPlantilla"
    ).checked = true;


    mostrarCamposPlantilla();
    actualizarVistaPreviaPlantilla();

}


/* =========================================================
   EDITAR CAMPO
========================================================= */

function editarCampo(indice) {

    indiceCampoEditando = indice;

    const campo =
        plantillaActual.estructura.campos[indice];

    if (!campo) {
        return;
    }


    document.getElementById(
        "etiquetaCampo"
    ).value = campo.etiqueta;


    document.getElementById(
        "nombreCampo"
    ).value = campo.nombre;


    document.getElementById(
        "tipoCampo"
    ).value = campo.tipo;


    document.getElementById(
        "mostrarTarjetaCampo"
    ).checked =
        campo.mostrarTarjeta ?? true;


    document.getElementById(
        "mostrarVistaPreviaCampo"
    ).checked =
        campo.mostrarVistaPrevia ?? true;


    document.getElementById(
        "mostrarHistoriaCampo"
    ).checked =
        campo.mostrarHistoria ?? true;


    document.getElementById(
        "modalCampoPlantilla"
    ).style.display = "flex";

}


/* =========================================================
   ELIMINAR CAMPO
========================================================= */

function eliminarCampo(indice) {

    campoEliminar = indice;

    document.getElementById(
        "modalEliminarCampo"
    ).style.display = "flex";

}


function cerrarEliminarCampoPlantilla() {

    campoEliminar = null;

    document.getElementById(
        "modalEliminarCampo"
    ).style.display = "none";

}


function confirmarEliminarCampo() {

    if (campoEliminar === null) {
        return;
    }

    plantillaActual.estructura.campos.splice(
        campoEliminar,
        1
    );

    mostrarCamposPlantilla();

    actualizarVistaPreviaPlantilla();

    cerrarEliminarCampoPlantilla();

}


/* =========================================================
   VISTA PREVIA EN TIEMPO REAL
========================================================= */

function actualizarVistaPreviaPlantilla() {

    const contenedor =
        document.getElementById(
            "vistaPreviaPlantilla"
        );

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = "";


    const interfaz =
        plantillaActual.interfaz;

    const campos =
        plantillaActual.estructura.campos;


    const tarjeta =
        document.createElement("div");

    tarjeta.className =
        "preview-plantilla";


    if (interfaz.mostrarImagen) {

        tarjeta.innerHTML += `

            <div class="preview-imagen">

                <img
                    src="/imagenes/default.png"
                    onerror="this.style.display='none'">

            </div>

        `;

    }


    tarjeta.innerHTML += `

        <h3>
            Título de la ficha
        </h3>

    `;


    if (interfaz.mostrarResumen) {

        tarjeta.innerHTML += `

            <p>
                Aquí se mostrará el resumen de la ficha.
            </p>

        `;

    }


    campos.forEach(campo => {

        let control = "";


        switch (campo.tipo) {

            case "textarea":

                control = `
                    <textarea
                        disabled
                        placeholder="${campo.etiqueta}">
                    </textarea>
                `;

                break;


            case "date":

                control = `
                    <input
                        type="date"
                        disabled>
                `;

                break;


            case "number":

                control = `
                    <input
                        type="number"
                        disabled
                        placeholder="${campo.etiqueta}">
                `;

                break;


            case "checkbox":

                control = `
                    <input
                        type="checkbox"
                        disabled>
                `;

                break;


            default:

                control = `
                    <input
                        type="text"
                        disabled
                        placeholder="${campo.etiqueta}">
                `;

        }


        tarjeta.innerHTML += `

            <div class="preview-campo">

                <label>
                    ${campo.etiqueta}
                </label>

                ${control}

            </div>

        `;

    });


    tarjeta.innerHTML += `

        <small>

            Vista: ${interfaz.vista}
            |
            Columnas: ${interfaz.columnas}

        </small>

    `;


    contenedor.appendChild(tarjeta);

}


/* =========================================================
   GUARDAR PLANTILLA
========================================================= */

async function guardarPlantilla() {

    console.log(
        "BOTÓN GUARDAR PLANTILLA DETECTADO"
    );


    leerConfiguracionInterfaz();


    const nombre =
        document
            .getElementById("nombrePlantilla")
            .value
            .trim();


    const descripcion =
        document
            .getElementById("descripcionPlantilla")
            .value
            .trim();


    if (!nombre) {

        mostrarMensajePlantilla(
            "Debes completar el nombre de la plantilla antes de guardar."
        );

        return;
    }


    const datos = {

        nombre,

        descripcion,

        activo:
            document.getElementById(
                "activoPlantilla"
            ).checked
                ? 1
                : 0,

        plantilla_json:
            JSON.stringify(plantillaActual)

    };


    try {

        const url =
            plantillaEditando
                ? `/api/plantillas/${plantillaEditando}`
                : "/api/plantillas";


        const metodo =
            plantillaEditando
                ? "PUT"
                : "POST";


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
            await respuesta.json();


        if (!respuesta.ok) {

            mostrarMensajePlantilla(
                resultado.error ||
                "No se pudo guardar la plantilla."
            );

            return;
        }


        mostrarMensajePlantilla(
            plantillaEditando
                ? "Plantilla actualizada correctamente."
                : "Plantilla creada correctamente."
        );


        cerrarModalPlantilla();

        cargarPlantillas();

    }
    catch (error) {

        console.error(
            "Error guardando plantilla:",
            error
        );

        mostrarMensajePlantilla(
            "Ocurrió un error al guardar la plantilla."
        );

    }

}


/* =========================================================
   CARGAR PLANTILLAS
========================================================= */

async function cargarPlantillas() {

    try {

        const respuesta =
            await window.fetchProtegido(
                "/api/plantillas"
            );


        const plantillas =
            await respuesta.json();


        const contenedor =
            document.getElementById(
                "gridPlantillas"
            );


        if (!contenedor) {
            return;
        }


        contenedor.innerHTML = "";


        plantillas.forEach(plantilla => {

            const datos =
                JSON.parse(
                    plantilla.plantilla_json
                );


            const cantidadCampos =
                datos.estructura?.campos?.length || 0;


            contenedor.innerHTML += `

                <article class="tarjeta-plantilla">

                    <div class="info-plantilla">

                        <h3>
                            ${plantilla.nombre}
                        </h3>

                        <p>
                            ${plantilla.descripcion || "-"}
                        </p>

                        <small>

                            ${cantidadCampos}
                            campo${cantidadCampos != 1 ? "s" : ""}

                        </small>

                        <br>

                        <small>

                            ${plantilla.activo
                                ? "Activa"
                                : "Inactiva"}

                        </small>


                        <div class="acciones-plantilla">

                            <button
                                class="btn-vista-plantilla"
                                onclick="vistaPreviaPlantilla(${plantilla.id_plantilla})">

                                Vista previa

                            </button>


                            <button
                                class="btn-editar-plantilla"
                                onclick="editarPlantilla(${plantilla.id_plantilla})">

                                Editar

                            </button>


                            <button
                                class="btn-eliminar-plantilla"
                                onclick="abrirEliminarPlantilla(${plantilla.id_plantilla})">

                                Eliminar

                            </button>

                        </div>

                    </div>

                </article>

            `;

        });

    }
    catch (error) {

        console.error(
            "Error cargando plantillas:",
            error
        );

    }

}


/* =========================================================
   VISTA PREVIA DE PLANTILLA
========================================================= */

async function vistaPreviaPlantilla(id) {

    try {

        const respuesta =
            await window.fetchProtegido(
                `/api/plantillas/${id}`
            );


        const plantilla =
            await respuesta.json();


        const datos =
            plantilla.plantilla_json;


        const contenedor =
            document.getElementById(
                "contenidoVistaPlantilla"
            );


        if (!contenedor) {
            return;
        }


        contenedor.innerHTML = `

            <h3>
                ${plantilla.nombre}
            </h3>

            <p>
                ${plantilla.descripcion || ""}
            </p>

            <hr>

        `;


        const interfaz =
            datos.interfaz;


        const campos =
            datos.estructura?.campos || [];


        if (interfaz.mostrarImagen) {

            contenedor.innerHTML += `

                <div class="preview-imagen">

                    <img
                        src="/imagenes/default.png"
                        width="150">

                </div>

            `;

        }


        contenedor.innerHTML += `

            <h2 class="titulo-preview-plantilla">
                Título de ejemplo
            </h2>

        `;


        if (interfaz.mostrarResumen) {

            contenedor.innerHTML += `

                <p>
                    Este es un resumen de ejemplo de la ficha.
                </p>

            `;

        }


        campos.forEach(campo => {

            contenedor.innerHTML += `

                <div class="campo-preview">

                    <label>
                        ${campo.etiqueta}
                    </label>

                    <input
                        type="${campo.tipo}"
                        placeholder="${campo.etiqueta}"
                        disabled>

                </div>

            `;

        });


        contenedor.innerHTML += `

            <hr>

            <small>

                Vista:
                ${interfaz.vista}

                |

                Columnas:
                ${interfaz.columnas}

            </small>

        `;


        document.getElementById(
            "modalVistaPlantilla"
        ).style.display = "flex";

    }
    catch (error) {

        console.error(
            "Error vista previa plantilla:",
            error
        );

    }

}


function cerrarPreviewPlantilla() {

    document.getElementById(
        "modalVistaPlantilla"
    ).style.display = "none";

}


/* =========================================================
   EDITAR PLANTILLA
========================================================= */

async function editarPlantilla(id) {

    try {

        const respuesta =
            await window.fetchProtegido(
                `/api/plantillas/${id}`
            );


        const plantilla =
            await respuesta.json();


        plantillaEditando = id;

        plantillaActual =
            plantilla.plantilla_json;


        document.getElementById(
            "tituloModalPlantilla"
        ).textContent =
            "Editar plantilla";


        document.getElementById(
            "nombrePlantilla"
        ).value =
            plantilla.nombre;


        document.getElementById(
            "descripcionPlantilla"
        ).value =
            plantilla.descripcion || "";


        document.getElementById(
            "activoPlantilla"
        ).checked =
            plantilla.activo == 1;


        document.getElementById(
            "vistaPlantilla"
        ).value =
            plantillaActual.interfaz.vista;


        document.getElementById(
            "columnasPlantilla"
        ).value =
            plantillaActual.interfaz.columnas;


        document.getElementById(
            "mostrarImagenPlantilla"
        ).checked =
            plantillaActual.interfaz.mostrarImagen;


        document.getElementById(
            "mostrarResumenPlantilla"
        ).checked =
            plantillaActual.interfaz.mostrarResumen;


        mostrarCamposPlantilla();

        actualizarVistaPreviaPlantilla();


        document.getElementById(
            "modalPlantilla"
        ).style.display = "flex";

    }
    catch (error) {

        console.error(
            "Error editando plantilla:",
            error
        );

    }

}


/* =========================================================
   ELIMINAR PLANTILLA
========================================================= */

function abrirEliminarPlantilla(id) {

    plantillaEliminar = id;

    document.getElementById(
        "modalEliminarPlantilla"
    ).style.display = "flex";

}


function cerrarEliminarPlantilla() {

    plantillaEliminar = null;

    document.getElementById(
        "modalEliminarPlantilla"
    ).style.display = "none";

}


async function confirmarEliminarPlantilla() {

    console.log(
        "confirmarEliminarPlantilla()",
        plantillaEliminar
    );


    if (!plantillaEliminar) {
        return;
    }


    try {

        const respuesta =
            await window.fetchProtegido(
                `/api/plantillas/${plantillaEliminar}`,
                {
                    method: "DELETE"
                }
            );


        const datos =
            await respuesta.json();


        if (!respuesta.ok) {

            mostrarMensajePlantilla(
                datos.error
            );

            return;
        }


        cerrarEliminarPlantilla();

        cargarPlantillas();

    }
    catch (error) {

        console.error(
            "Error eliminando plantilla:",
            error
        );

    }

}


/* =========================================================
   MODAL MENSAJES
========================================================= */

function mostrarMensajePlantilla(mensaje) {

    const modal =
        document.getElementById(
            "modalMensajePlantilla"
        );


    const texto =
        document.getElementById(
            "textoMensajePlantilla"
        );


    if (!modal || !texto) {

        console.error(
            "No existe el modal de mensaje de plantillas"
        );

        return;
    }


    texto.textContent = mensaje;

    modal.style.display = "flex";

}


function cerrarMensajePlantilla() {

    const modal =
        document.getElementById(
            "modalMensajePlantilla"
        );


    if (modal) {
        modal.style.display = "none";
    }


    plantillaEliminar = null;

}


/* =========================================================
   CERRAR VENTANAS AL HACER CLICK AFUERA
========================================================= */

document.addEventListener("click", function (event) {

    /*
     * Buscamos todos los modales de Plantillas
     */
    const modales = document.querySelectorAll(
        "#moduloPlantillas .modal-plantilla"
    );

    modales.forEach(function (modal) {

        /*
         * Si el modal está visible y el click fue
         * directamente sobre el fondo del modal
         * (no sobre su contenido), se cierra.
         */
        if (
            modal.style.display !== "none" &&
            event.target === modal
        ) {

            modal.style.display = "none";

        }

    });

});