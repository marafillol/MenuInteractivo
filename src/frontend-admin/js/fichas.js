console.log("Modulo fichas cargado");

let fichaEliminar = null;
let fichaEditando = null;


// Relaciones antes de guardar
let relacionesPendientes = [];

async function cargarFichas(){

    try{


        const botonNuevaFicha =
        document.getElementById("nuevaFicha");

        const barraVolver =
        document.getElementById("barraVolver");

        let url = "/api/fichas";


        const titulo =
        document.getElementById("tituloFichas");

        const subtitulo =
        document.getElementById("subtituloFichas");

        if(menuSeleccionado){

            url = `/api/fichas/menu/${menuSeleccionado}`;

            botonNuevaFicha.style.display = "none";

            barraVolver.style.display = "block";

            titulo.textContent = `📂 Menú de ${nombreMenuSeleccionado}`;

        }else{

            botonNuevaFicha.style.display = "inline-block";

            barraVolver.style.display = "none";

            titulo.textContent = "Gestión de Fichas";

            subtitulo.textContent = "";

        }


        const respuesta = await window.fetchProtegido(url);

        const fichas = await respuesta.json();

        const esConsulta = window.usuarioActual?.rol === "consulta";


        if(menuSeleccionado){

            subtitulo.textContent =
                `${fichas.length} ficha${fichas.length !== 1 ? "s" : ""} asociada${fichas.length !== 1 ? "s" : ""}`;

        }


        const contenedor = document.getElementById("listaFichas");


        if(!contenedor){
            console.error("No existe listaFichas");
            return;
        }


        contenedor.innerHTML = "";


        fichas.forEach(ficha=>{

            console.log(ficha);

            contenedor.innerHTML += `

            <article class="tarjeta-ficha ${ficha.visible == 0 ? "ficha-desactivada" : ""}">

                <div class="imagen-ficha">

                <img
                    src="/${(ficha.imagen || "").replace("public/","")}"
                    onerror="this.onerror=null;this.src='/imagenes/default.png'"
                />

                </div>


                <div class="info-ficha">


                    <span class="campo-titulo-ficha">
                        Título
                    </span>


                    <h3>
                        ${ficha.titulo || "Sin título"}
                    </h3>


                    <p>
                        ${ficha.resumen || ""}
                    </p>


                    <small>
                        Menú: ${ficha.menu || "-"}
                    </small>


                    <div class="acciones-ficha">


                    <button
                    class="btn-vista"
                    onclick="vistaPreviaFicha(${ficha.id_ficha})">

                    Vista previa

                    </button>



                    <button
                        class="btn-ver"
                        onclick="verMultimediaFicha(${ficha.id_ficha}, '${ficha.titulo}')">

                        Ver multimedia

                    </button>



                    ${!esConsulta ? `
                    <button class="btn-editar" onclick="editarFicha(${ficha.id_ficha})">
                        Editar
                    </button>

                    <button class="btn-eliminar" onclick="abrirEliminarFicha(${ficha.id_ficha})">
                        Eliminar
                    </button>
                    ` : ""}


                    </div>


                </div>


            </article>

            `;

        });


    }catch(error){

        console.error("Error cargando fichas:", error);

    }

}

