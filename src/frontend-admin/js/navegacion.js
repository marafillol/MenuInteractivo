/*
==========================================================
NAVEGACIÓN DEL PANEL ADMINISTRATIVO
==========================================================
*/

const contenido = document.getElementById("contenido");
const titulo = document.getElementById("tituloVentana");

const botonesMenu = document.querySelectorAll(".sidebar .item");

/*
==========================================================
NOMBRES DE LAS VENTANAS
==========================================================
*/

const nombresVentanas = {

    dashboard: "Dashboard",

    menus: "Gestión de Menús",

    fichas: "Gestión de Fichas",

    multimedia: "Gestión Multimedia",

    etiquetas: "Etiquetas",

    plantillas: "Plantillas",

    usuarios: "Usuarios",

    configuracion: "Configuración"

};

/*
==========================================================
ABRIR UNA VENTANA
==========================================================
*/

async function abrirVentana(nombreVentana){

    try{

        const respuesta = await fetch(`ventanas/${nombreVentana}.html`);

        if(!respuesta.ok){

            throw new Error("No se encontró la ventana.");

        }

        const html = await respuesta.text();

        contenido.innerHTML = html;

        tituloVentana.textContent =
            nombresVentanas[nombreVentana] || "Panel Administrativo";

        actualizarMenuActivo(nombreVentana);

    }

    catch(error){

        contenido.innerHTML = `

            <div class="tarjeta">

                <h2>Error</h2>

                <p>No fue posible cargar la ventana.</p>

            </div>

        `;

        console.error(error);

    }

}

/*
==========================================================
BOTÓN ACTIVO
==========================================================
*/

function actualizarMenuActivo(nombreVentana){

    botonesMenu.forEach(boton=>{

        boton.classList.remove("activo");

        if(boton.dataset.ventana===nombreVentana){

            boton.classList.add("activo");

        }

    });

}

/*
==========================================================
EVENTOS DEL MENÚ
==========================================================
*/

botonesMenu.forEach(boton=>{

    boton.addEventListener("click",()=>{

        abrirVentana(

            boton.dataset.ventana

        );

    });

});

/*
==========================================================
VENTANA INICIAL
==========================================================
*/

abrirVentana("dashboard");