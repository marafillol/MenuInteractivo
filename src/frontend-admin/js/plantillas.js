
console.log("Módulo plantillas cargado");


/* =========================================================
   ESTADO DEL MÓDULO
========================================================= */

let plantillaEditando = null;
let indiceCampoEditando = null;

let campoEliminar = null;
let plantillaEliminar = null;


/* =========================================================
   CONFIGURACIÓN PREDETERMINADA
========================================================= */

const CONFIG_PLANTILLA_DEFAULT = {

    version: 1,

    interfaz: {
        vista: "grid",
        columnas: 4,
        formaFicha: "rectangular",
        tamanoFicha: "mediano",
        separacion: 20
    },

    elementos: {
        mostrarImagen: true,
        mostrarResumen: true,
        mostrarEtiquetas: true,
        mostrarBuscador: true,
        mostrarIndice: true
    },

    apariencia: {
        colorPrincipal: "#163A61",
        colorSecundario: "#C7A85B",
        colorFondo: "#E8E0CF",
        colorTexto: "#222222",
        fuenteTitulo: "Courier New",
        fuenteTexto: "Arial",
        radioBorde: 8
    },

    estructura: {
        campos: []
    }

};


/* =========================================================
   PLANTILLA ACTUAL
========================================================= */

let plantillaActual = crearPlantillaDefault();


/* =========================================================
   CREAR PLANTILLA DEFAULT
========================================================= */

function crearPlantillaDefault() {

    return {

        version: CONFIG_PLANTILLA_DEFAULT.version,

        interfaz: {
            ...CONFIG_PLANTILLA_DEFAULT.interfaz
        },

        elementos: {
            ...CONFIG_PLANTILLA_DEFAULT.elementos
        },

        apariencia: {
            ...CONFIG_PLANTILLA_DEFAULT.apariencia
        },

        estructura: {
            campos: []
        }

    };

}


/* =========================================================
   NORMALIZAR PLANTILLA
========================================================= */

function normalizarPlantilla(datos = {}) {

    return {

        version:
            datos.version ??
            CONFIG_PLANTILLA_DEFAULT.version,

        interfaz: {

            vista:
                datos.interfaz?.vista ??
                CONFIG_PLANTILLA_DEFAULT.interfaz.vista,

            columnas:
                Number(
                    datos.interfaz?.columnas ??
                    CONFIG_PLANTILLA_DEFAULT.interfaz.columnas
                ),

            formaFicha:
                datos.interfaz?.formaFicha ??
                CONFIG_PLANTILLA_DEFAULT.interfaz.formaFicha,

            tamanoFicha:
                datos.interfaz?.tamanoFicha ??
                CONFIG_PLANTILLA_DEFAULT.interfaz.tamanoFicha,

            separacion:
                Number(
                    datos.interfaz?.separacion ??
                    CONFIG_PLANTILLA_DEFAULT.interfaz.separacion
                )

        },

        elementos: {

            mostrarImagen:
                datos.elementos?.mostrarImagen ??
                CONFIG_PLANTILLA_DEFAULT.elementos.mostrarImagen,

            mostrarResumen:
                datos.elementos?.mostrarResumen ??
                CONFIG_PLANTILLA_DEFAULT.elementos.mostrarResumen,

            mostrarEtiquetas:
                datos.elementos?.mostrarEtiquetas ??
                CONFIG_PLANTILLA_DEFAULT.elementos.mostrarEtiquetas,

            mostrarBuscador:
                datos.elementos?.mostrarBuscador ??
                CONFIG_PLANTILLA_DEFAULT.elementos.mostrarBuscador,

            mostrarIndice:
                datos.elementos?.mostrarIndice ??
                CONFIG_PLANTILLA_DEFAULT.elementos.mostrarIndice

        },

        apariencia: {

            colorPrincipal:
                datos.apariencia?.colorPrincipal ??
                CONFIG_PLANTILLA_DEFAULT.apariencia.colorPrincipal,

            colorSecundario:
                datos.apariencia?.colorSecundario ??
                CONFIG_PLANTILLA_DEFAULT.apariencia.colorSecundario,

            colorFondo:
                datos.apariencia?.colorFondo ??
                CONFIG_PLANTILLA_DEFAULT.apariencia.colorFondo,

            colorTexto:
                datos.apariencia?.colorTexto ??
                CONFIG_PLANTILLA_DEFAULT.apariencia.colorTexto,

            fuenteTitulo:
                datos.apariencia?.fuenteTitulo ??
                CONFIG_PLANTILLA_DEFAULT.apariencia.fuenteTitulo,

            fuenteTexto:
                datos.apariencia?.fuenteTexto ??
                CONFIG_PLANTILLA_DEFAULT.apariencia.fuenteTexto,

            radioBorde:
                Number(
                    datos.apariencia?.radioBorde ??
                    CONFIG_PLANTILLA_DEFAULT.apariencia.radioBorde
                )

        },

        estructura: {

            campos:
                Array.isArray(datos.estructura?.campos)
                    ? datos.estructura.campos
                    : []

        }

    };

}