// ===================================
// VISTA PREVIA FICHA
// ===================================
async function vistaPreviaFicha(id_ficha){

    try{

        // ===============================
        // Obtener ficha
        // ===============================

        const respuesta =
        await window.fetchProtegido(`/api/fichas/${id_ficha}`);

        const ficha =
        await respuesta.json();

        // ===============================
        // Completar datos generales
        // ===============================

        document.getElementById("vpFichaId").textContent =
        ficha.id_ficha;

        document.getElementById("vpFichaMenu").textContent =
        ficha.id_menu;

        document.getElementById("vpFichaTitulo").textContent =
        ficha.titulo;

        document.getElementById("vpFichaResumen").textContent =
        ficha.resumen || "-";

        document.getElementById("vpFichaTexto").textContent =
        ficha.texto || "-";

        document.getElementById("vpFichaVisible").textContent =
        ficha.visible == 1 ? "Sí" : "No";

        document.getElementById("vpFichaUsuario").textContent =
        ficha.id_usuario || "-";

        document.getElementById("vpFichaCreado").textContent =
            mostrarFechaArgentina(ficha.creado);


        document.getElementById("vpFichaActualizado").textContent =
            mostrarFechaArgentina(ficha.actualizado);

        // ===============================
        // Imagen
        // ===============================

        const imagen =
        document.getElementById("vpFichaImagen");

        if(ficha.imagen){

            imagen.src = "/" + ficha.imagen;

        }else{

            imagen.src = "/imagenes/default.png";

        }

        // ===============================
        // Datos dinámicos
        // ===============================

        const contenedor =
        document.getElementById("vpCamposDinamicos");

        contenedor.innerHTML = "";

        const respuestaPlantilla =
        await window.fetchProtegido(`/api/plantillas/menu/${ficha.id_menu}`);

        if(respuestaPlantilla.ok){

            const plantilla =
            await respuestaPlantilla.json();

            const datos =
            ficha.datos_json
                ? JSON.parse(ficha.datos_json)
                : {};

            const campos =
                plantilla.plantilla_json?.estructura?.campos || [];

            campos.forEach(campo=>{

                contenedor.innerHTML += `
                    <div class="campo-preview">

                        <span class="titulo-preview">
                            ${campo.etiqueta}
                        </span>

                        <span class="valor-preview">
                            ${datos[campo.nombre] || "-"}
                        </span>

                    </div>
                `;

            });

        }else{

            contenedor.innerHTML =
            "<p>No fue posible cargar la plantilla.</p>";

        }

        // ===============================
        // Etiquetas relacionadas
        // ===============================

        const respuestaEtiquetas =
        await window.fetchProtegido(`/api/fichas/${id_ficha}/etiquetas`);

        const etiquetas =
        await respuestaEtiquetas.json();

       const contenedorEtiquetas =
       document.getElementById("vistaEtiquetasFicha");

        contenedorEtiquetas.innerHTML = "";

        if(etiquetas.length === 0){

            contenedorEtiquetas.innerHTML =
            "<span class='sin-etiquetas'>Sin etiquetas</span>";

        }else{

            etiquetas.forEach(etiqueta=>{

                contenedorEtiquetas.innerHTML += `
                    <span class="etiqueta-vista">

                        🏷️ ${etiqueta.nombre}

                    </span>
                `;

            });

        }

        // ===============================
        // Fichas relacionadas
        // ===============================

        const respuestaRelaciones =
        await window.fetchProtegido(`/api/relacion-ficha/${id_ficha}`);


        const relaciones =
        await respuestaRelaciones.json();


        const contenedorRelaciones =
        document.getElementById("vistaRelacionesFicha");


        if(contenedorRelaciones){

            contenedorRelaciones.innerHTML = "";


            if(relaciones.length === 0){

                contenedorRelaciones.innerHTML =
                "<span class='sin-relaciones'>Sin fichas relacionadas</span>";

            }else{


                relaciones.forEach(relacion=>{


                    contenedorRelaciones.innerHTML += `

                        <div class="relacion-vista">

                            <strong>
                                ${relacion.titulo}
                            </strong>

                            <span>
                                ${relacion.tipo_relacion}
                            </span>

                        </div>

                    `;


                });


            }

        }


        // ===============================
        // Mostrar modal
        // ===============================

        document.getElementById("modalVistaFicha")
        .style.display = "flex";

    }catch(error){

        console.error(
            "Error vista previa:",
            error
        );

    }

}

