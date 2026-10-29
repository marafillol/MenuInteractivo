console.log("Modulo menus cargado");


const BORRADOR_MENU_NUEVO = "nuevo";
let guardandoMenu = false;

function obtenerDatosBorradorMenu() {
    return {
        nombre: document.getElementById("nuevoNombre")?.value ?? "",
        descripcion: document.getElementById("nuevaDescripcion")?.value ?? "",
        id_plantilla: document.getElementById("plantillaMenu")?.value ?? "",
        visible: document.getElementById("nuevoVisible")?.checked ?? true
    };
}

function guardarBorradorMenu() {
    if (!window.Borradores) return;

    const id = document.getElementById("id_menu")?.value || BORRADOR_MENU_NUEVO;
    const datos = obtenerDatosBorradorMenu();

    window.Borradores.guardar("menus", id, datos);
}

function recuperarBorradorMenu(id = BORRADOR_MENU_NUEVO) {
    if (!window.Borradores) return false;

    const borrador = window.Borradores.leer("menus", id);
    if (!borrador?.datos) return false;

    const datos = borrador.datos;

    const nombre = document.getElementById("nuevoNombre");
    const descripcion = document.getElementById("nuevaDescripcion");
    const plantilla = document.getElementById("plantillaMenu");
    const visible = document.getElementById("nuevoVisible");

    if (nombre) nombre.value = datos.nombre ?? "";
    if (descripcion) descripcion.value = datos.descripcion ?? "";
    if (plantilla) plantilla.value = datos.id_plantilla ?? "";
    if (visible) visible.checked = datos.visible ?? true;

    return true;
}

function obtenerFechaMenu(menu) {
    const creado = menu.creado;
    const actualizado = menu.actualizado;

    // Si no hay fecha de actualización, usar la de creación.
    if (!actualizado) {
        return {
            etiqueta: "Creado",
            fecha: formatearFechaMenu(creado)
        };
    }

    // Si las dos fechas son iguales, todavía no hubo cambios.
    const fechaCreacion = new Date(creado).getTime();
    const fechaActualizacion = new Date(actualizado).getTime();

    if (
        Number.isFinite(fechaCreacion) &&
        fechaCreacion === fechaActualizacion
    ) {
        return {
            etiqueta: "Creado",
            fecha: formatearFechaMenu(creado)
        };
    }

    return {
        etiqueta: "Última modificación",
        fecha: formatearFechaMenu(actualizado)
    };
}

