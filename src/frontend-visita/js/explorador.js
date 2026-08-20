let fichasDisponibles = [];
let menuActual = 0;
let menusVisitante = [];

const fondosVisitante = {
    pergamino: "url('img/pergamino.png')",
    mapa: "url('img/fondo-malvinas.png')",
    papel: "url('img/papel-desgastado.png')"
};

function aplicarTemaVisitante(estilo = {}){

    const explorador = document.querySelector(".explorador");

    if(!explorador){
        return;
    }

    const fondo = estilo.fondo || "pergamino";

    const imagenFondo = estilo.imagenFondo?.trim();

    const imagen = imagenFondo
        ? `url("${imagenFondo.replace(/"/g, "\\\"")}")`
        : (fondosVisitante[fondo] || fondosVisitante.pergamino);

    explorador.style.setProperty(
        "--fondo-visitante",
        imagen
    );

    explorador.style.setProperty("background-image", imagen);
    explorador.style.setProperty("background-size", "cover");
    explorador.style.setProperty("background-position", "center");
    explorador.style.setProperty("background-repeat", "no-repeat");

    explorador.style.setProperty(
        "--color-primario",
        estilo.colorPrimario || "#163A61"
    );

    explorador.style.setProperty(
        "--color-acento",
        estilo.colorAcento || "#DBB060"
    );

    explorador.style.setProperty(
        "--color-fondo",
        estilo.colorFondo || "#F4EDDB"
    );

    explorador.classList.toggle(
        "sin-buscador",
        estilo.mostrarBuscador === false
    );

    explorador.classList.toggle(
        "tarjetas-compactas",
        estilo.densidadTarjetas === "compacta"
    );

}

function mostrarExplorador(){

    const app = document.getElementById("app");


    app.innerHTML = `

    <section class="explorador">

        <header class="cabecera">

            <div class="cabeceraIzquierda">

                <button
                    id="btnIndice"
                    type="button"
                    aria-controls="panelIndice"
                    aria-expanded="false">



                    <span>Índice</span>

                    <img
                        src="img/logo-sol.png"
                        alt=""
                        class="logoIndice"
                    >

                </button>

                <h1>

                    HÉROES DE MALVINAS

                </h1>

            </div>


            <div class="cabeceraDerecha">

                <input
                    id="buscador"
                    type="search"
                    aria-label="Buscar ficha por nombre"
                    placeholder="Buscar por nombre..."
                >

            </div>

        </header>



        <aside id="panelIndice" aria-label="Categorias">

            <div class="cabeceraIndice">

                <h2>

                    Categorías

                </h2>

                <button
                    id="btnCerrarIndice"
                    type="button"
                    aria-label="Cerrar categorias">

                    ✕

                </button>

            </div>

            <ul id="listaCategorias">

            </ul>

        </aside>



        <main class="contenidoPrincipal">


            <section id="contenedorFichas">

            </section>


            <aside
                id="visorFicha"
                class="oculto"
                role="dialog"
                aria-modal="true"
                aria-label="Detalle de ficha"
                tabindex="-1">

            </aside>


        </main>

    </section>

    `;



    const panel = document.getElementById("panelIndice");

    aplicarTemaVisitante();

    fetch("/api/public/configuracion/estilo-visitante")
        .then(respuesta=>respuesta.json())
        .then(aplicarTemaVisitante)
        .catch(()=>aplicarTemaVisitante());



    document
    .getElementById("btnIndice")
    .addEventListener("click",()=>{

        console.log("abrir índice");

        panel.classList.add("abierto");

        document
        .getElementById("btnIndice")
        .setAttribute("aria-expanded", "true");

    });



    document
    .getElementById("btnCerrarIndice")
    .addEventListener("click",()=>{

        panel.classList.remove("abierto");

        document
        .getElementById("btnIndice")
        .setAttribute("aria-expanded", "false");

    });


    cargarCategorias();
    cargarFichas();


    document
    .getElementById("buscador")
    .addEventListener("input", buscarFichas);


}

// =======================================================
// CARGAR CATEGORÍAS
// =======================================================

async function cargarCategorias(){

    try{

        const respuesta =
        await fetch("/api/public/menus");

        const menus =
        await respuesta.json();

        menusVisitante = menus;

        const lista =
        document.getElementById("listaCategorias");

        lista.innerHTML = "";

        // Opción "Todos"

        lista.innerHTML += `
            <li
                class="categoria seleccionada"
                data-id="0"
                role="button"
                tabindex="0">

                Todos

            </li>
        `;

        menus.forEach(menu=>{

            lista.innerHTML += `

                <li
                    class="categoria"
                    data-id="${menu.id_menu}"
                    role="button"
                    tabindex="0">

                    ${menu.nombre}

                </li>

            `;

        });

        inicializarCategorias();

    }

    catch(error){

        console.error(
            "Error al cargar categorías:",
            error
        );

    }

}



// =======================================================
// EVENTOS DE LAS CATEGORÍAS
// =======================================================

function inicializarCategorias(){

    const categorias =
    document.querySelectorAll(".categoria");

    categorias.forEach(categoria=>{

        const seleccionarCategoria = ()=>{

            document
            .querySelectorAll(".categoria")
            .forEach(item=>{

                item.classList.remove("seleccionada");

            });

            categoria.classList.add("seleccionada");

            const idMenu =
            categoria.dataset.id;

            cargarFichas(idMenu);

            document
                .getElementById("panelIndice")
                .classList.remove("abierto");

            document
            .getElementById("btnIndice")
            .setAttribute("aria-expanded", "false");

        };

        categoria.addEventListener("click", seleccionarCategoria);

        categoria.addEventListener("keydown", (evento)=>{

            if(evento.key === "Enter" || evento.key === " "){

                evento.preventDefault();

                seleccionarCategoria();

            }

        });

    });

}