async function editarFicha(id_ficha){


    console.log("Editando ficha:", id_ficha);


    try{


        // ===============================
        // Guardar ficha actual
        // ===============================

        fichaEditando = id_ficha;



        const respuesta = await window.fetchProtegido(
            `/api/fichas/${id_ficha}`
        );



        const ficha = await respuesta.json();



        console.log("Ficha recibida:", ficha);





        const modal =
        document.getElementById("modalFicha");



        // guardar datos de referencia

        modal.dataset.idFicha = id_ficha;

        modal.dataset.idMenu = ficha.id_menu;





        await cargarTiposFicha();




        document.getElementById("tipoFicha").value =
            ficha.id_menu;




        document.getElementById("tipoFicha")
        .dispatchEvent(
            new Event("change")
        );





        // abrir modal

        modal.style.display = "flex";






        // ===============================
        // Datos básicos
        // ===============================


        document.getElementById("tituloFicha").value =
            ficha.titulo || "";



        document.getElementById("resumenFicha").value =
            ficha.resumen || "";



        document.getElementById("textoFicha").value =
            ficha.texto || "";



        document.getElementById("visibleFicha").checked =
            ficha.visible == 1;








        // ===============================
        // Imagen actual
        // ===============================


        const imagenActual =
        document.getElementById("imagenActualFicha");



        const contenedorImagenActual =
        document.getElementById("contenedorImagenActual");





        if(ficha.imagen){


            imagenActual.src =
            "/" + ficha.imagen.replace("public/","");



            imagenActual.style.display =
            "block";



            contenedorImagenActual.style.display =
            "block";



        }else{


            imagenActual.style.display =
            "none";



            contenedorImagenActual.style.display =
            "none";


        }



        document.getElementById("labelImagenFicha").textContent =
        "Cambiar imagen";


        // limpiar archivo nuevo

        document.getElementById("imagenFicha")
        .value = "";








        // ===============================
        // Título modal
        // ===============================


        document.getElementById("tituloModalFicha")
        .textContent =
        "Editar ficha";









        // ===============================
        // Etiquetas
        // ===============================


        const etiquetasSeleccionadas =
        await obtenerEtiquetasFicha(id_ficha);



        await cargarEtiquetasFicha(
            etiquetasSeleccionadas
        );




        // ===============================
        // Relaciones ficha-ficha
        // ===============================

        document.getElementById("fichaRelacion").disabled = false;

        document.getElementById("tipoRelacion").disabled = false;

        await cargarFichasDisponibles(
            id_ficha
        );



        const respuestaRelaciones =
        await window.fetchProtegido(`/api/relacion-ficha/${id_ficha}`);

        relacionesPendientes =
        await respuestaRelaciones.json();

        mostrarRelacionesPendientes();

        const respuestaRel =
        await window.fetchProtegido(`/api/relacion-ficha/${id_ficha}`);

        const relaciones =
        await respuestaRel.json();


        relacionesPendientes = relaciones.map(r=>({

            id_relacion: r.id_relacion,

            id_ficha_destino: r.id_ficha_destino,

            tipo_relacion: r.tipo_relacion,

            titulo: r.titulo

        }));









        // ===============================
        // Plantilla dinámica
        // ===============================


        const plantillaRespuesta =
        await window.fetchProtegido(
            `/api/plantillas/menu/${ficha.id_menu}`
        );



        const plantilla =
        await plantillaRespuesta.json();




        const campos =
            plantilla.plantilla_json?.estructura?.campos || [];




        generarCampos(
            campos
        );











        // ===============================
        // Datos dinámicos
        // ===============================


        let datos = {};



        try{


            datos =
            ficha.datos_json
            ? JSON.parse(ficha.datos_json)
            : {};



        }catch(e){


            console.warn(
                "Error leyendo datos_json",
                e
            );


        }






        document
        .querySelectorAll(".campo-dinamico")
        .forEach(input=>{



            const nombre =
            input.dataset.campo;



            if(datos[nombre] !== undefined){


                input.value =
                datos[nombre];


            }



        });









        // ===============================
        // Botón actualizar
        // ===============================


        document.getElementById(
            "btnGuardarFicha"
        )
        .textContent =
        "Actualizar ficha";






    }catch(error){



        console.error(
            "Error cargando ficha para editar:",
            error
        );



    }


}

function cerrarVistaFicha(){

    document.getElementById("modalVistaFicha")
    .style.display="none";

}






// ===================================
// MULTIMEDIA
// ===================================


function verMultimediaFicha(id_ficha, titulo){

    fichaSeleccionada = id_ficha;

    nombreFichaSeleccionada = titulo;

    cargarVentana("multimedia", true);

}


