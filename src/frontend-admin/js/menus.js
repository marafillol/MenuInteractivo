console.log("Modulo menus cargado");


const BORRADOR_MENU_NUEVO = "nuevo";

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


function obtenerRutaImagenMenu(ruta) {

    if (!ruta) {
        return "/imagenes/default.png";
    }

    if (/^(https?:|data:)/i.test(ruta)) {
        return ruta;
    }

    return ruta.startsWith("/") ? ruta : `/${ruta}`;
}



async function cargarMenus(){

    try{

        const respuesta = await window.fetchProtegido("/api/menus");

        const menus = await respuesta.json();

        const esConsulta = window.usuarioActual?.rol === "consulta";


        const contenedor = document.getElementById("listaMenus");


        if(!contenedor){

            console.error("No existe listaMenus");

            return;
        }


        contenedor.innerHTML="";



        menus.forEach(menu=>{


            console.log(menu);



            contenedor.innerHTML += `


            <article class="menu-tarjeta ${menu.visible == 0 ? "menu-desactivado" : ""}">


                <div class="menu-imagen">

                    <img
                    src="${obtenerRutaImagenMenu(menu.imagen)}"
                    onerror="this.onerror=null;this.src='/img/no-image.png'"
                    />

                </div>



                <div class="menu-info">

                    <span class="campo-titulo-menu">
                        TÍTULO
                    </span>
                    <h3>
                        ${menu.nombre}
                    </h3>



                    <p>
                        ${(menu.descripcion || "Sin descripcion").replace(/\n/g," ")}
                    </p>



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


    }catch(error){


        console.error(
            "Error cargando menus:",
            error
        );


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

    try{

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

    }catch(error){

        console.error("Error guardando menú:", error);

        mostrarMensaje(
            "Error",
            "Ocurrió un error al guardar el menú."
        );

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

async function cargarSelectPlantillas(){

    try{

        const respuesta = await window.fetchProtegido("/api/plantillas");
        const plantillas = await respuesta.json();

        const select = document.getElementById("plantillaMenu");

        if(!select){
            return;
        }

        select.innerHTML = `
            <option value="">
                Seleccione una plantilla
            </option>
        `;

        plantillas.forEach(plantilla=>{

            select.innerHTML += `
                <option value="${plantilla.id_plantilla}">
                    ${plantilla.nombre}
                </option>
            `;

        });

    }catch(error){

        console.error(error);

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

        document.getElementById("plantillaMenu").value = menu.id_plantilla;

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

        const resultado =
        await respuesta.json();

        if(!respuesta.ok){

            cerrarConfirmacion();

            mostrarMensaje(
                "No se pudo eliminar",
                resultado.error
            );

            return;

        }

        cerrarConfirmacion();

        cargarMenus();

    }catch(error){

        console.error(error);

    }

}


function mostrarMensaje(titulo, texto){

    document.getElementById("tituloMensaje").textContent = titulo;

    document.getElementById("textoMensaje").textContent = texto;

    document.getElementById("modalMensaje").style.display = "flex";

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
            menu.id_plantilla;

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