function formatearFechaMenu(fecha) {
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

function obtenerRutaImagenMenu(ruta) {

    if (!ruta) {
        return "/imagenes/default.png";
    }

    if (/^(https?:|data:)/i.test(ruta)) {
        return ruta;
    }

    return ruta.startsWith("/") ? ruta : `/${ruta}`;
}



async function cargarMenus() {
    // Identificar la navegación en la que comenzó esta carga.
    const idCarga = window.__idCargaVentana;
    const ventanaInicial = window.__ultimaVentanaPanel;

    // No iniciar la carga si Menús no es la ventana activa.
    if (ventanaInicial !== "menus") {
        return;
    }

    const esCargaActual = () =>
        idCarga === window.__idCargaVentana &&
        window.__ultimaVentanaPanel === "menus";

    try {
        const respuesta =
            await window.fetchProtegido("/api/menus");

        // Si el usuario cambió de ventana, descartar la respuesta.
        if (!esCargaActual()) return;

        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar los menús.");
        }

        const menus = await respuesta.json();

        // Comprobar nuevamente después del procesamiento asíncrono.
        if (!esCargaActual()) return;

        const contenedor = document.getElementById("listaMenus");

        // Si la ventana cambió mientras se procesaba la respuesta,
        // descartar esta carga obsoleta.
        if (!esCargaActual()) {
            return;
        }

        if (!contenedor) {
            console.error(
                "[MENÚS] La navegación sigue siendo Menús, pero no existe #listaMenus.",
                {
                    idCarga,
                    ventanaActual: window.__ultimaVentanaPanel,
                    url: window.location.href
                }
            );
            return;
        }

        const esConsulta =
            window.usuarioActual?.rol === "consulta";

        contenedor.innerHTML = "";

        menus.forEach(menu => {
            const fechaMenu = obtenerFechaMenu(menu);

            contenedor.innerHTML += `
                <article class="menu-tarjeta ${
                    menu.visible == 0 ? "menu-desactivado" : ""
                }">
                    <div class="menu-imagen">
                        <img
                            src="${obtenerRutaImagenMenu(menu.imagen)}"
                            onerror="this.onerror=null;this.src='/img/no-image.png'"
                        />
                    </div>

                    <div class="menu-info">
                        <span class="campo-titulo-menu">TÍTULO</span>
                        <h3>${menu.nombre}</h3>

                        <p>
                            ${(menu.descripcion || "Sin descripcion")
                                .replace(/\n/g, " ")}
                        </p>

                        <div class="datos-menu">
                            <small>
                                <i data-lucide="layers" aria-hidden="true"></i>
                                Plantilla: ${menu.nombre_plantilla || "Sin nombre"}
                                - #${menu.id_plantilla ?? "Sin asignar"}
                            </small>

                            <small>
                                <i data-lucide="calendar" aria-hidden="true"></i>
                                ${fechaMenu.etiqueta}: ${fechaMenu.fecha}
                            </small>
                        </div>

                        <div class="menu-acciones">
                            <button
                                class="menu-btn-vista"
                                onclick="vistaPreviaMenu(${menu.id_menu})">
                                Vista previa
                            </button>

                            <button
                                class="menu-btn-ver"
                                onclick='verMenu(${menu.id_menu}, ${JSON.stringify(menu.nombre)})'>
                                Ver Fichas
                            </button>

                            ${!esConsulta ? `
                                <button
                                    class="menu-btn-editar"
                                    onclick="editarMenu(${menu.id_menu})">
                                    Editar
                                </button>

                                <button
                                    class="menu-btn-eliminar"
                                    onclick="abrirEliminarMenu(${menu.id_menu})">
                                    Eliminar
                                </button>
                            ` : ""}
                        </div>
                    </div>
                </article>
            `;
        });

        if (!esCargaActual()) return;

        if (window.lucide) {
            window.lucide.createIcons();
        }

    } catch (error) {
        // No informar como error de la ventana activa una carga obsoleta.
        if (!esCargaActual()) return;

        console.error("Error cargando menús:", error);
    }
}





// =====================================
// ABRIR MENU Y VER SUS FICHAS
// =====================================

function verMenu(id_menu, nombre){

    menuSeleccionado = id_menu;

    nombreMenuSeleccionado = nombre;

    cargarVentana("fichas", true);

}

async function crearMenu(datos){

    try{

        const respuesta = await window.fetchProtegido("/api/menus",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify(datos)

        });


        const resultado = await respuesta.json();


        console.log("Menú creado:", resultado);


        cargarMenus();


    }catch(error){

        console.error(
            "Error creando menú:",
            error
        );

    }

}




async function guardarNuevoMenu(){

    const id_menu = document.getElementById("id_menu").value;

    const nombre =
        document.getElementById("nuevoNombre").value.trim();

    const descripcion =
        document.getElementById("nuevaDescripcion").value.trim();

    const id_plantilla =
        document.getElementById("plantillaMenu").value;

    // ==========================
    // VALIDACIONES
    // ==========================

    if(nombre === ""){

        mostrarMensaje(
            "Campos obligatorios",
            "Debe ingresar un nombre para el menú."
        );

        document.getElementById("nuevoNombre").focus();

        return;

    }

    if(id_plantilla === ""){

        mostrarMensaje(
            "Campos obligatorios",
            "Debe seleccionar una plantilla."
        );

        document.getElementById("plantillaMenu").focus();

        return;
    }

    const formulario = new FormData();

    formulario.append("nombre", nombre);

    formulario.append("descripcion", descripcion);

    formulario.append("id_plantilla", id_plantilla);

    formulario.append(
        "visible",
        document.getElementById("nuevoVisible").checked ? 1 : 0
    );

    const imagen =
        document.getElementById("nuevaImagen").files[0];

    console.log(
        "Imagen seleccionada:",
        imagen ? imagen.name : "ninguna"
    );

    if(imagen){

        formulario.append(
            "imagen",
            imagen
        );

    }

    if (guardandoMenu) {
        return;
    }

    guardandoMenu = true;

    try {

        const url = id_menu
            ? `/api/menus/${id_menu}`
            : "/api/menus";

        const metodo = id_menu
            ? "PUT"
            : "POST";

        const respuesta = await window.fetchProtegido(url,{

            method: metodo,

            body: formulario

        });

        const resultado = await respuesta.json();

        if(!respuesta.ok){

            mostrarMensaje(
                "No se pudo guardar",
                resultado.error || "Ocurrió un error al guardar el menú."
            );

            return;

        }

        console.log("Menú guardado:", resultado);

        const idBorrador = id_menu || BORRADOR_MENU_NUEVO;

        if (window.Borradores) {
            window.Borradores.eliminar("menus", idBorrador);
        }

        document.getElementById("ventanaEmergente").style.display = "none";

        cargarMenus();

    } catch(error){

        console.error("Error guardando menú:", error);

        mostrarMensaje(
            "Error",
            "Ocurrió un error al guardar el menú."
        );

    } finally {

        guardandoMenu = false;

    }

}

