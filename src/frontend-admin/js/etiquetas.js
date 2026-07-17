
let etiquetaEliminar = null;

async function cargarEtiquetas(){


    const respuesta =
    await window.fetchProtegido("/api/etiquetas");


    const etiquetas =
    await respuesta.json();
    const esConsulta = window.usuarioActual?.rol === "consulta";



    const contenedor =
    document.getElementById("gridEtiquetas");




    contenedor.innerHTML = "";



    etiquetas.forEach(etiqueta=>{


        contenedor.innerHTML += `


        <div class="tarjeta-etiqueta">


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
                class="btn-vista-previa"
                onclick="vistaPreviaEtiqueta(${etiqueta.id_etiqueta})">

                    Vista previa

                </button>


                ${!esConsulta ? `
                    <button
                    class="btn-editar"
                    onclick="editarEtiqueta(${etiqueta.id_etiqueta})">

                        Editar

                    </button>



                    <button
                    class="btn-eliminar"
                    onclick="confirmarEliminarEtiqueta(${etiqueta.id_etiqueta},'${etiqueta.nombre}')">

                        Eliminar

                    </button>
                ` : ""}


            </div>


        </div>


        `;


    });


}





async function guardarEtiqueta(){


    const nombre =
    document.getElementById("nombreEtiqueta").value.trim();


    if(nombre === ""){

        mostrarMensaje(
            "Campo obligatorio",
            "Debe ingresar un nombre para la etiqueta."
        );

        document.getElementById("nombreEtiqueta").focus();

        return;

    }


    const datos = {

        nombre: nombre,

        descripcion:
        document.getElementById("descripcionEtiqueta").value.trim(),

        activo:
        document.getElementById("activoEtiqueta").checked ? 1 : 0

    };



    let url="/api/etiquetas";

    let metodo="POST";



    if(window.etiquetaEditando){


        url += "/" + window.etiquetaEditando;

        metodo="PUT";


    }



    await window.fetchProtegido(url,{

        method:metodo,

        headers:{

            "Content-Type":"application/json"

        },

        body:

        JSON.stringify(datos)

    });



    limpiarFormularioEtiqueta();

    document
    .getElementById("modalEtiqueta")
    .style.display="none";

    cargarEtiquetas();


}


function limpiarFormularioEtiqueta(){

    document.getElementById("nombreEtiqueta").value = "";

    document.getElementById("descripcionEtiqueta").value = "";

    document.getElementById("activoEtiqueta").checked = true;

    window.etiquetaEditando = null;

}


function iniciarEtiquetas(){

    cargarEtiquetas();

    document
    .getElementById("guardarEtiqueta")
    .addEventListener("click", guardarEtiqueta);

    document
    .getElementById("nuevaEtiqueta")
    .addEventListener("click", () => {

        limpiarFormularioEtiqueta();

        document.getElementById("modalEtiqueta").style.display = "flex";

    });

    document
    .getElementById("cancelarEtiqueta")
    .addEventListener("click", () => {

        limpiarFormularioEtiqueta();

        document.getElementById("modalEtiqueta").style.display = "none";

    });

    document
    .getElementById("cerrarModalEtiqueta")
    .addEventListener("click", () => {

        limpiarFormularioEtiqueta();

        document.getElementById("modalEtiqueta").style.display = "none";

    });


    document
    .getElementById("cerrarVistaEtiqueta")
    .addEventListener("click",()=>{

        document.getElementById("modalVistaEtiqueta")
        .style.display="none";

    });

    document
    .getElementById("btnCerrarVistaEtiqueta")
    .addEventListener("click",()=>{

        document.getElementById("modalVistaEtiqueta")
        .style.display="none";

    });


    document
    .getElementById("confirmarEliminarEtiqueta")
    .addEventListener(
    "click",
    eliminarEtiqueta
    );

    document
    .getElementById("cancelarEliminarEtiqueta")
    .addEventListener(
    "click",
    ()=>{

        etiquetaEliminar = null;

        document.getElementById("modalEliminarEtiqueta")
        .style.display="none";

    });

    document
    .getElementById("cerrarEliminarEtiqueta")
    .addEventListener(
    "click",
    ()=>{

        etiquetaEliminar = null;

        document.getElementById("modalEliminarEtiqueta")
        .style.display="none";

    });
}


async function vistaPreviaEtiqueta(id){

    const respuesta =
    await window.fetchProtegido(`/api/etiquetas/${id}`);

    const etiqueta =
    await respuesta.json();

    document.getElementById("vistaIdEtiqueta").value =
    etiqueta.id_etiqueta;

    document.getElementById("vistaNombreEtiqueta").value =
    etiqueta.nombre;

    document.getElementById("vistaDescripcionEtiqueta").value =
    etiqueta.descripcion ?? "";

    document.getElementById("vistaActivoEtiqueta").value =
    etiqueta.activo ? "Activa" : "Inactiva";

    document.getElementById("modalVistaEtiqueta")
    .style.display = "flex";

}



async function eliminarEtiqueta(){

    if(!etiquetaEliminar){
        return;
    }

    try{

        const respuesta =
        await window.fetchProtegido(

            `/api/etiquetas/${etiquetaEliminar}`,

            {
                method:"DELETE"
            }

        );

        const resultado =
        await respuesta.json();

        if(!respuesta.ok){

            mostrarMensaje(
                "Error",
                resultado.error
            );

            return;

        }

        etiquetaEliminar = null;

        document.getElementById(
            "modalEliminarEtiqueta"
        ).style.display = "none";

        cargarEtiquetas();

    }catch(error){

        console.error(error);

        mostrarMensaje(
            "Error",
            "No se pudo eliminar la etiqueta."
        );

    }

}





async function editarEtiqueta(id){


    const respuesta =
    await window.fetchProtegido(`/api/etiquetas/${id}`);



    const etiqueta = await respuesta.json();



    document
    .getElementById("nombreEtiqueta")
    .value = etiqueta.nombre;



    document
    .getElementById("descripcionEtiqueta")
    .value = etiqueta.descripcion;



    document
    .getElementById("modalEtiqueta")
    .style.display="flex";


    document.getElementById("activoEtiqueta").checked =
        etiqueta.activo == 1;


    window.etiquetaEditando=id;


}


function confirmarEliminarEtiqueta(id,nombre){

    etiquetaEliminar = id;

    document.getElementById("nombreEliminarEtiqueta")
    .textContent = nombre;

    document.getElementById("modalEliminarEtiqueta")
    .style.display = "flex";

}


function cerrarMensaje(){

    document
    .getElementById("modalMensaje")
    .style.display="none";

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