/* =========================================================
   LEER CONFIGURACIÓN DE LA INTERFAZ
========================================================= */

function leerConfiguracionInterfaz() {

    const obtener = id =>
        document.getElementById(id);


    /* -----------------------------------------------------
       INTERFAZ
    ----------------------------------------------------- */

    const vista = obtener("vistaPlantilla");

    const columnas = obtener("columnasPlantilla");

    const forma = obtener("formaFichaPlantilla");

    const tamano = obtener("tamanoFichaPlantilla");

    const separacion = obtener("separacionPlantilla");


    if (vista) {

        plantillaActual.interfaz.vista =
            vista.value;

    }


    if (columnas) {

        plantillaActual.interfaz.columnas =
            Number(columnas.value);

    }


    if (forma) {

        plantillaActual.interfaz.formaFicha =
            forma.value;

    }


    if (tamano) {

        plantillaActual.interfaz.tamanoFicha =
            tamano.value;

    }


    if (separacion) {

        plantillaActual.interfaz.separacion =
            Number(separacion.value);

    }


    /* -----------------------------------------------------
       ELEMENTOS
    ----------------------------------------------------- */

    const mostrarImagen =
        obtener("mostrarImagenPlantilla");

    const mostrarResumen =
        obtener("mostrarResumenPlantilla");

    const mostrarEtiquetas =
        obtener("mostrarEtiquetasPlantilla");

    const mostrarBuscador =
        obtener("mostrarBuscadorPlantilla");

    const mostrarIndice =
        obtener("mostrarIndicePlantilla");


    if (mostrarImagen) {

        plantillaActual.elementos.mostrarImagen =
            mostrarImagen.checked;

    }


    if (mostrarResumen) {

        plantillaActual.elementos.mostrarResumen =
            mostrarResumen.checked;

    }


    if (mostrarEtiquetas) {

        plantillaActual.elementos.mostrarEtiquetas =
            mostrarEtiquetas.checked;

    }


    if (mostrarBuscador) {

        plantillaActual.elementos.mostrarBuscador =
            mostrarBuscador.checked;

    }


    if (mostrarIndice) {

        plantillaActual.elementos.mostrarIndice =
            mostrarIndice.checked;

    }


    /* -----------------------------------------------------
       APARIENCIA
    ----------------------------------------------------- */

    const colorPrincipal =
        obtener("colorPrincipalPlantilla");

    const colorSecundario =
        obtener("colorSecundarioPlantilla");

    const colorFondo =
        obtener("colorFondoPlantilla");

    const colorTexto =
        obtener("colorTextoPlantilla");

    const fuenteTitulo =
        obtener("fuenteTituloPlantilla");

    const fuenteTexto =
        obtener("fuenteTextoPlantilla");

    const radioBorde =
        obtener("radioBordePlantilla");


    if (colorPrincipal) {

        plantillaActual.apariencia.colorPrincipal =
            colorPrincipal.value;

    }


    if (colorSecundario) {

        plantillaActual.apariencia.colorSecundario =
            colorSecundario.value;

    }


    if (colorFondo) {

        plantillaActual.apariencia.colorFondo =
            colorFondo.value;

    }


    if (colorTexto) {

        plantillaActual.apariencia.colorTexto =
            colorTexto.value;

    }


    if (fuenteTitulo) {

        plantillaActual.apariencia.fuenteTitulo =
            fuenteTitulo.value;

    }


    if (fuenteTexto) {

        plantillaActual.apariencia.fuenteTexto =
            fuenteTexto.value;

    }


    if (radioBorde) {

        plantillaActual.apariencia.radioBorde =
            Number(radioBorde.value);

    }


    console.log(
        "Configuración de plantilla actualizada:",
        plantillaActual
    );

}


/* =========================================================
   CAMBIOS DE CONFIGURACIÓN
========================================================= */

const IDS_CONFIGURACION_PLANTILLA = [

    /* Interfaz */

    "vistaPlantilla",
    "columnasPlantilla",
    "formaFichaPlantilla",
    "tamanoFichaPlantilla",
    "separacionPlantilla",

    /* Elementos */

    "mostrarImagenPlantilla",
    "mostrarResumenPlantilla",
    "mostrarEtiquetasPlantilla",
    "mostrarBuscadorPlantilla",
    "mostrarIndicePlantilla",

    /* Apariencia */

    "colorPrincipalPlantilla",
    "colorSecundarioPlantilla",
    "colorFondoPlantilla",
    "colorTextoPlantilla",
    "fuenteTituloPlantilla",
    "fuenteTextoPlantilla",
    "radioBordePlantilla"

];


document.addEventListener("change", event => {

    if (
        !IDS_CONFIGURACION_PLANTILLA.includes(
            event.target.id
        )
    ) {
        return;
    }

    leerConfiguracionInterfaz();

    actualizarVistaPreviaPlantilla();

});