// ==========================================================
// EVENTOS DE MENú
// ==========================================================

if (!window.__eventosMenusInicializados) {

    window.__eventosMenusInicializados = true;

    document.addEventListener("click", function(e) {

        console.log("Click detectado:", e.target);

        // ==================================================
        // NUEVO MENÃš
        // ==================================================

        if (e.target.closest("#nuevoMenu")) {

            const modal =
                document.getElementById("ventanaEmergente");

            if (!modal) {
                return;
            }

            modal.style.display = "flex";

            const titulo =
                modal.querySelector(".modal-contenido h3");

            if (titulo) {
                titulo.textContent = "Crear nuevo menú";
            }

            const bloqueImagen =
                document.getElementById("bloqueImagenActual");

            if (bloqueImagen) {
                bloqueImagen.style.display = "none";
            }

            document.getElementById("id_menu").value = "";
            document.getElementById("nuevoNombre").value = "";
            document.getElementById("nuevaDescripcion").value = "";


            const plantilla =
                document.getElementById("plantillaMenu");

            if (plantilla) {
                plantilla.disabled = false;
                plantilla.title = "";
                plantilla.selectedIndex = 0;
            }


            const visible =
                document.getElementById("nuevoVisible");

            if (visible) {
                visible.checked = true;
            }

            const imagen =
                document.getElementById("nuevaImagen");

            if (imagen) {
    imagen.value = "";
}

recuperarBorradorMenu("nuevo");

return;
        }

        // ==================================================
        // CERRAR MODAL MENÃš
        // ==================================================

        if (
            e.target.closest("#cerrarModal") ||
            e.target.closest("#cancelarMenu")
        ) {

            const idMenu = document.getElementById("id_menu").value;
            const idBorrador = idMenu || BORRADOR_MENU_NUEVO;

            if (window.Borradores) {
                window.Borradores.eliminar("menus", idBorrador);
            }
            const modal =
                document.getElementById("ventanaEmergente");

            if (modal) {
                modal.style.display = "none";
            }

            const imagen =
                document.getElementById("nuevaImagen");

            if (imagen) {
                imagen.value = "";
            }

            return;
        }

    });

}

async function cargarSelectPlantillas(idPlantillaActual = null) {
    try {
        const respuesta = await window.fetchProtegido("/api/plantillas");

        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar las plantillas.");
        }

        const plantillas = await respuesta.json();
        const select = document.getElementById("plantillaMenu");

        if (!select) {
            return;
        }

        const seleccionActual = select.value;
        const idActual = idPlantillaActual == null
            ? ""
            : String(idPlantillaActual);

        select.innerHTML = `
            <option value="">Seleccione una plantilla</option>
        `;

        plantillas.forEach(plantilla => {
            const activa =
                plantilla.activo === 1 ||
                plantilla.activo === true ||
                plantilla.activo === "1";

            const perteneceAlMenuActual =
                idActual !== "" &&
                String(plantilla.id_plantilla) === idActual;

            // Mostrar activas siempre e inactivas únicamente
            // si ya están asignadas al menú que se está editando.
            if (!activa && !perteneceAlMenuActual) {
                return;
            }

            const opcion = document.createElement("option");
            opcion.value = plantilla.id_plantilla;
            opcion.textContent = activa
                ? plantilla.nombre
                : `${plantilla.nombre} (Inactiva)`;

            select.appendChild(opcion);
        });

        const valorASeleccionar = idActual || seleccionActual;

        if (
            valorASeleccionar &&
            [...select.options].some(
                opcion => opcion.value === String(valorASeleccionar)
            )
        ) {
            select.value = String(valorASeleccionar);
        }

    } catch (error) {
        console.error("Error cargando plantillas para el menú:", error);
    }
}

