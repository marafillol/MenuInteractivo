function mostrarBienvenida() {

    const app = document.getElementById("app");

    app.innerHTML = `

    <section class="pantalla-bienvenida">


        <div class="efecto-vigneta"></div>


        <div class="contenido-bienvenida">



            <button id="btnComenzar">

                Nuestros heroes

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