/* =========================================================
   INICIAR MÓDULO
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


    modulo.addEventListener("click", event => {

        const boton =
            event.target.closest("#nuevaPlantilla");

        if (!boton) {
            return;
        }

        limpiarFormularioPlantilla();

        const modal =
            document.getElementById("modalPlantilla");

        if (modal) {

            modal.style.display = "flex";

        }

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


    const etiqueta =
        document.getElementById("etiquetaCampo");

    const nombre =
        document.getElementById("nombreCampo");

    const tipo =
        document.getElementById("tipoCampo");

    const mostrarTarjeta =
        document.getElementById("mostrarTarjetaCampo");

    const mostrarVista =
        document.getElementById("mostrarVistaPreviaCampo");

    const mostrarHistoria =
        document.getElementById("mostrarHistoriaCampo");


    if (etiqueta) {
        etiqueta.value = "";
    }

    if (nombre) {
        nombre.value = "";
    }

    if (tipo) {
        tipo.value = "text";
    }

    if (mostrarTarjeta) {
        mostrarTarjeta.checked = true;
    }

    if (mostrarVista) {
        mostrarVista.checked = true;
    }

    if (mostrarHistoria) {
        mostrarHistoria.checked = true;
    }


    const modal =
        document.getElementById(
            "modalCampoPlantilla"
        );

    if (modal) {

        modal.style.display = "flex";

    }

}


function cerrarCampoPlantilla() {

    const modal =
        document.getElementById(
            "modalCampoPlantilla"
        );

    if (modal) {

        modal.style.display = "none";

    }

}


/* =========================================================
   EVENTOS PRINCIPALES
========================================================= */

document.addEventListener("click", event => {

    const id =
        event.target.id;


    if (id === "btnNuevoCampo") {

        abrirNuevoCampo();

        return;

    }


    if (id === "btnGuardarCampo") {

        guardarCampo();

        return;

    }


    if (id === "btnGuardarPlantilla") {

        guardarPlantilla();

        return;

    }

});


/* =========================================================
   GUARDAR CAMPO
========================================================= */

function guardarCampo() {

    const etiqueta =
        document
            .getElementById("etiquetaCampo")
            ?.value
            .trim() || "";


    const nombre =
        document
            .getElementById("nombreCampo")
            ?.value
            .trim() || "";


    const tipo =
        document
            .getElementById("tipoCampo")
            ?.value || "text";


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
            )?.checked ?? true,

        mostrarVistaPrevia:
            document.getElementById(
                "mostrarVistaPreviaCampo"
            )?.checked ?? true,

        mostrarHistoria:
            document.getElementById(
                "mostrarHistoriaCampo"
            )?.checked ?? true

    };


    if (indiceCampoEditando === null) {

        plantillaActual.estructura.campos.push(
            campo
        );

    }
    else {

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

        lista.insertAdjacentHTML(
            "beforeend",
            `

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
                        type="button"
                        class="btn-editar-plantilla"
                        onclick="editarCampo(${indice})">

                        Editar

                    </button>

                    <button
                        type="button"
                        class="btn-eliminar-plantilla"
                        onclick="eliminarCampo(${indice})">

                        Eliminar

                    </button>

                </div>

            </div>

            `
        );

    });

}


/* =========================================================
   LIMPIAR FORMULARIO
========================================================= */

function limpiarFormularioPlantilla() {

    plantillaEditando = null;
    indiceCampoEditando = null;

    plantillaActual =
        crearPlantillaDefault();


    const titulo =
        document.getElementById(
            "tituloModalPlantilla"
        );

    const nombre =
        document.getElementById(
            "nombrePlantilla"
        );

    const descripcion =
        document.getElementById(
            "descripcionPlantilla"
        );

    const activo =
        document.getElementById(
            "activoPlantilla"
        );


    if (titulo) {
        titulo.textContent = "Nueva plantilla";
    }

    if (nombre) {
        nombre.value = "";
    }

    if (descripcion) {
        descripcion.value = "";
    }

    if (activo) {
        activo.checked = true;
    }


    /* -----------------------------------------------------
       CARGAR VALORES DEFAULT EN EL FORMULARIO
    ----------------------------------------------------- */

    cargarConfiguracionEnFormulario();


    mostrarCamposPlantilla();

    actualizarVistaPreviaPlantilla();

}


/* =========================================================
   CARGAR CONFIGURACIÓN EN FORMULARIO
========================================================= */

