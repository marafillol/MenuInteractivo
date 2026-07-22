function mostrarExplorador(){

    const app = document.getElementById("app");


    app.innerHTML = `

    <section class="explorador">

        <header class="cabecera">

            <div class="cabeceraIzquierda">

                <button id="btnIndice">



                    <span>Índice</span>

                    <img
                        src="img/logo-sol.png"
                        alt="Logo"
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
                    placeholder="Buscar por nombre..."
                >

            </div>

        </header>



        <aside id="panelIndice">

            <div class="cabeceraIndice">

                <h2>

                    Categorías

                </h2>

                <button id="btnCerrarIndice">

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
                class="oculto">

            </aside>


        </main>

    </section>

    `;



    const panel = document.getElementById("panelIndice");



    document
    .getElementById("btnIndice")
    .addEventListener("click",()=>{

        console.log("abrir índice");

        panel.classList.add("abierto");

    });



    document
    .getElementById("btnCerrarIndice")
    .addEventListener("click",()=>{

        panel.classList.remove("abierto");

    });


    cargarCategorias();
    cargarFichas();


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

        const lista =
        document.getElementById("listaCategorias");

        lista.innerHTML = "";

        // Opción "Todos"

        lista.innerHTML += `
            <li
                class="categoria seleccionada"
                data-id="0">

                Todos

            </li>
        `;

        menus.forEach(menu=>{

            lista.innerHTML += `

                <li
                    class="categoria"
                    data-id="${menu.id_menu}">

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

        categoria.addEventListener("click",()=>{

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

        });

    });

}

