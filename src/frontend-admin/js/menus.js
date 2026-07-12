console.log("Modulo menus cargado");



async function cargarMenus(){

    try{

        const respuesta = await fetch("/api/menus");

        const menus = await respuesta.json();


        const contenedor = document.getElementById("listaMenus");


        if(!contenedor){

            console.error("No existe listaMenus");

            return;
        }


        contenedor.innerHTML="";



        menus.forEach(menu=>{


            console.log(menu);



            contenedor.innerHTML += `


            <article class="tarjeta-menu">


                <div class="imagen-menu">

                    <img
                    src="/${menu.imagen ? menu.imagen : "imagenes/default.png"}"
                    onerror="this.onerror=null;this.src='/img/no-image.png'"
                    />

                </div>



                <div class="info-menu">


                    <h3>
                        ${menu.nombre}
                    </h3>



                    <p>
                        ${(menu.descripcion || "Sin descripción").replace(/\n/g," ")}
                    </p>



                    <div class="acciones-menu">

                        <button
                            class="btn-vista"
                            onclick="vistaPreviaMenu(${menu.id_menu})">
                            Vista previa
                        </button>

                        <button
                            class="btn-ver"
                            onclick="verMenu(${menu.id_menu}, '${menu.nombre}')">

                            Ver Fichas

                        </button>

                        <button
                            class="btn-editar"
                            onclick="editarMenu(${menu.id_menu})">
                            Editar
                        </button>

                        <button
                            class="btn-eliminar"
                            onclick="eliminarMenu(${menu.id_menu})">
                            Eliminar
                        </button>

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

        const respuesta = await fetch("/api/menus",{

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

    const formulario = new FormData();


    formulario.append(
        "nombre",
        document.getElementById("nuevoNombre").value
    );


    formulario.append(
        "descripcion",
        document.getElementById("nuevaDescripcion").value
    );


    formulario.append(
        "id_plantilla",
        document.getElementById("plantillaMenu").value
    );


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


        const respuesta = await fetch(url,{

            method: metodo,

            body: formulario

        });


        const resultado = await respuesta.json();

        console.log("Menú guardado:", resultado);

        document.getElementById("ventanaEmergente").style.display = "none";

        cargarMenus();

    }
    catch(error){

        console.error("Error guardando menú:", error);

    }

}

async function cargarPlantillas(){

    try{

        const respuesta = await fetch("/api/plantillas");

        const plantillas = await respuesta.json();


        const select =
        document.getElementById("plantillaMenu");


        if(!select){
            console.error("No existe el selector de plantillas");
            return;
        }


        plantillas.forEach(p => {

            const opcion =
            document.createElement("option");


            opcion.value = p.id_plantilla;

            opcion.textContent = p.nombre;


            select.appendChild(opcion);

        });


    }catch(error){

        console.error(
            "Error cargando plantillas:",
            error
        );

    }

}

console.log("Eventos de menu preparados");


document.addEventListener("click", function(e){

    console.log("Click detectado:", e.target);


    if(e.target.id === "nuevoMenu"){

        const modal = document.getElementById("ventanaEmergente");

        if(modal){

            modal.style.display = "flex";

            document.querySelector(".modal-contenido h3").textContent =
                "Crear nuevo menú";

            document.getElementById("bloqueImagenActual").style.display = "none";

            document.getElementById("id_menu").value = "";

            document.getElementById("nuevoNombre").value = "";

            document.getElementById("nuevaDescripcion").value = "";

            document.getElementById("plantillaMenu").selectedIndex = 0;

            document.getElementById("nuevoVisible").checked = true;

            document.getElementById("nuevaImagen").value = "";

        }

    }


});

// =====================================
// CERRAR MODAL
// =====================================

document.addEventListener("click", function(e){

    if(
        e.target.id === "cerrarModal" ||
        e.target.id === "cancelarMenu"
    ){

        document.getElementById("ventanaEmergente")
            .style.display = "none";


        document.getElementById("nuevaImagen").value = "";

    }

});
window.addEventListener("click", function(e){

    const modal = document.getElementById("ventanaEmergente");

    if(e.target === modal){

        modal.style.display = "none";

    }

});

async function editarMenu(id_menu){

    try{

        const respuesta = await fetch(`/api/menus/${id_menu}`);

        const menu = await respuesta.json();

        document.getElementById("id_menu").value = menu.id_menu;

        document.getElementById("nuevoNombre").value = menu.nombre;

        document.getElementById("nuevaDescripcion").value = menu.descripcion || "";

        document.getElementById("plantillaMenu").value = menu.id_plantilla;

        document.getElementById("nuevoVisible").checked = menu.visible == 1;

        document.getElementById("nuevaImagen").value = "";

        document.querySelector(".modal-contenido h3").textContent =
            "Editar menú";

        document.getElementById("bloqueImagenActual").style.display = "block";

        document.getElementById("ventanaEmergente").style.display = "flex";

        const preview =
        document.getElementById("previewImagen");

        if(menu.imagen){

            preview.src = "/" + menu.imagen;

        }else{

            preview.src = "/imagenes/default.png";

        }

    }catch(error){

        console.error("Error cargando menú:", error);

    }

}

async function eliminarMenu(id_menu){

    idMenuEliminar = id_menu;

    document.getElementById(
        "modalConfirmarEliminar"
    ).style.display = "flex";

}

async function confirmarEliminarMenu(){

    try{

        const respuesta =
        await fetch(`/api/menus/${idMenuEliminar}`,{
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

        const respuesta = await fetch(`/api/menus/${id_menu}`);

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
            menu.visible == 1 ? "Sí" : "No";

        document.getElementById("previewCreado").textContent =
            menu.creado || "-";

        document.getElementById("previewActualizado").textContent =
            menu.actualizado || "-";

        const imagen = document.getElementById("previewMenuImagen");

        if(menu.imagen){

            imagen.src = "/" + menu.imagen;

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