function cargarConfiguracionEnFormulario() {

    const i =
        plantillaActual.interfaz;

    const e =
        plantillaActual.elementos;

    const a =
        plantillaActual.apariencia;


    /* -----------------------------------------------------
       INTERFAZ
    ----------------------------------------------------- */

    const vista =
        document.getElementById(
            "vistaPlantilla"
        );

    const columnas =
        document.getElementById(
            "columnasPlantilla"
        );

    const forma =
        document.getElementById(
            "formaFichaPlantilla"
        );

    const tamano =
        document.getElementById(
            "tamanoFichaPlantilla"
        );

    const separacion =
        document.getElementById(
            "separacionPlantilla"
        );


    if (vista) {
        vista.value = i.vista;
    }

    if (columnas) {
        columnas.value = i.columnas;
    }

    if (forma) {
        forma.value = i.formaFicha;
    }

    if (tamano) {
        tamano.value = i.tamanoFicha;
    }

    if (separacion) {
        separacion.value = i.separacion;
    }


    /* -----------------------------------------------------
       ELEMENTOS
    ----------------------------------------------------- */

    const mostrarImagen =
        document.getElementById(
            "mostrarImagenPlantilla"
        );

    const mostrarResumen =
        document.getElementById(
            "mostrarResumenPlantilla"
        );

    const mostrarEtiquetas =
        document.getElementById(
            "mostrarEtiquetasPlantilla"
        );

    const mostrarBuscador =
        document.getElementById(
            "mostrarBuscadorPlantilla"
        );

    const mostrarIndice =
        document.getElementById(
            "mostrarIndicePlantilla"
        );


    if (mostrarImagen) {
        mostrarImagen.checked = e.mostrarImagen;
    }

    if (mostrarResumen) {
        mostrarResumen.checked = e.mostrarResumen;
    }

    if (mostrarEtiquetas) {
        mostrarEtiquetas.checked = e.mostrarEtiquetas;
    }

    if (mostrarBuscador) {
        mostrarBuscador.checked = e.mostrarBuscador;
    }

    if (mostrarIndice) {
        mostrarIndice.checked = e.mostrarIndice;
    }


    /* -----------------------------------------------------
       APARIENCIA
    ----------------------------------------------------- */

    const colorPrincipal =
        document.getElementById(
            "colorPrincipalPlantilla"
        );

    const colorSecundario =
        document.getElementById(
            "colorSecundarioPlantilla"
        );

    const colorFondo =
        document.getElementById(
            "colorFondoPlantilla"
        );

    const colorTexto =
        document.getElementById(
            "colorTextoPlantilla"
        );

    const fuenteTitulo =
        document.getElementById(
            "fuenteTituloPlantilla"
        );

    const fuenteTexto =
        document.getElementById(
            "fuenteTextoPlantilla"
        );

    const radioBorde =
        document.getElementById(
            "radioBordePlantilla"
        );


    if (colorPrincipal) {
        colorPrincipal.value =
            a.colorPrincipal;
    }

    if (colorSecundario) {
        colorSecundario.value =
            a.colorSecundario;
    }

    if (colorFondo) {
        colorFondo.value =
            a.colorFondo;
    }

    if (colorTexto) {
        colorTexto.value =
            a.colorTexto;
    }

    if (fuenteTitulo) {
        fuenteTitulo.value =
            a.fuenteTitulo;
    }

    if (fuenteTexto) {
        fuenteTexto.value =
            a.fuenteTexto;
    }

    if (radioBorde) {
        radioBorde.value =
            a.radioBorde;
    }

}


/* =========================================================
   EDITAR CAMPO
========================================================= */

function editarCampo(indice) {

    const campo =
        plantillaActual.estructura.campos[indice];


    if (!campo) {
        return;
    }


    indiceCampoEditando = indice;


    const etiqueta =
        document.getElementById(
            "etiquetaCampo"
        );

    const nombre =
        document.getElementById(
            "nombreCampo"
        );

    const tipo =
        document.getElementById(
            "tipoCampo"
        );

    const mostrarTarjeta =
        document.getElementById(
            "mostrarTarjetaCampo"
        );

    const mostrarVista =
        document.getElementById(
            "mostrarVistaPreviaCampo"
        );

    const mostrarHistoria =
        document.getElementById(
            "mostrarHistoriaCampo"
        );


    if (etiqueta) {
        etiqueta.value =
            campo.etiqueta || "";
    }

    if (nombre) {
        nombre.value =
            campo.nombre || "";
    }

    if (tipo) {
        tipo.value =
            campo.tipo || "text";
    }

    if (mostrarTarjeta) {
        mostrarTarjeta.checked =
            campo.mostrarTarjeta ?? true;
    }

    if (mostrarVista) {
        mostrarVista.checked =
            campo.mostrarVistaPrevia ?? true;
    }

    if (mostrarHistoria) {
        mostrarHistoria.checked =
            campo.mostrarHistoria ?? true;
    }


    const modal =
        document.getElementById(
            "modalCampoPlantilla"
        );

    if (modal) {

        modal.style.display = "flex";

    }

}


/* =========================================================
   ELIMINAR CAMPO
========================================================= */

function eliminarCampo(indice) {

    if (
        !plantillaActual.estructura.campos[indice]
    ) {
        return;
    }


    campoEliminar = indice;


    const modal =
        document.getElementById(
            "modalEliminarCampo"
        );

    if (modal) {

        modal.style.display = "flex";

    }

}