console.log("Eventos de menu preparados");


if (!window.__autoguardadoMenusInicializado) {
    window.__autoguardadoMenusInicializado = true;

    document.addEventListener("input", (e) => {
        if (e.target.closest("#formularioMenu")) {
            guardarBorradorMenu();
        }
    });

    document.addEventListener("change", (e) => {
        if (e.target.closest("#formularioMenu")) {
            guardarBorradorMenu();
        }
    });
}




window.addEventListener("click", function(e){

    const modal = document.getElementById("ventanaEmergente");

    if(e.target === modal){

        modal.style.display = "none";

    }

});

async function editarMenu(id_menu){

    try{

        const respuesta = await window.fetchProtegido(`/api/menus/${id_menu}`);

        const menu = await respuesta.json();

        document.getElementById("id_menu").value = menu.id_menu;

        document.getElementById("nuevoNombre").value = menu.nombre;

        document.getElementById("nuevaDescripcion").value = menu.descripcion || "";



        await cargarSelectPlantillas(menu.id_plantilla);

        const selectorPlantilla = document.getElementById("plantillaMenu");
        selectorPlantilla.value = String(menu.id_plantilla);
        selectorPlantilla.disabled = false;
        selectorPlantilla.title = "";





        document.getElementById("nuevoVisible").checked = menu.visible == 1;

        document.getElementById("nuevaImagen").value = "";

        document.querySelector(
        "#ventanaEmergente .modal-contenido h3"
        ).textContent =
            "Editar menú";

        document.getElementById("bloqueImagenActual").style.display = "block";

        document.getElementById("ventanaEmergente").style.display = "flex";

        recuperarBorradorMenu(String(id_menu));

        const preview = document.getElementById("previewImagen");



        if(menu.imagen){

            preview.src = obtenerRutaImagenMenu(menu.imagen);

        }else{

            preview.src = "/imagenes/default.png";

        }

    }catch(error){

        console.error("Error cargando menú:", error);

    }

}

function abrirEliminarMenu(id_menu){

    idMenuEliminar = id_menu;

    document.getElementById(
        "modalConfirmarEliminar"
    ).style.display = "flex";

}

async function confirmarEliminarMenu(){

    try{

        const respuesta =
        await window.fetchProtegido(`/api/menus/${idMenuEliminar}`,{
            method:"DELETE"
        });

        const resultado = await respuesta.json();

        console.log("[ELIMINAR MENÚ] Estado HTTP:", respuesta.status);
        console.log(
            "[ELIMINAR MENÚ] Respuesta completa:",
            JSON.stringify(resultado, null, 2)
        );
        console.log(
            "[ELIMINAR MENÚ] Tipo de respuesta:",
            typeof resultado
        );
        console.log(
            "[ELIMINAR MENÚ] Propiedades:",
            Object.keys(resultado || {})
        );

        if (!respuesta.ok) {
            cerrarConfirmacion();

            if (Array.isArray(resultado.fichas) && resultado.fichas.length > 0) {
                mostrarBloqueoEliminarMenu(resultado);
            } else {
                mostrarMensaje("No se pudo eliminar", resultado.error);
            }

            return;
        }

        cerrarConfirmacion();

        cargarMenus();

    }catch(error){

        console.error(error);

    }

}





