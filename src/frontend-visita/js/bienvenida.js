function mostrarBienvenida() {

    const app = document.getElementById("app");

    app.innerHTML = `

    <section class="pantalla-bienvenida">


        <div class="efecto-vigneta"></div>


        <div class="contenido-bienvenida">

            <p class="eyebrow-bienvenida">Museo Malvinas Antartida y Atlantico Sur</p>

            <h1>Menu interactivo</h1>

            <p class="descripcion-bienvenida">
                Explora historias, testimonios y documentos de nuestra memoria colectiva.
            </p>


            <button id="btnComenzar">

                Explorar coleccion

            </button>



        </div>


    </section>

    `;


    document
    .getElementById("btnComenzar")
    .addEventListener("click", () => {

        mostrarExplorador();

    });

}