function cerrarEliminarCampoPlantilla() {

    campoEliminar = null;


    const modal =
        document.getElementById(
            "modalEliminarCampo"
        );

    if (modal) {

        modal.style.display = "none";

    }

}


function confirmarEliminarCampo() {

    if (campoEliminar === null) {
        return;
    }


    plantillaActual.estructura.campos.splice(
        campoEliminar,
        1
    );


    campoEliminar = null;


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


    /* -----------------------------------------------------
       GARANTIZAR ESTRUCTURA
    ----------------------------------------------------- */

    if (
        !plantillaActual ||
        typeof plantillaActual !== "object"
    ) {

        plantillaActual =
            crearPlantillaDefault();

    }


    plantillaActual =
        normalizarPlantilla(
            plantillaActual
        );


    const interfaz =
        plantillaActual.interfaz;

    const elementos =
        plantillaActual.elementos;

    const apariencia =
        plantillaActual.apariencia;

    const campos =
        plantillaActual.estructura.campos;


    /* -----------------------------------------------------
       LIMPIAR
    ----------------------------------------------------- */

    contenedor.innerHTML = "";


    /* -----------------------------------------------------
       CONTENEDOR PRINCIPAL
    ----------------------------------------------------- */

    const interfazPreview =
        document.createElement("div");

    interfazPreview.className =
        "preview-interfaz";


    /* -----------------------------------------------------
       VARIABLES CSS
    ----------------------------------------------------- */

    interfazPreview.style.setProperty(
        "--preview-color-principal",
        apariencia.colorPrincipal
    );

    interfazPreview.style.setProperty(
        "--preview-color-secundario",
        apariencia.colorSecundario
    );

    interfazPreview.style.setProperty(
        "--preview-color-fondo",
        apariencia.colorFondo
    );

    interfazPreview.style.setProperty(
        "--preview-color-texto",
        apariencia.colorTexto
    );

    interfazPreview.style.setProperty(
        "--preview-fuente-titulo",
        `"${apariencia.fuenteTitulo}", sans-serif`
    );

    interfazPreview.style.setProperty(
        "--preview-fuente-texto",
        `"${apariencia.fuenteTexto}", sans-serif`
    );

    interfazPreview.style.setProperty(
        "--preview-radio",
        `${apariencia.radioBorde}px`
    );

    interfazPreview.style.setProperty(
        "--preview-separacion",
        `${interfaz.separacion}px`
    );

    interfazPreview.style.setProperty(
        "--preview-columnas",
        interfaz.columnas
    );


    /* -----------------------------------------------------
       FONDO
    ----------------------------------------------------- */

    interfazPreview.style.background =
        apariencia.colorFondo;

    interfazPreview.style.color =
        apariencia.colorTexto;

    interfazPreview.style.fontFamily =
        `"${apariencia.fuenteTexto}", sans-serif`;


    /* -----------------------------------------------------
       CABECERA
    ----------------------------------------------------- */

    const cabecera =
        document.createElement("div");

    cabecera.className =
        "preview-cabecera";


    const titulo =
        document.createElement("h2");

    titulo.textContent =
        "Ejemplo de menú";

    titulo.style.color =
        apariencia.colorPrincipal;

    titulo.style.fontFamily =
        `"${apariencia.fuenteTitulo}", sans-serif`;


    cabecera.appendChild(titulo);


    /* -----------------------------------------------------
       BUSCADOR
    ----------------------------------------------------- */

    if (elementos.mostrarBuscador) {

        const buscador =
            document.createElement("div");

        buscador.className =
            "preview-buscador";

        buscador.innerHTML = `
            <span>🔎</span>
            <span>Buscar...</span>
        `;

        cabecera.appendChild(
            buscador
        );

    }


    interfazPreview.appendChild(
        cabecera
    );


    /* -----------------------------------------------------
       ÍNDICE
    ----------------------------------------------------- */

    if (elementos.mostrarIndice) {

        const indice =
            document.createElement("div");

        indice.className =
            "preview-indice";

        indice.innerHTML = `
            <strong>Índice</strong>
            <span>A</span>
            <span>B</span>
            <span>C</span>
            <span>D</span>
            <span>E</span>
        `;

        interfazPreview.appendChild(
            indice
        );

    }


    /* -----------------------------------------------------
       CONTENEDOR DE FICHAS
    ----------------------------------------------------- */

    const contenedorFichas =
        document.createElement("div");

    contenedorFichas.className =
        "preview-fichas";


    /* -----------------------------------------------------
       TIPO DE VISTA
    ----------------------------------------------------- */

    if (interfaz.vista === "grid") {

        contenedorFichas.style.display =
            "grid";

        contenedorFichas.style.gridTemplateColumns =
            `repeat(${interfaz.columnas}, minmax(0, 1fr))`;

    }
    else {

        contenedorFichas.style.display =
            "flex";

        contenedorFichas.style.flexDirection =
            "column";

    }


    contenedorFichas.style.gap =
        `${interfaz.separacion}px`;


    /* -----------------------------------------------------
       CANTIDAD DE FICHAS
    ----------------------------------------------------- */

    const cantidadFichas =
        interfaz.vista === "grid"
            ? Math.max(interfaz.columnas * 2, 4)
            : 4;


    /* -----------------------------------------------------
       CREAR FICHAS
    ----------------------------------------------------- */

    for (
        let i = 0;
        i < cantidadFichas;
        i++
    ) {

        const ficha =
            document.createElement("article");

        ficha.className =
            "preview-ficha";


        /* -------------------------------------------------
           FORMA
        ------------------------------------------------- */

        switch (interfaz.formaFicha) {

            case "cuadrada":

                ficha.style.aspectRatio =
                    "1 / 1";

                break;


            case "circular":

                ficha.style.aspectRatio =
                    "1 / 1";

                ficha.style.borderRadius =
                    "50%";

                break;


            case "redondeada":

                ficha.style.borderRadius =
                    `${Math.max(
                        apariencia.radioBorde,
                        20
                    )}px`;

                break;


            default:

                ficha.style.borderRadius =
                    `${apariencia.radioBorde}px`;

        }


        /* -------------------------------------------------
           TAMAÑO
        ------------------------------------------------- */

        switch (interfaz.tamanoFicha) {

            case "pequeno":

                ficha.style.minHeight =
                    "150px";

                break;


            case "grande":

                ficha.style.minHeight =
                    "280px";

                break;


            default:

                ficha.style.minHeight =
                    "210px";

        }


        /* -------------------------------------------------
           COLORES
        ------------------------------------------------- */

        ficha.style.border =
            `2px solid ${apariencia.colorPrincipal}`;

        ficha.style.background =
            "#ffffff";

        ficha.style.color =
            apariencia.colorTexto;


        /* -------------------------------------------------
           IMAGEN
        ------------------------------------------------- */

        if (elementos.mostrarImagen) {

            const imagen =
                document.createElement("div");

            imagen.className =
                "preview-ficha-imagen";

            imagen.innerHTML = `
                <span>FOTOGRAFÍA</span>
            `;

            imagen.style.background =
                apariencia.colorPrincipal;

            imagen.style.color =
                "#ffffff";

            ficha.appendChild(
                imagen
            );

        }


        /* -------------------------------------------------
           CONTENIDO
        ------------------------------------------------- */

        const contenido =
            document.createElement("div");

        contenido.className =
            "preview-ficha-contenido";


        /* TÍTULO */

        const tituloFicha =
            document.createElement("h3");

        tituloFicha.textContent =
            `Ficha de ejemplo ${i + 1}`;

        tituloFicha.style.color =
            apariencia.colorPrincipal;

        tituloFicha.style.fontFamily =
            `"${apariencia.fuenteTitulo}", sans-serif`;

        contenido.appendChild(
            tituloFicha
        );


        /* RESUMEN */

        if (elementos.mostrarResumen) {

            const resumen =
                document.createElement("p");

            resumen.textContent =
                "Este es un resumen de ejemplo de la ficha.";

            contenido.appendChild(
                resumen
            );

        }


        /* ETIQUETAS */

        if (elementos.mostrarEtiquetas) {

            const etiquetas =
                document.createElement("div");

            etiquetas.className =
                "preview-etiquetas";

            etiquetas.innerHTML = `
                <span>Historia</span>
                <span>Archivo</span>
            `;

            contenido.appendChild(
                etiquetas
            );

        }


        /* CAMPOS */

        campos
            .filter(
                campo =>
                    campo.mostrarTarjeta
            )
            .forEach(campo => {

                const campoElemento =
                    document.createElement("div");

                campoElemento.className =
                    "preview-campo";

                campoElemento.innerHTML = `

                    <strong>
                        ${campo.etiqueta}
                    </strong>

                    <span>
                        Ejemplo
                    </span>

                `;

                contenido.appendChild(
                    campoElemento
                );

            });


        ficha.appendChild(
            contenido
        );


        contenedorFichas.appendChild(
            ficha
        );

    }


    interfazPreview.appendChild(
        contenedorFichas
    );


    /* -----------------------------------------------------
       INFORMACIÓN TÉCNICA
    ----------------------------------------------------- */

    const informacion =
        document.createElement("div");

    informacion.className =
        "preview-configuracion";

    informacion.innerHTML = `

        <strong>
            Configuración actual
        </strong>

        <span>
            ${interfaz.vista}
        </span>

        <span>
            ${interfaz.columnas} columnas
        </span>

        <span>
            ${interfaz.formaFicha}
        </span>

        <span>
            ${interfaz.tamanoFicha}
        </span>

    `;


    interfazPreview.appendChild(
        informacion
    );


    /* -----------------------------------------------------
       MOSTRAR
    ----------------------------------------------------- */

    contenedor.appendChild(
        interfazPreview
    );

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
            ?.value
            .trim() || "";


    const descripcion =
        document
            .getElementById("descripcionPlantilla")
            ?.value
            .trim() || "";


    if (!nombre) {

        mostrarMensajePlantilla(
            "Debes completar el nombre de la plantilla antes de guardar."
        );

        return;

    }


    const activo =
        document.getElementById(
            "activoPlantilla"
        );


    const datos = {

        nombre,

        descripcion,

        activo:
            activo?.checked
                ? 1
                : 0,

        plantilla_json:
            JSON.stringify(
                plantillaActual
            )

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


        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );

        }


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

            let datos = {};

            try {

                datos =
                    typeof plantilla.plantilla_json === "string"
                        ? JSON.parse(
                            plantilla.plantilla_json
                        )
                        : plantilla.plantilla_json || {};

            }
            catch (error) {

                console.error(
                    "Error parseando plantilla:",
                    plantilla.id_plantilla,
                    error
                );

            }


            const cantidadCampos =
                datos.estructura?.campos?.length || 0;


            contenedor.insertAdjacentHTML(
                "beforeend",
                `

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
                            campo${cantidadCampos !== 1 ? "s" : ""}

                        </small>

                        <br>

                        <small>

                            ${
                                Number(plantilla.activo) === 1
                                    ? "Activa"
                                    : "Inactiva"
                            }

                        </small>


                        <div class="acciones-plantilla">

                            <button
                                type="button"
                                class="btn-vista-plantilla"
                                onclick="vistaPreviaPlantilla(${plantilla.id_plantilla})">

                                Vista previa

                            </button>


                            <button
                                type="button"
                                class="btn-editar-plantilla"
                                onclick="editarPlantilla(${plantilla.id_plantilla})">

                                Editar

                            </button>


                            <button
                                type="button"
                                class="btn-eliminar-plantilla"
                                onclick="abrirEliminarPlantilla(${plantilla.id_plantilla})">

                                Eliminar

                            </button>

                        </div>

                    </div>

                </article>

                `
            );

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
   VISTA PREVIA DE PLANTILLA GUARDADA