// ===================================
// NUEVA FICHA
// ===================================
document.addEventListener("click", function(e){


    if(e.target.id === "nuevaFicha"){


        console.log("Abriendo selector de tipo");


        const modal =
        document.getElementById("modalTipoFicha");


        if(modal){

            modal.style.display="flex";

            cargarTiposFicha();

        }


    }


});



// ===================================
// CERRAR MODAL FICHA
// ===================================

function cerrarFicha(){

    document.getElementById("modalFicha")
    .style.display="none";

}




// ===================================
// GUARDAR FICHA
// ===================================
async function guardarFicha(){

    const id_ficha =
    document
    .getElementById("modalFicha")
    .dataset.idFicha;

    const titulo =
    document.getElementById("tituloFicha").value.trim();

    if(titulo === ""){

        mostrarMensaje(
            "Campos obligatorios",
            "Debe ingresar un título para la ficha."
        );

        document.getElementById("tituloFicha").focus();

        return;

    }

    const formulario = new FormData();

    // ===============================
    // Construir datos_json
    // ===============================

    const datos = {};

    document
        .querySelectorAll(".campo-dinamico")
        .forEach(campo=>{

            datos[campo.dataset.campo] = campo.value;

        });

    // ===============================
    // Datos de la ficha
    // ===============================

    let id_menu =
    document.getElementById("tipoFicha").value;

    if(!id_menu){

        id_menu =
        document
        .getElementById("modalFicha")
        .dataset.idMenu;

    }

    formulario.append("id_menu", id_menu);

    formulario.append("titulo", titulo);

    formulario.append(
        "resumen",
        document.getElementById("resumenFicha").value
    );

    formulario.append(
        "texto",
        document.getElementById("textoFicha").value
    );

    formulario.append(
        "visible",
        document.getElementById("visibleFicha").checked ? 1 : 0
    );

    formulario.append(
        "datos_json",
        JSON.stringify(datos)
    );

    const imagen =
    document.getElementById("imagenFicha").files[0];

    if(imagen){

        formulario.append("imagen", imagen);

    }

    try{

        let url = "/api/fichas";
        let metodo = "POST";

        if(id_ficha){

            url = `/api/fichas/${id_ficha}`;
            metodo = "PUT";

        }

        const respuesta =
        await window.fetchProtegido(url,{

            method: metodo,

            body: formulario

        });

        const resultado =
        await respuesta.json();

        if(!respuesta.ok){

            mostrarMensaje(
                "No se pudo guardar",
                resultado.error
            );

            return;

        }

        const idGuardado =
        id_ficha || resultado.id_ficha;

        fichaEditando = idGuardado;

        await guardarEtiquetasFicha(idGuardado);

        await window.fetchProtegido(

            `/api/relacion-ficha/${idGuardado}`,

            {

                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },

                body:JSON.stringify({

                    relaciones:
                    relacionesPendientes.map(r=>({

                        id_ficha_destino:r.id_ficha_destino,

                        tipo_relacion:r.tipo_relacion

                    }))

                })

            }

        );

        relacionesPendientes = [];

        cerrarFicha();

        document
        .getElementById("modalFicha")
        .dataset.idFicha = "";

        document
        .getElementById("btnGuardarFicha")
        .textContent = "Guardar ficha";

        cargarFichas();

    }catch(error){

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

// ===================================
// ELIMINAR FICHA
// ===================================
async function eliminarFicha(id_ficha){

    console.log("BOTON ELIMINAR PRESIONADO:", id_ficha);

    const confirmar =
    confirm(
        "¿Eliminar esta ficha?"
    );

    if(!confirmar){
        return;
    }

    try{

        const respuesta =
        await window.fetchProtegido(
            `/api/fichas/${id_ficha}`,
            {
                method:"DELETE"
            }
        );

        const resultado =
        await respuesta.json();

        if(!respuesta.ok){

            alert(resultado.error);

            return;

        }

        alert(resultado.mensaje);

        cargarFichas();

    }
    catch(error){

        console.error(
            "Error eliminando ficha:",
            error
        );

        alert("Ocurrió un error al eliminar la ficha.");

    }

}



// ===================================
// CERRAR MULTIMEDIA
// ===================================

function cerrarMultimedia(){

    document.getElementById("modalMultimedia")
    .style.display="none";

}


document.addEventListener(
"change",
async function(e){


    if(e.target.id !== "tipoFicha"){
        return;
    }


    const id_menu = e.target.value;

    const nombre =
    e.target.options[e.target.selectedIndex].text;

    document.getElementById("nombreTipoFicha").textContent =
    nombre;

    document.getElementById("tituloDatosEspecificos").textContent =
    `Datos específicos de ${nombre}`;


    if(!id_menu){

        document.getElementById("camposDinamicos").innerHTML="";

        return;
    }


    try{

        const respuesta = await window.fetchProtegido(`/api/plantillas/menu/${id_menu}`);

        const plantilla = await respuesta.json();

        window.plantillaActual = plantilla;

        const campos =
            plantilla.plantilla_json?.estructura?.campos || [];

        generarCampos(campos);

        // abrir el formulario
        cerrarTipoFicha();
        document.getElementById("modalFicha").style.display = "flex";

        document.getElementById("modalFicha").dataset.idFicha = "";

        document.getElementById("modalFicha").dataset.idMenu = "";

        document.getElementById("btnGuardarFicha")
        .textContent = "Guardar ficha";

        document.getElementById("tituloModalFicha")
        .textContent = "Nueva ficha";

        // Limpiar formulario nueva ficha

        document.getElementById("tituloFicha").value = "";

        document.getElementById("resumenFicha").value = "";

        document.getElementById("textoFicha").value = "";

        document.getElementById("imagenFicha").value = "";

        document.getElementById("labelImagenFicha").textContent =
        "Seleccionar imagen";


        // borrar modo edición
        document.getElementById("modalFicha").dataset.idFicha = "";

        document.getElementById("modalFicha").dataset.idMenu = "";


        // limpiar imagen actual
        const imagenActual =
        document.getElementById("imagenActualFicha");

        imagenActual.src = "";

        imagenActual.style.display = "none";

        document.getElementById("contenedorImagenActual")
        .style.display = "none";


        // valores iniciales
        document.getElementById("visibleFicha").checked = true;


        // limpiar campos dinámicos
        document
        .querySelectorAll(".campo-dinamico")
        .forEach(campo=>{
            campo.value = "";
        });

        await cargarEtiquetasFicha();


        // ===============================
        // Relaciones ficha-ficha nuevas
        // ===============================

        fichaEditando = null;

        relacionesPendientes = [];


        const selectRelacion =
        document.getElementById("fichaRelacion");


        const tipoRelacion =
        document.getElementById("tipoRelacion");



        if(selectRelacion){

            selectRelacion.disabled = false;

            await cargarFichasDisponibles();

        }


        if(tipoRelacion){

            tipoRelacion.disabled = false;

        }


        mostrarRelacionesPendientes();




    }catch(error){

        console.error(
            "Error cargando plantilla:",
            error
        );

    }


});

// ===================================
// CARGAR TIPOS DE FICHA
// ===================================

async function cargarTiposFicha(){

    try{

        const respuesta =
        await window.fetchProtegido("/api/menus");


        const menus =
        await respuesta.json();


        const select =
        document.getElementById("tipoFicha");


        if(!select){
            console.error("No existe tipoFicha");
            return;
        }


        select.innerHTML = `
            <option value="">
                Seleccionar...
            </option>
        `;


        menus.forEach(menu=>{


            const opcion =
            document.createElement("option");


            opcion.value = menu.id_menu;

            opcion.textContent = menu.nombre;


            select.appendChild(opcion);


        });


    }catch(error){

        console.error(
            "Error cargando tipos:",
            error
        );

    }

}


// ===================================
// GENERAR CAMPOS DINAMICOS
// ===================================
function generarCampos(campos){


    const contenedor =
    document.getElementById("camposDinamicos");


    contenedor.innerHTML="";


    if(!campos || campos.length===0){

        contenedor.innerHTML =
        "<p>No hay atributos definidos para este tipo</p>";

        return;
    }


    campos.forEach(campo=>{


        contenedor.innerHTML += `

        <div class="campo-dinamico-item">

            <label>
                ${campo.etiqueta || campo.nombre}
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


function cerrarTipoFicha(){

    document.getElementById("modalTipoFicha")
    .style.display="none";

}

function volverMenus(){

    menuSeleccionado = null;

    nombreMenuSeleccionado = "";

    cargarVentana("menus");

}


function abrirEliminarFicha(id){

    fichaEliminar = id;

    document
        .getElementById("modalEliminarFicha")
        .style.display = "flex";

}

function cerrarEliminarFicha(){

    fichaEliminar = null;

    document
        .getElementById("modalEliminarFicha")
        .style.display = "none";

}


async function confirmarEliminarFicha(){

    if(!fichaEliminar){
        return;
    }

    try{

        const respuesta = await window.fetchProtegido(

            `/api/fichas/${fichaEliminar}`,

            {
                method:"DELETE"
            }

        );

        const resultado =
        await respuesta.json();

        if(!respuesta.ok){

            cerrarEliminarFicha();

            mostrarMensaje(
                resultado.error,
                "error"
            );

            return;

        }

        cerrarEliminarFicha();

        cargarFichas();

    }
    catch(error){

        console.error(error);

    }

}


function cerrarMensaje(){

    document
        .getElementById("modalMensaje")
        .style.display = "none";

}



async function cargarEtiquetasFicha(seleccionadas = []){

    const respuesta =
    await window.fetchProtegido("/api/etiquetas");

    const etiquetas =
    await respuesta.json();

    const contenedor =
    document.getElementById("listaEtiquetasFicha");

    contenedor.innerHTML = "";

    etiquetas
    .filter(etiqueta => etiqueta.activo)
    .forEach(etiqueta=>{

        contenedor.innerHTML +=
        `
        <label class="item-etiqueta">

            <input
                type="checkbox"
                class="checkbox-etiqueta"
                value="${etiqueta.id_etiqueta}"
                ${seleccionadas.includes(etiqueta.id_etiqueta) ? "checked" : ""}>

            ${etiqueta.nombre}

        </label>
        `;

    });

}


async function obtenerEtiquetasFicha(idFicha){

    const respuesta =
    await window.fetchProtegido(`/api/fichas/${idFicha}/etiquetas`);

    const etiquetas =
    await respuesta.json();

    return etiquetas.map(etiqueta => etiqueta.id_etiqueta);

}

function obtenerEtiquetasSeleccionadas(){

    return Array.from(

        document.querySelectorAll(".checkbox-etiqueta:checked")

    ).map(checkbox => Number(checkbox.value));

}

async function guardarEtiquetasFicha(idFicha){

    const etiquetas =
    obtenerEtiquetasSeleccionadas();

    await window.fetchProtegido(

        `/api/fichas/${idFicha}/etiquetas`,

        {

            method:"PUT",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                etiquetas:etiquetas

            })

        }

    );

}

async function cargarFichasDisponibles(idActual){


    const respuesta =
    await window.fetchProtegido("/api/fichas");


    const fichas =
    await respuesta.json();



    const select =
    document.getElementById("fichaRelacion");



    if(!select){
        return;
    }



    select.innerHTML = `

        <option value="">
            Seleccionar ficha...
        </option>

    `;



    fichas.forEach(ficha=>{


        if(ficha.id_ficha != idActual){


            select.innerHTML += `

            <option value="${ficha.id_ficha}">

                ${ficha.titulo}

            </option>

            `;


        }


    });


}


async function cargarRelacionesFicha(id_ficha){


    const respuesta =
    await window.fetchProtegido(`/api/relacion-ficha/${id_ficha}`);



    const relaciones =
    await respuesta.json();



    const contenedor =
    document.getElementById("listaRelacionesFicha");



    if(!contenedor){
        return;
    }



    contenedor.innerHTML = "";



    if(relaciones.length === 0){


        contenedor.innerHTML = `

            <p>
                No hay fichas relacionadas
            </p>

        `;


        return;

    }



    relaciones.forEach(relacion=>{


        contenedor.innerHTML += `


        <div class="item-relacion-ficha">


            <span>

                ${relacion.ficha_relacionada}

            </span>



            <small>

                ${relacion.tipo_relacion}

            </small>



            <button

            class="btn-eliminar"

            onclick="eliminarRelacionFicha(${relacion.id_relacion})">


                ✖


            </button>


        </div>


        `;


    });


}

async function agregarRelacionFicha(){


    const destino =
    document.getElementById("fichaRelacion").value;


    const tipo =
    document.getElementById("tipoRelacion").value;



    if(!destino){

        mostrarMensaje(
            "Ficha requerida",
            "Debe seleccionar una ficha para crear la relación."
        );

        return;

    }



    if(!tipo){

        mostrarMensaje(
            "Tipo de relación requerido",
            "Debe seleccionar qué relación existe entre las fichas antes de agregarla."
        );

        return;

    }



    // NUEVA FICHA TODAVÍA NO EXISTE
    if(!fichaEditando){


        const texto =
        document.getElementById("fichaRelacion")
        .options[
        document.getElementById("fichaRelacion").selectedIndex
        ].text;

        relacionesPendientes.push({

            id_ficha_destino:Number(destino),

            tipo_relacion:tipo,

            titulo:texto

        });

        mostrarRelacionesPendientes();


        mostrarRelacionesPendientes();


        return;

    }



    // FICHA EXISTENTE
    // guardar temporalmente hasta presionar Guardar ficha

    const texto =
    document.getElementById("fichaRelacion")
    .options[
    document.getElementById("fichaRelacion").selectedIndex
    ].text;

    relacionesPendientes.push({

        id_ficha_destino:Number(destino),

        tipo_relacion:tipo,

        titulo:texto

    });

    mostrarRelacionesPendientes();


    mostrarRelacionesPendientes();


}

function mostrarRelacionesPendientes(){

    const contenedor =
    document.getElementById("listaRelacionesFicha");

    if(!contenedor){
        return;
    }

    contenedor.innerHTML = "";

    if(relacionesPendientes.length === 0){

        contenedor.innerHTML =
        "<p>No hay relaciones agregadas</p>";

        return;

    }

    relacionesPendientes.forEach((relacion,index)=>{

        contenedor.innerHTML += `

        <div class="item-relacion-ficha">

            <span>

                ${relacion.titulo || `Ficha ID: ${relacion.id_ficha_destino}`}

            </span>

            <small>

                ${relacion.tipo_relacion}

            </small>

            <button
                class="btn-eliminar"
                onclick="eliminarRelacionFichaEditar(${index})">

                ✖

            </button>

        </div>

        `;

    });

}


async function eliminarRelacionFichaEditar(index){

    const relacion = relacionesPendientes[index];


    if(!relacion){
        return;
    }


    // Si la relación ya existe en la BD
    if(relacion.id_relacion){

        try{

            const respuesta =
            await window.fetchProtegido(
                `/api/relacion-ficha/${relacion.id_relacion}`,
                {
                    method:"DELETE"
                }
            );


            if(!respuesta.ok){

                const error =
                await respuesta.json();

                alert(error.error);

                return;

            }


        }catch(error){

            console.error(
                "Error eliminando relación:",
                error
            );

            return;

        }

    }


    // quitarla del arreglo temporal
    relacionesPendientes.splice(index,1);


    mostrarRelacionesPendientes();

}


function eliminarRelacionPendiente(index){


    relacionesPendientes.splice(index,1);


    mostrarRelacionesPendientes();


}

function mostrarFechaArgentina(fecha){

    if(!fecha){
        return "-";
    }

    const partes = fecha.split(" ");

    return `${partes[0]} ${partes[1]}`;

}

function mostrarMensaje(titulo, mensaje){

    const modal =
    document.getElementById("modalMensaje");


    if(!modal){

        alert(`${titulo}\n\n${mensaje}`);
        return;

    }


    document.getElementById("tituloMensaje")
    .textContent = titulo;


    document.getElementById("textoMensaje")
    .textContent = mensaje;


    modal.style.display = "flex";

}
