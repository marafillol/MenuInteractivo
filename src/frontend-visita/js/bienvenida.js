
// =======================================================
// BIENVENIDA
// =======================================================

async function mostrarBienvenida() {

    const app =
        document.getElementById("app");


    if (!app) {

        console.error(
            "[bienvenida] No existe #app"
        );

        return;

    }


    try {

        const respuesta =
            await fetch(
                "html/bienvenida.html"
            );


        if (!respuesta.ok) {

            throw new Error(
                `No se pudo cargar bienvenida.html (${respuesta.status})`
            );

        }


        const html =
            await respuesta.text();


        app.innerHTML =
            html;


        // ===================================================
        // BOTÓN COMENZAR
        // ===================================================

        const boton =
            document.getElementById(
                "btnComenzar"
            );


        if (boton) {

            boton.addEventListener(
                "click",
                () => {

                    if (
                        typeof window.mostrarExplorador ===
                        "function"
                    ) {

                        window.mostrarExplorador();

                    } else {

                        console.error(
                            "[bienvenida] mostrarExplorador() no está disponible."
                        );

                    }

                }
            );

        } else {

            console.warn(
                "[bienvenida] No existe #btnComenzar."
            );

        }

    }
    catch (error) {

        console.error(
            "[bienvenida] Error cargando la vista:",
            error
        );


        app.innerHTML = `

            <section class="error-vista">

                <h2>
                    No se pudo cargar la pantalla de bienvenida
                </h2>

                <p>
                    Intente nuevamente.
                </p>

            </section>

        `;

    }

}