========================================================= */

async function vistaPreviaPlantilla(id) {

    try {

        const respuesta =
            await window.fetchProtegido(
                `/api/plantillas/${id}`
            );


        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );

        }


        const plantilla =
            await respuesta.json();


        const datos =
            normalizarPlantilla(
                typeof plantilla.plantilla_json === "string"
                    ? JSON.parse(
                        plantilla.plantilla_json
                    )
                    : plantilla.plantilla_json || {}
            );


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

        const elementos =
            datos.elementos;

        const campos =
            datos.estructura.campos;


        /* -----------------------------------------------------
           IMAGEN
        ----------------------------------------------------- */

        if (elementos.mostrarImagen) {

            contenedor.insertAdjacentHTML(
                "beforeend",
                `

                <div class="preview-imagen">

                    <img
                        src="/imagenes/default.png"
                        width="150">

                </div>

                `
            );

        }


        /* -----------------------------------------------------
           TÍTULO
        ----------------------------------------------------- */

        contenedor.insertAdjacentHTML(
            "beforeend",
            `

            <h2 class="titulo-preview-plantilla">
                Título de ejemplo
            </h2>

            `
        );


        /* -----------------------------------------------------
           RESUMEN
        ----------------------------------------------------- */

        if (elementos.mostrarResumen) {

            contenedor.insertAdjacentHTML(
                "beforeend",
                `

                <p>
                    Este es un resumen de ejemplo de la ficha.
                </p>

                `
            );

        }


        /* -----------------------------------------------------
           CAMPOS
        ----------------------------------------------------- */

        campos.forEach(campo => {

            contenedor.insertAdjacentHTML(
                "beforeend",
                `

                <div class="campo-preview">

                    <label>
                        ${campo.etiqueta}
                    </label>

                    <input
                        type="${campo.tipo || "text"}"
                        placeholder="${campo.etiqueta}"
                        disabled>

                </div>

                `
            );

        });


        /* -----------------------------------------------------
           INFORMACIÓN
        ----------------------------------------------------- */

        contenedor.insertAdjacentHTML(
            "beforeend",
            `

            <hr>

            <small>

                Vista:
                ${interfaz.vista}

                |

                Columnas:
                ${interfaz.columnas}

            </small>

            `
        );


        const modal =
            document.getElementById(
                "modalVistaPlantilla"
            );


        if (modal) {

            modal.style.display = "flex";

        }

    }
    catch (error) {

        console.error(
            "Error vista previa plantilla:",
            error
        );

        mostrarMensajePlantilla(
            "No se pudo cargar la vista previa de la plantilla."
        );

    }

}