function mostrarMensaje(titulo, texto) {
    const modal =
        document.getElementById("modalMensaje") ||
        document.getElementById("modalMensajeFicha");

    const tituloElemento = modal?.querySelector("#tituloMensaje");
    const textoElemento = modal?.querySelector("#textoMensaje");

    if (!modal || !tituloElemento || !textoElemento) {
        console.error(`${titulo}: ${texto}`);
        return;
    }

    tituloElemento.textContent = titulo;
    textoElemento.textContent = texto;

    const listaFichas = modal.querySelector("#listaFichasBloqueo");
    const accionesFichas = modal.querySelector("#accionesFichasBloqueo");

    if (listaFichas) {
        listaFichas.replaceChildren();
        listaFichas.style.display = "none";
    }

    if (accionesFichas) {
        accionesFichas.style.display = "none";
    }
    modal.style.display = "flex";
}
function mostrarBloqueoEliminarMenu(resultado) {
    const modal = document.getElementById("modalMensaje");
    const titulo = modal?.querySelector("#tituloMensaje");
    const texto = modal?.querySelector("#textoMensaje");
    const lista = document.getElementById("listaFichasBloqueo");
    const acciones = document.getElementById("accionesFichasBloqueo");

    if (!modal || !titulo || !texto || !lista || !acciones) {
        mostrarMensaje("No se pudo eliminar", resultado.error);
        return;
    }

    // Guardar el menú para poder acceder a sus fichas.
    window.menuBloqueadoParaFichas = resultado.menu;

    titulo.textContent = "No se puede eliminar el menú";
    texto.textContent =
        "Este menú tiene fichas asociadas. Para eliminarlo, primero debe resolver esa asociación.";

    // No mostrar los títulos ni los nombres de las fichas.
    lista.replaceChildren();
    lista.style.display = "none";

    // Mostrar únicamente las acciones disponibles.
    acciones.style.display = "flex";

    modal.style.display = "flex";
}

function irAFichasMenuBloqueado() {
    const menu = window.menuBloqueadoParaFichas;

    if (!menu) return;

    cerrarMensaje();
    verMenu(menu.id_menu, menu.nombre);
}

function cerrarMensaje(){

    document.getElementById("modalMensaje").style.display = "none";

}

function cerrarConfirmacion(){

    idMenuEliminar = null;

    document.getElementById(
        "modalConfirmarEliminar"
    ).style.display = "none";

}


async function vistaPreviaMenu(id_menu){

    try{

        const respuesta = await window.fetchProtegido(`/api/menus/${id_menu}`);

        const menu = await respuesta.json();

        document.getElementById("previewId").textContent =
            menu.id_menu;

        document.getElementById("previewNombre").textContent =
            menu.nombre;

        document.getElementById("previewDescripcion").textContent =
            menu.descripcion || "-";

        document.getElementById("previewPlantilla").textContent =
            `N.º ${menu.id_plantilla ?? "Sin asignar"} — ${menu.nombre_plantilla || "Sin nombre"}`;

        document.getElementById("previewVisible").textContent =
            menu.visible == 1 ? "SÍ" : "No";


        function separarFechaHora(valor) {
            if (
                valor === null ||
                valor === undefined ||
                valor === "" ||
                valor === "undefined" ||
                valor === "null"
            ) {
                return { fecha: "-", hora: "-" };
            }

            const fecha = new Date(valor);

            if (Number.isNaN(fecha.getTime())) {
                return { fecha: "-", hora: "-" };
            }

            return {
                fecha: fecha.toLocaleDateString("es-AR"),
                hora: fecha.toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false
                })
            };
        }

        const creado = separarFechaHora(menu.creado);

        document.getElementById("previewCreadoFecha").textContent =
            creado.fecha;

        document.getElementById("previewCreadoHora").textContent =
            creado.hora;

        const actualizado = separarFechaHora(menu.actualizado);

        document.getElementById("previewActualizadoFecha").textContent =
            actualizado.fecha;

        document.getElementById("previewActualizadoHora").textContent =
            actualizado.hora;

        const imagen = document.getElementById("previewMenuImagen");

        if(menu.imagen){

            imagen.src = obtenerRutaImagenMenu(menu.imagen);

        }else{

            imagen.src = "/imagenes/default.png";

        }

        document.getElementById("modalVistaPrevia").style.display = "flex";

    }catch(error){

        console.error("Error cargando vista previa:", error);

    }

}


function cerrarVistaPrevia(){

    document.getElementById("modalVistaPrevia").style.display = "none";

}
