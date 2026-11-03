// =======================================================
// PLANTILLAS
// Museo Malvinas · Archivo Histórico
//
// RESPONSABILIDADES:
// • Crear, editar, guardar y eliminar plantillas.
// • Configurar la interfaz y sus campos.
// • Mostrar la vista previa.
// • Autoguardar y recuperar borradores.
//
// IMPORTANTE:
// • No utiliza tamanoFicha ni separacion.
// • Mantiene la vista previa de plantillas guardadas.
// =======================================================

console.log("Módulo plantillas cargado");

// =======================================================
// ESTADO
// =======================================================

let plantillaEditando = null;
let indiceCampoEditando = null;
let campoEliminar = null;
let plantillaEliminar = null;

const CONFIG_PLANTILLA_DEFAULT = {
    version: 1,

    interfaz: {
        vista: "grid",
        columnas: 4,
        formaFicha: "circular",
        ordenFichas: "titulo_asc",

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

let plantillaActual = crearPlantillaDefault();


// =======================================================
// CREAR CONFIGURACIÓN PREDETERMINADA
// =======================================================

function crearPlantillaDefault() {
    return JSON.parse(JSON.stringify(CONFIG_PLANTILLA_DEFAULT));
}


// =======================================================
// NORMALIZAR CONFIGURACIÓN
// Completa valores faltantes y descarta propiedades
// antiguas que ya no se utilizan.
// =======================================================

function normalizarPlantilla(datos = {}) {
    const defaults = crearPlantillaDefault();

    const interfazRecibida = datos.interfaz || {};
    const aparienciaRecibida = datos.apariencia || {};
    const estructuraRecibida = datos.estructura || {};

    const interfaz = {
        ...defaults.interfaz,
        ...interfazRecibida
    };

    // No conservar propiedades antiguas que ya no se usan.
    delete interfaz.tamanoFicha;
    delete interfaz.separacion;

    const apariencia = {
        ...defaults.apariencia,
        ...aparienciaRecibida
    };

    const campos = Array.isArray(estructuraRecibida.campos)
        ? estructuraRecibida.campos.map(campo => ({
            ...campo,
            mostrarTarjeta: campo.mostrarTarjeta ?? true,
            mostrarHistoria: campo.mostrarHistoria ?? true
        }))
        : [];

    return {
        version: datos.version ?? defaults.version,

        interfaz,

        apariencia,

        estructura: {
            ...estructuraRecibida,
            campos
        }
    };
}


// =======================================================
// LEER CONFIGURACIÓN DEL FORMULARIO
// =======================================================

function leerConfiguracionInterfaz() {
    if (!plantillaActual) {
        plantillaActual = crearPlantillaDefault();
    }

    if (!plantillaActual.interfaz) {
        plantillaActual.interfaz = {};
    }

    if (!plantillaActual.apariencia) {
        plantillaActual.apariencia = {};
    }

    const obtenerValor = id =>
        document.getElementById(id)?.value;

    const obtenerMarcado = (id, predeterminado = false) =>
        document.getElementById(id)?.checked ?? predeterminado;

    const vista = obtenerValor("vistaPlantilla");
    const columnas = obtenerValor("columnasPlantilla");
    const formaFicha = obtenerValor("formaFichaPlantilla");

    const ordenFichas = obtenerValor("ordenFichasPlantilla");

    if (ordenFichas !== undefined) {
        plantillaActual.interfaz.ordenFichas = ordenFichas;
    }

    if (vista !== undefined) {
        plantillaActual.interfaz.vista = vista;
    }

    if (columnas !== undefined) {
        plantillaActual.interfaz.columnas =
            Number(columnas) || 1;
    }

    if (formaFicha !== undefined) {
        plantillaActual.interfaz.formaFicha = formaFicha;
    }

    plantillaActual.interfaz.mostrarImagen =
        obtenerMarcado("mostrarImagenPlantilla", true);

    plantillaActual.interfaz.mostrarResumen =
        obtenerMarcado("mostrarResumenPlantilla", true);

    plantillaActual.interfaz.mostrarEtiquetas =
        obtenerMarcado("mostrarEtiquetasPlantilla", true);

    plantillaActual.interfaz.mostrarBuscador =
        obtenerMarcado("mostrarBuscadorPlantilla", true);

    plantillaActual.interfaz.mostrarIndice =
        obtenerMarcado("mostrarIndicePlantilla", true);

    const apariencia = plantillaActual.apariencia;

    const colorPrincipal = obtenerValor("colorPrincipalPlantilla");
    const colorSecundario = obtenerValor("colorSecundarioPlantilla");
    const colorFondo = obtenerValor("colorFondoPlantilla");
    const colorTexto = obtenerValor("colorTextoPlantilla");
    const fuenteTitulo = obtenerValor("fuenteTituloPlantilla");
    const fuenteTexto = obtenerValor("fuenteTextoPlantilla");
    const radioBorde = obtenerValor("radioBordePlantilla");

    if (colorPrincipal !== undefined) {
        apariencia.colorPrincipal = colorPrincipal;
    }

    if (colorSecundario !== undefined) {
        apariencia.colorSecundario = colorSecundario;
    }

    if (colorFondo !== undefined) {
        apariencia.colorFondo = colorFondo;
    }

    if (colorTexto !== undefined) {
        apariencia.colorTexto = colorTexto;
    }

    if (fuenteTitulo !== undefined) {
        apariencia.fuenteTitulo = fuenteTitulo;
    }

    if (fuenteTexto !== undefined) {
        apariencia.fuenteTexto = fuenteTexto;
    }

    if (radioBorde !== undefined) {
        apariencia.radioBorde = Number(radioBorde) || 0;
    }

    // Eliminar posibles propiedades heredadas.
    delete plantillaActual.interfaz.tamanoFicha;
    delete plantillaActual.interfaz.separacion;
}


// =======================================================
// CAMBIOS DE CONFIGURACIÓN
// =======================================================

const IDS_CONFIGURACION_PLANTILLA = [
    "vistaPlantilla",
    "columnasPlantilla",
    "formaFichaPlantilla",

    "mostrarImagenPlantilla",
    "mostrarResumenPlantilla",
    "mostrarEtiquetasPlantilla",
    "mostrarBuscadorPlantilla",
    "mostrarIndicePlantilla",

    "colorPrincipalPlantilla",
    "colorSecundarioPlantilla",
    "colorFondoPlantilla",
    "colorTextoPlantilla",

    "fuenteTituloPlantilla",
    "fuenteTextoPlantilla",
    "radioBordePlantilla"
];

document.addEventListener("change", function (event) {
    if (!IDS_CONFIGURACION_PLANTILLA.includes(event.target.id)) {
        return;
    }

    leerConfiguracionInterfaz();
    actualizarVistaPreviaPlantilla();
    guardarBorradorPlantilla();
});


// =======================================================
// AUTOGUARDADO DE BORRADORES
// Utiliza el módulo window.Borradores.
// =======================================================

function obtenerClaveBorradorPlantilla() {
    if (
        !window.Borradores ||
        !window.usuarioActual?.id_usuario
    ) {
        return null;
    }

    return plantillaEditando
        ? String(plantillaEditando)
        : "nuevo";
}


function obtenerDatosBorradorPlantilla() {
    leerConfiguracionInterfaz();

    const plantillaLimpia = normalizarPlantilla(
        JSON.parse(JSON.stringify(plantillaActual))
    );

    return {
        nombre:
            document.getElementById("nombrePlantilla")?.value ?? "",

        descripcion:
            document.getElementById("descripcionPlantilla")?.value ?? "",

        activo:
            document.getElementById("activoPlantilla")?.checked ?? true,

        plantilla: plantillaLimpia
    };
}


function guardarBorradorPlantilla() {
    const modal = document.getElementById("modalPlantilla");
    const clave = obtenerClaveBorradorPlantilla();

    if (
        !modal ||
        !clave ||
        !window.Borradores ||
        window.getComputedStyle(modal).display === "none"
    ) {
        return;
    }

    try {
        const datos = obtenerDatosBorradorPlantilla();

        window.Borradores.guardar(
            "plantillas",
            clave,
            datos
        );
    } catch (error) {
        console.error("Error guardando borrador de plantilla:", error);
    }
}


function recuperarBorradorPlantilla() {
    const clave = obtenerClaveBorradorPlantilla();

    if (!clave || !window.Borradores) {
        return false;
    }

    try {
        const borrador = window.Borradores.leer(
            "plantillas",
            clave
        );

        if (!borrador?.datos) {
            return false;
        }

        const datos = borrador.datos;

        const nombre = document.getElementById("nombrePlantilla");
        const descripcion = document.getElementById("descripcionPlantilla");
        const activo = document.getElementById("activoPlantilla");

        if (nombre) {
            nombre.value = datos.nombre ?? "";
        }

        if (descripcion) {
            descripcion.value = datos.descripcion ?? "";
        }

        if (activo) {
            activo.checked = datos.activo ?? true;
        }

        plantillaActual = normalizarPlantilla(
            datos.plantilla || {}
        );

        cargarConfiguracionEnFormulario();
        mostrarCamposPlantilla();
        actualizarVistaPreviaPlantilla();

        return true;
    } catch (error) {
        console.error("Error recuperando borrador de plantilla:", error);
        return false;
    }
}


// Instalar los eventos una sola vez.
if (!window.__autoguardadoPlantillasInicializado) {
    window.__autoguardadoPlantillasInicializado = true;

    const guardarSiCorresponde = event => {
        const modal = document.getElementById("modalPlantilla");

        if (
            modal &&
            modal.contains(event.target) &&
            event.target.id !== "btnGuardarPlantilla"
        ) {
            guardarBorradorPlantilla();
        }
    };

    document.addEventListener("input", guardarSiCorresponde);
    document.addEventListener("change", guardarSiCorresponde);
}


// =======================================================
// INICIAR MÓDULO DE PLANTILLAS
// =======================================================

function iniciarPlantillas() {
    const modulo = document.getElementById("moduloPlantillas");

    if (!modulo || modulo.dataset.plantillasInicializado === "true") {
        return;
    }

    modulo.dataset.plantillasInicializado = "true";

    modulo.addEventListener("click", function (event) {
        const boton = event.target.closest("#nuevaPlantilla");

        if (!boton) {
            return;
        }

        limpiarFormularioPlantilla();

        const modal = document.getElementById("modalPlantilla");

        if (modal) {
            modal.style.display = "flex";
        }

        if (!recuperarBorradorPlantilla()) {
            actualizarVistaPreviaPlantilla();
        }
    });
}


// =======================================================
// CERRAR MODAL DE PLANTILLA
// No elimina el borrador: permite recuperarlo después.
// =======================================================

function cerrarModalPlantilla() {
    const modal = document.getElementById("modalPlantilla");

    if (modal) {
        modal.style.display = "none";
    }

    plantillaEditando = null;
    indiceCampoEditando = null;
}


// =======================================================
// CARGAR CONFIGURACIÓN EN EL FORMULARIO
// =======================================================

function cargarConfiguracionEnFormulario() {
    plantillaActual = normalizarPlantilla(plantillaActual);

    const interfaz = plantillaActual.interfaz;
    const apariencia = plantillaActual.apariencia;

    const asignarValor = (id, valor) => {
        const elemento = document.getElementById(id);

        if (elemento && valor !== undefined && valor !== null) {
            elemento.value = valor;
        }
    };

    const asignarMarcado = (id, valor) => {
        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.checked = Boolean(valor);
        }
    };

    asignarValor("vistaPlantilla", interfaz.vista);
    asignarValor("columnasPlantilla", interfaz.columnas);
    asignarValor("formaFichaPlantilla", interfaz.formaFicha);

    asignarValor(
        "ordenFichasPlantilla",
        interfaz.ordenFichas || "titulo_asc"
    );

    asignarMarcado("mostrarImagenPlantilla", interfaz.mostrarImagen);
    asignarMarcado("mostrarResumenPlantilla", interfaz.mostrarResumen);
    asignarMarcado("mostrarEtiquetasPlantilla", interfaz.mostrarEtiquetas);
    asignarMarcado("mostrarBuscadorPlantilla", interfaz.mostrarBuscador);
    asignarMarcado("mostrarIndicePlantilla", interfaz.mostrarIndice);

    asignarValor("colorPrincipalPlantilla", apariencia.colorPrincipal);
    asignarValor("colorSecundarioPlantilla", apariencia.colorSecundario);
    asignarValor("colorFondoPlantilla", apariencia.colorFondo);
    asignarValor("colorTextoPlantilla", apariencia.colorTexto);
    asignarValor("fuenteTituloPlantilla", apariencia.fuenteTitulo);
    asignarValor("fuenteTextoPlantilla", apariencia.fuenteTexto);
    asignarValor("radioBordePlantilla", apariencia.radioBorde);
}


// =======================================================
// LIMPIAR FORMULARIO PARA UNA NUEVA PLANTILLA
// No elimina el borrador anterior.
// =======================================================

function limpiarFormularioPlantilla() {
    plantillaEditando = null;
    indiceCampoEditando = null;

    plantillaActual = crearPlantillaDefault();

    const titulo = document.getElementById("tituloModalPlantilla");
    const nombre = document.getElementById("nombrePlantilla");
    const descripcion = document.getElementById("descripcionPlantilla");
    const activo = document.getElementById("activoPlantilla");

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

    cargarConfiguracionEnFormulario();
    mostrarCamposPlantilla();
    actualizarVistaPreviaPlantilla();
}


// =======================================================
// CAMPOS DINÁMICOS
// =======================================================

function abrirNuevoCampo() {
    indiceCampoEditando = null;

    const etiqueta = document.getElementById("etiquetaCampo");
    const nombre = document.getElementById("nombreCampo");
    const tipo = document.getElementById("tipoCampo");

    if (etiqueta) etiqueta.value = "";
    if (nombre) nombre.value = "";
    if (tipo) tipo.value = "text";

    const mostrarTarjeta = document.getElementById("mostrarTarjetaCampo");
    const mostrarHistoria = document.getElementById("mostrarHistoriaCampo");

    if (mostrarTarjeta) mostrarTarjeta.checked = true;
    if (mostrarHistoria) mostrarHistoria.checked = true;

    const modal = document.getElementById("modalCampoPlantilla");

    if (modal) {
        modal.style.display = "flex";
    }
}


function cerrarCampoPlantilla() {
    const modal = document.getElementById("modalCampoPlantilla");

    if (modal) {
        modal.style.display = "none";
    }
}


function guardarCampo() {
    const etiqueta =
        document.getElementById("etiquetaCampo")?.value.trim() ?? "";

    const nombre =
        document.getElementById("nombreCampo")?.value.trim() ?? "";

    const tipo =
        document.getElementById("tipoCampo")?.value ?? "text";

    const mostrarTarjeta =
        document.getElementById("mostrarTarjetaCampo")?.checked ?? true;

    const mostrarHistoria =
        document.getElementById("mostrarHistoriaCampo")?.checked ?? true;

    if (!etiqueta || !nombre) {
        mostrarMensajePlantilla(
            "Debés completar la etiqueta y el nombre interno del campo antes de guardar."
        );
        return;
    }

    const campo = {
        etiqueta,
        nombre,
        tipo,
        mostrarTarjeta,
        mostrarHistoria
    };

    if (!plantillaActual.estructura) {
        plantillaActual.estructura = { campos: [] };
    }

    if (!Array.isArray(plantillaActual.estructura.campos)) {
        plantillaActual.estructura.campos = [];
    }

    if (indiceCampoEditando === null) {
        plantillaActual.estructura.campos.push(campo);
    } else {
        plantillaActual.estructura.campos[indiceCampoEditando] = campo;
    }

    cerrarCampoPlantilla();
    mostrarCamposPlantilla();
    actualizarVistaPreviaPlantilla();
    guardarBorradorPlantilla();
}


function mostrarCamposPlantilla() {
    const lista = document.getElementById("listaCamposPlantilla");

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    const campos = plantillaActual?.estructura?.campos || [];

    if (campos.length === 0) {
        lista.innerHTML = "<p>No hay campos agregados.</p>";
        return;
    }

    campos.forEach((campo, indice) => {
        const item = document.createElement("div");
        item.className = "item-campo";

        const informacion = document.createElement("div");

        const etiqueta = document.createElement("strong");
        etiqueta.textContent = campo.etiqueta || campo.nombre || "Campo";

        const nombre = document.createElement("small");
        nombre.textContent = campo.nombre || "";

        const tipo = document.createElement("small");
        tipo.textContent = campo.tipo || "text";

        informacion.append(
            etiqueta,
            document.createElement("br"),
            nombre,
            document.createElement("br"),
            tipo
        );

        const acciones = document.createElement("div");

        // Subir campo
        const botonSubir = document.createElement("button");
        botonSubir.type = "button";
        botonSubir.className = "btn-editar-plantilla";
        botonSubir.textContent = "↑ Subir";
        botonSubir.disabled = indice === 0;
        botonSubir.title = "Mover campo hacia arriba";
        botonSubir.addEventListener("click", () => {
            moverCampoPlantilla(indice, -1);
        });

        // Bajar campo
        const botonBajar = document.createElement("button");
        botonBajar.type = "button";
        botonBajar.className = "btn-editar-plantilla";
        botonBajar.textContent = "↓ Bajar";
        botonBajar.disabled = indice === campos.length - 1;
        botonBajar.title = "Mover campo hacia abajo";
        botonBajar.addEventListener("click", () => {
            moverCampoPlantilla(indice, 1);
        });

        // Editar campo
        const botonEditar = document.createElement("button");
        botonEditar.type = "button";
        botonEditar.className = "btn-editar-plantilla";
        botonEditar.textContent = "Editar";
        botonEditar.addEventListener("click", () => editarCampo(indice));

        // Eliminar campo
        const botonEliminar = document.createElement("button");
        botonEliminar.type = "button";
        botonEliminar.className = "btn-eliminar-plantilla";
        botonEliminar.textContent = "Eliminar";
        botonEliminar.addEventListener("click", () => eliminarCampo(indice));

        acciones.append(
            botonSubir,
            botonBajar,
            botonEditar,
            botonEliminar
        );

        item.append(informacion, acciones);
        lista.appendChild(item);
    });
}


function moverCampoPlantilla(indice, direccion) {
    const campos = plantillaActual?.estructura?.campos;

    if (!Array.isArray(campos)) {
        return;
    }

    const nuevoIndice = indice + direccion;

    if (nuevoIndice < 0 || nuevoIndice >= campos.length) {
        return;
    }

    // Intercambiar la posición de los campos.
    [campos[indice], campos[nuevoIndice]] = [
        campos[nuevoIndice],
        campos[indice]
    ];

    // Actualizar la lista y la vista previa.
    mostrarCamposPlantilla();
    actualizarVistaPreviaPlantilla();

    // Guardar el nuevo orden en el borrador.
    guardarBorradorPlantilla();
}


function editarCampo(indice) {
    const campo = plantillaActual?.estructura?.campos?.[indice];

    if (!campo) {
        return;
    }

    indiceCampoEditando = indice;

    const etiqueta = document.getElementById("etiquetaCampo");
    const nombre = document.getElementById("nombreCampo");
    const tipo = document.getElementById("tipoCampo");
    const mostrarTarjeta = document.getElementById("mostrarTarjetaCampo");
    const mostrarHistoria = document.getElementById("mostrarHistoriaCampo");

    if (etiqueta) etiqueta.value = campo.etiqueta || "";
    if (nombre) nombre.value = campo.nombre || "";
    if (tipo) tipo.value = campo.tipo || "text";

    if (mostrarTarjeta) {
        mostrarTarjeta.checked = campo.mostrarTarjeta ?? true;
    }

    if (mostrarHistoria) {
        mostrarHistoria.checked = campo.mostrarHistoria ?? true;
    }

    const modal = document.getElementById("modalCampoPlantilla");

    if (modal) {
        modal.style.display = "flex";
    }
}


function eliminarCampo(indice) {
    campoEliminar = indice;

    const modal = document.getElementById("modalEliminarCampo");

    if (modal) {
        modal.style.display = "flex";
    }
}


function cerrarEliminarCampoPlantilla() {
    campoEliminar = null;

    const modal = document.getElementById("modalEliminarCampo");

    if (modal) {
        modal.style.display = "none";
    }
}


function confirmarEliminarCampo() {
    if (campoEliminar === null) {
        return;
    }

    plantillaActual.estructura.campos.splice(campoEliminar, 1);

    mostrarCamposPlantilla();
    actualizarVistaPreviaPlantilla();
    guardarBorradorPlantilla();

    cerrarEliminarCampoPlantilla();
}


// =======================================================
// VISTA PREVIA EN EL FORMULARIO
// =======================================================

function actualizarVistaPreviaPlantilla() {
    const contenedor = document.getElementById("vistaPreviaPlantilla");

    if (!contenedor) {
        return;
    }

    leerConfiguracionInterfaz();

    const plantilla = normalizarPlantilla(plantillaActual);
    const interfaz = plantilla.interfaz;
    const apariencia = plantilla.apariencia;
    const campos = plantilla.estructura.campos;

    contenedor.innerHTML = "";

    const preview = document.createElement("div");
    preview.className = "preview-interfaz";

    preview.style.setProperty(
        "--preview-color-principal",
        apariencia.colorPrincipal
    );

    preview.style.setProperty(
        "--preview-color-secundario",
        apariencia.colorSecundario
    );

    preview.style.setProperty(
        "--preview-color-fondo",
        apariencia.colorFondo
    );

    preview.style.setProperty(
        "--preview-color-texto",
        apariencia.colorTexto
    );

    preview.style.setProperty(
        "--preview-fuente-titulo",
        apariencia.fuenteTitulo
    );

    preview.style.setProperty(
        "--preview-fuente-texto",
        apariencia.fuenteTexto
    );

    preview.style.setProperty(
        "--preview-radio",
        `${apariencia.radioBorde}px`
    );

    preview.style.setProperty(
        "--preview-columnas",
        String(interfaz.columnas || 1)
    );

    preview.style.backgroundColor = apariencia.colorFondo;
    preview.style.color = apariencia.colorTexto;
    preview.style.fontFamily = apariencia.fuenteTexto;

    // Encabezado de ejemplo.
    const encabezado = document.createElement("div");
    encabezado.className = "preview-encabezado";

    const titulo = document.createElement("h3");
    titulo.textContent = "Ejemplo de menú";
    titulo.style.color = apariencia.colorPrincipal;
    titulo.style.fontFamily = apariencia.fuenteTitulo;

    encabezado.appendChild(titulo);

    if (interfaz.mostrarBuscador) {
        const buscador = document.createElement("div");
        buscador.className = "preview-buscador";
        buscador.textContent = "⌕  Buscar fichas...";
        encabezado.appendChild(buscador);
    }

    preview.appendChild(encabezado);

    if (interfaz.mostrarIndice) {
        const indice = document.createElement("div");
        indice.className = "preview-indice";
        indice.textContent = "ÍNDICE DE FICHAS";
        preview.appendChild(indice);
    }

    // Contenedor de tarjetas.
    const tarjetas = document.createElement("div");
    tarjetas.className = "preview-tarjetas";

    tarjetas.style.display =
        interfaz.vista === "lista" ? "flex" : "grid";

    if (interfaz.vista === "lista") {
        tarjetas.style.flexDirection = "column";
    } else {
        tarjetas.style.gridTemplateColumns =
            `repeat(${Math.max(1, Number(interfaz.columnas) || 1)}, minmax(0, 1fr))`;
    }

    const tarjeta = document.createElement("article");
    tarjeta.className = "preview-tarjeta";

    tarjeta.style.borderRadius =
        interfaz.formaFicha === "circular"
            ? "50%"
            : interfaz.formaFicha === "redondeada"
                ? "14px"
                : "0";

    tarjeta.style.borderColor = apariencia.colorSecundario;

    if (interfaz.mostrarImagen) {
        const imagen = document.createElement("div");
        imagen.className = "preview-imagen";

        const img = document.createElement("img");
        img.src = "/imagenes/default.png";
        img.alt = "Imagen de ejemplo";
        img.onerror = function () {
            this.style.display = "none";
        };

        imagen.appendChild(img);
        tarjeta.appendChild(imagen);
    }

    const tituloFicha = document.createElement("h4");
    tituloFicha.textContent = "Título de ejemplo";
    tituloFicha.style.color = apariencia.colorPrincipal;
    tituloFicha.style.fontFamily = apariencia.fuenteTitulo;

    tarjeta.appendChild(tituloFicha);

    if (interfaz.mostrarResumen) {
        const resumen = document.createElement("p");
        resumen.textContent = "Aquí se mostrará el resumen de la ficha.";
        tarjeta.appendChild(resumen);
    }

    if (interfaz.mostrarEtiquetas) {
        const etiquetas = document.createElement("div");
        etiquetas.className = "preview-etiquetas";
        etiquetas.textContent = "Etiqueta de ejemplo";
        tarjeta.appendChild(etiquetas);
    }

    campos
        .filter(campo => campo.mostrarTarjeta ?? true)
        .forEach(campo => {
            const campoPreview = document.createElement("div");
            campoPreview.className = "preview-campo";

            const etiqueta = document.createElement("label");
            etiqueta.textContent = campo.etiqueta || campo.nombre || "Campo";

            campoPreview.appendChild(etiqueta);

            if (campo.tipo === "textarea") {
                const control = document.createElement("textarea");
                control.disabled = true;
                control.placeholder = campo.etiqueta || "";
                campoPreview.appendChild(control);
            } else {
                const control = document.createElement("input");
                control.type = [
                    "text", "date", "number", "email", "url"
                ].includes(campo.tipo)
                    ? campo.tipo
                    : "text";

                control.disabled = true;
                control.placeholder = campo.etiqueta || "";

                campoPreview.appendChild(control);
            }

            tarjeta.appendChild(campoPreview);
        });

    tarjetas.appendChild(tarjeta);
    preview.appendChild(tarjetas);

    const configuracion = document.createElement("small");
    configuracion.className = "preview-configuracion";
    configuracion.textContent =
        `Vista: ${interfaz.vista} | Columnas: ${interfaz.columnas}`;

    preview.appendChild(configuracion);
    contenedor.appendChild(preview);
}


// =======================================================
// GUARDAR PLANTILLA
// =======================================================

async function guardarPlantilla() {
    leerConfiguracionInterfaz();

    const nombre =
        document.getElementById("nombrePlantilla")?.value.trim() ?? "";

    const descripcion =
        document.getElementById("descripcionPlantilla")?.value.trim() ?? "";

    const activo =
        document.getElementById("activoPlantilla")?.checked ?? true;

    if (!nombre) {
        mostrarMensajePlantilla(
            "Debés completar el nombre de la plantilla antes de guardar."
        );
        return;
    }

    const claveBorrador = obtenerClaveBorradorPlantilla();
    const estabaEditando = Boolean(plantillaEditando);

    const datos = {
        nombre,
        descripcion,
        activo: activo ? 1 : 0,
        plantilla_json: JSON.stringify(
            normalizarPlantilla(plantillaActual)
        )
    };

    try {
        const url = plantillaEditando
            ? `/api/plantillas/${plantillaEditando}`
            : "/api/plantillas";

        const metodo = plantillaEditando ? "PUT" : "POST";

        const respuesta = await window.fetchProtegido(url, {
            method: metodo,

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            mostrarMensajePlantilla(
                resultado.error || "No se pudo guardar la plantilla."
            );
            return;
        }

        // El borrador solo se elimina después de guardar correctamente.
        if (claveBorrador && window.Borradores) {
            window.Borradores.eliminar("plantillas", claveBorrador);
        }

        cerrarModalPlantilla();

        mostrarMensajePlantilla(
            estabaEditando
                ? "Plantilla actualizada correctamente."
                : "Plantilla creada correctamente."
        );

        await cargarPlantillas();
    } catch (error) {
        console.error("Error guardando plantilla:", error);

        mostrarMensajePlantilla(
            "Ocurrió un error al guardar la plantilla. El borrador se conserva."
        );
    }
}


// =======================================================
// CARGAR PLANTILLAS GUARDADAS
// =======================================================

async function cargarPlantillas() {
    try {
        const respuesta = await window.fetchProtegido("/api/plantillas");

        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar las plantillas.");
        }

        const plantillas = await respuesta.json();
        const contenedor = document.getElementById("gridPlantillas");

        if (!contenedor) {
            return;
        }

        contenedor.innerHTML = "";

        plantillas.forEach(plantilla => {
            let datos = {};

            try {
                datos = typeof plantilla.plantilla_json === "string"
                    ? JSON.parse(plantilla.plantilla_json)
                    : plantilla.plantilla_json || {};
            } catch (error) {
                console.error(
                    "Error leyendo la configuración de una plantilla:",
                    error
                );
            }

            const campos = datos.estructura?.campos || [];
            const tarjeta = document.createElement("article");

            const plantillaActiva =
                plantilla.activo === 1 ||
                plantilla.activo === true ||
                plantilla.activo === "1";

            tarjeta.className = plantillaActiva
                ? "tarjeta-plantilla"
                : "tarjeta-plantilla plantilla-inactiva";

            tarjeta.dataset.idPlantilla = String(plantilla.id_plantilla);

            const informacion = document.createElement("div");
            informacion.className = "info-plantilla";

            const titulo = document.createElement("h3");
            titulo.textContent = plantilla.nombre || "Plantilla sin nombre";

            const descripcion = document.createElement("p");
            descripcion.textContent = plantilla.descripcion || "-";

            const cantidadCampos = document.createElement("small");
            cantidadCampos.textContent =
                `${campos.length} campo${campos.length !== 1 ? "s" : ""}`;

            const salto = document.createElement("br");

            const estado = document.createElement("small");
            estado.textContent = plantillaActiva ? "Activa" : "Inactiva";

            const acciones = document.createElement("div");
            acciones.className = "acciones-plantilla";

            const botonVista = document.createElement("button");
            botonVista.type = "button";
            botonVista.className = "btn-vista-plantilla";
            botonVista.textContent = "Vista previa";
            botonVista.addEventListener("click", () => {
                vistaPreviaPlantilla(plantilla.id_plantilla);
            });

            const botonEditar = document.createElement("button");
            botonEditar.type = "button";
            botonEditar.className = "btn-editar-plantilla";
            botonEditar.textContent = "Editar";
            botonEditar.addEventListener("click", () => {
                editarPlantilla(plantilla.id_plantilla);
            });

            const botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.className = "btn-eliminar-plantilla";
            botonEliminar.textContent = "Eliminar";
            botonEliminar.addEventListener("click", () => {
                abrirEliminarPlantilla(plantilla.id_plantilla);
            });

            acciones.append(botonVista, botonEditar, botonEliminar);

            informacion.append(
                titulo,
                descripcion,
                cantidadCampos,
                salto,
                estado,
                acciones
            );

            tarjeta.appendChild(informacion);
            contenedor.appendChild(tarjeta);
        });
    } catch (error) {
        console.error("Error cargando plantillas:", error);
        mostrarMensajePlantilla("No se pudieron cargar las plantillas.");
    }
}


// =======================================================
// VISTA PREVIA DE UNA PLANTILLA GUARDADA
// Se conserva esta función para el botón "Vista previa".
// =======================================================

async function vistaPreviaPlantilla(id) {
    try {
        const respuesta = await window.fetchProtegido(
            `/api/plantillas/${id}`
        );

        if (!respuesta.ok) {
            throw new Error("No se pudo obtener la plantilla.");
        }

        const plantilla = await respuesta.json();

        const datos = normalizarPlantilla(
            typeof plantilla.plantilla_json === "string"
                ? JSON.parse(plantilla.plantilla_json)
                : plantilla.plantilla_json || {}
        );

        const contenedor =
            document.getElementById("contenidoVistaPlantilla");

        if (!contenedor) {
            return;
        }

        contenedor.innerHTML = "";

        const titulo = document.createElement("h3");
        titulo.textContent = plantilla.nombre || "Plantilla";

        const descripcion = document.createElement("p");
        descripcion.textContent = plantilla.descripcion || "";

        contenedor.append(titulo, descripcion);

        const separador = document.createElement("hr");
        contenedor.appendChild(separador);

        const interfaz = datos.interfaz;
        const campos = datos.estructura.campos;

        if (interfaz.mostrarImagen) {
            const imagenContenedor = document.createElement("div");
            imagenContenedor.className = "preview-imagen";

            const imagen = document.createElement("img");
            imagen.src = "/imagenes/default.png";
            imagen.alt = "Imagen de ejemplo";
            imagen.width = 150;
            imagen.onerror = function () {
                this.style.display = "none";
            };

            imagenContenedor.appendChild(imagen);
            contenedor.appendChild(imagenContenedor);
        }

        const tituloFicha = document.createElement("h2");
        tituloFicha.textContent = "Título de ejemplo";
        contenedor.appendChild(tituloFicha);

        if (interfaz.mostrarResumen) {
            const resumen = document.createElement("p");
            resumen.textContent =
                "Este es un resumen de ejemplo de la ficha.";

            contenedor.appendChild(resumen);
        }

        if (interfaz.mostrarEtiquetas) {
            const etiquetas = document.createElement("p");
            etiquetas.className = "preview-etiquetas";
            etiquetas.textContent = "Etiqueta de ejemplo";
            contenedor.appendChild(etiquetas);
        }

        campos
            .filter(campo => campo.mostrarHistoria ?? true)
            .forEach(campo => {
                const bloque = document.createElement("div");
                bloque.className = "campo-preview";

                const etiqueta = document.createElement("label");
                etiqueta.textContent = campo.etiqueta || campo.nombre || "Campo";

                bloque.appendChild(etiqueta);

                const valor = document.createElement("p");
                valor.textContent = "Contenido de ejemplo";
                bloque.appendChild(valor);

                contenedor.appendChild(bloque);
            });

        const informacionTecnica = document.createElement("small");
        informacionTecnica.textContent =
            `Vista: ${interfaz.vista} | Columnas: ${interfaz.columnas}`;

        contenedor.appendChild(informacionTecnica);

        const modal = document.getElementById("modalVistaPlantilla");

        if (modal) {
            modal.style.display = "flex";
        }
    } catch (error) {
        console.error("Error mostrando vista previa:", error);

        mostrarMensajePlantilla(
            "No se pudo mostrar la vista previa de la plantilla."
        );
    }
}


function cerrarPreviewPlantilla() {
    const modal = document.getElementById("modalVistaPlantilla");

    if (modal) {
        modal.style.display = "none";
    }
}


// =======================================================
// EDITAR PLANTILLA
// =======================================================

async function editarPlantilla(id) {
    try {
        const respuesta = await window.fetchProtegido(
            `/api/plantillas/${id}`
        );

        if (!respuesta.ok) {
            throw new Error("No se pudo obtener la plantilla.");
        }

        const plantilla = await respuesta.json();

        plantillaEditando = id;

        plantillaActual = normalizarPlantilla(
            typeof plantilla.plantilla_json === "string"
                ? JSON.parse(plantilla.plantilla_json)
                : plantilla.plantilla_json || {}
        );

        const titulo = document.getElementById("tituloModalPlantilla");
        const nombre = document.getElementById("nombrePlantilla");
        const descripcion = document.getElementById("descripcionPlantilla");
        const activo = document.getElementById("activoPlantilla");

        if (titulo) titulo.textContent = "Editar plantilla";
        if (nombre) nombre.value = plantilla.nombre || "";
        if (descripcion) descripcion.value = plantilla.descripcion || "";

        if (activo) {
            activo.checked = plantilla.activo == 1;
        }

        cargarConfiguracionEnFormulario();
        mostrarCamposPlantilla();
        actualizarVistaPreviaPlantilla();

        const modal = document.getElementById("modalPlantilla");

        if (modal) {
            modal.style.display = "flex";
        }

        // Si existe un borrador de esta plantilla, recuperarlo.
        recuperarBorradorPlantilla();
    } catch (error) {
        console.error("Error editando plantilla:", error);

        mostrarMensajePlantilla("No se pudo abrir la plantilla para editar.");
    }
}


// =======================================================
// ELIMINAR PLANTILLA
// =======================================================

function abrirEliminarPlantilla(id) {
    plantillaEliminar = id;

    const modal = document.getElementById("modalEliminarPlantilla");

    if (modal) {
        modal.style.display = "flex";
    }
}


function cerrarEliminarPlantilla() {
    plantillaEliminar = null;

    const modal = document.getElementById("modalEliminarPlantilla");

    if (modal) {
        modal.style.display = "none";
    }
}


async function confirmarEliminarPlantilla() {
    if (plantillaEliminar === null) {
        return;
    }

    try {
        const respuesta = await window.fetchProtegido(
            `/api/plantillas/${plantillaEliminar}`,
            {
                method: "DELETE"
            }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            mostrarMensajePlantilla(
                resultado.error || "No se pudo eliminar la plantilla."
            );
            return;
        }

        cerrarEliminarPlantilla();
        await cargarPlantillas();

        mostrarMensajePlantilla("Plantilla eliminada correctamente.");
    } catch (error) {
        console.error("Error eliminando plantilla:", error);

        mostrarMensajePlantilla(
            "Ocurrió un error al eliminar la plantilla."
        );
    }
}


// =======================================================
// MENSAJES
// =======================================================

function mostrarMensajePlantilla(mensaje) {
    const texto = document.getElementById("textoMensajePlantilla");
    const modal = document.getElementById("modalMensajePlantilla");

    if (texto) {
        texto.textContent = mensaje;
    }

    if (modal) {
        modal.style.display = "flex";
    }
}


function cerrarMensajePlantilla() {
    const modal = document.getElementById("modalMensajePlantilla");

    if (modal) {
        modal.style.display = "none";
    }

    plantillaEliminar = null;
}


// =======================================================
// EVENTOS DE BOTONES
// =======================================================

document.addEventListener("click", function (event) {
    const boton = event.target.closest("button");

    if (!boton) {
        return;
    }

    switch (boton.id) {
        case "btnGuardarPlantilla":
            guardarPlantilla();
            break;

        case "btnNuevoCampo":
            abrirNuevoCampo();
            break;

        case "btnGuardarCampo":
            guardarCampo();
            break;
    }
});


// =======================================================
// CERRAR MODALES AL HACER CLIC EN EL FONDO
// =======================================================

document.addEventListener("click", function (event) {
    const modal = event.target;

    if (
        modal instanceof HTMLElement &&
        modal.classList.contains("modal-plantilla")
    ) {
        modal.style.display = "none";
    }
});