function cerrarPreviewPlantilla() {

    const modal =
        document.getElementById(
            "modalVistaPlantilla"
        );

    if (modal) {

        modal.style.display = "none";

    }

}


/* =========================================================
   EDITAR PLANTILLA
========================================================= */

async function editarPlantilla(id) {

    console.log(
        "Editando plantilla:",
        id
    );


    try {

        /* -----------------------------------------------------
           OBTENER PLANTILLA
        ----------------------------------------------------- */

        const respuesta =
            await window.fetchProtegido(
                `/api/plantillas/${id}`
            );


        if (!respuesta.ok) {

            const error =
                await respuesta
                    .json()
                    .catch(() => ({}));


            mostrarMensajePlantilla(
                error.error ||
                "No se pudo cargar la plantilla."
            );

            return;

        }


        const plantilla =
            await respuesta.json();


        console.log(
            "Plantilla recibida:",
            plantilla
        );


        /* -----------------------------------------------------
           MARCAR EDICIÓN
        ----------------------------------------------------- */

        plantillaEditando =
            id;

        indiceCampoEditando =
            null;


        /* -----------------------------------------------------
           PARSEAR JSON
        ----------------------------------------------------- */

        let datos = {};


        try {

            datos =
                typeof plantilla.plantilla_json === "string"
                    ? JSON.parse(
                        plantilla.plantilla_json
                    )
                    : plantilla.plantilla_json || {};

        }
        catch (error) {

            console.error(
                "Error parseando plantilla_json:",
                error
            );

        }


        /* -----------------------------------------------------
           NORMALIZAR
        ----------------------------------------------------- */

        plantillaActual =
            normalizarPlantilla(
                datos
            );


        console.log(
            "Plantilla normalizada:",
            plantillaActual
        );


        /* -----------------------------------------------------
           DATOS GENERALES
        ----------------------------------------------------- */

        const titulo =
            document.getElementById(
                "tituloModalPlantilla"
            );

        const nombre =
            document.getElementById(
                "nombrePlantilla"
            );

        const descripcion =
            document.getElementById(
                "descripcionPlantilla"
            );

        const activo =
            document.getElementById(
                "activoPlantilla"
            );


        if (titulo) {

            titulo.textContent =
                "Editar plantilla";

        }


        if (nombre) {

            nombre.value =
                plantilla.nombre || "";

        }


        if (descripcion) {

            descripcion.value =
                plantilla.descripcion || "";

        }


        if (activo) {

            activo.checked =
                Number(plantilla.activo) === 1;

        }


        /* -----------------------------------------------------
           CARGAR CONFIGURACIÓN
        ----------------------------------------------------- */

        cargarConfiguracionEnFormulario();


        /* -----------------------------------------------------
           CAMPOS
        ----------------------------------------------------- */

        mostrarCamposPlantilla();


        /* -----------------------------------------------------
           VISTA PREVIA
        ----------------------------------------------------- */

        actualizarVistaPreviaPlantilla();


        /* -----------------------------------------------------
           ABRIR MODAL
        ----------------------------------------------------- */

        const modal =
            document.getElementById(
                "modalPlantilla"
            );


        if (modal) {

            modal.style.display =
                "flex";

        }

    }
    catch (error) {

        console.error(
            "Error editando plantilla:",
            error
        );

        mostrarMensajePlantilla(
            "Ocurrió un error al cargar la plantilla."
        );

    }

}


/* =========================================================
   ELIMINAR PLANTILLA
========================================================= */

function abrirEliminarPlantilla(id) {

    plantillaEliminar =
        id;


    const modal =
        document.getElementById(
            "modalEliminarPlantilla"
        );


    if (modal) {

        modal.style.display =
            "flex";

    }

}


function cerrarEliminarPlantilla() {

    plantillaEliminar =
        null;


    const modal =
        document.getElementById(
            "modalEliminarPlantilla"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

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
            await respuesta
                .json()
                .catch(() => ({}));


        if (!respuesta.ok) {

            mostrarMensajePlantilla(
                datos.error ||
                "No se pudo eliminar la plantilla."
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

        mostrarMensajePlantilla(
            "Ocurrió un error al eliminar la plantilla."
        );

    }

}


/* =========================================================
   MODAL DE MENSAJES
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


    texto.textContent =
        mensaje;


    modal.style.display =
        "flex";

}


function cerrarMensajePlantilla() {

    const modal =
        document.getElementById(
            "modalMensajePlantilla"
        );


    if (modal) {

        modal.style.display =
            "none";

    }


    plantillaEliminar =
        null;

}


/* =========================================================
   CERRAR MODALES AL HACER CLICK AFUERA
========================================================= */

document.addEventListener(
    "click",
    event => {

        const modales =
            document.querySelectorAll(
                "#moduloPlantillas .modal-plantilla"
            );


        modales.forEach(modal => {

            if (
                modal.style.display !== "none" &&
                event.target === modal
            ) {

                modal.style.display =
                    "none";

            }

        });

    }
);
