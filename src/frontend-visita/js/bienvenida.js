function mostrarBienvenida() {

    app.innerHTML = `
    <section class="pantalla-bienvenida">

        <div class="lineas-decorativas"></div>

        <div class="efecto-vigneta"></div>

        <div class="contenido-bienvenida">

            <div class="logo-museo" role="img" aria-label="Museo Malvinas Antártida y Atlántico Sur"></div>

            <p class="eyebrow-bienvenida">Museo Malvinas Antártida y Atlántico Sur</p>

            <h1>Menú interactivo</h1>

            <p class="descripcion-bienvenida">
                Explora historias, testimonios y documentos de nuestra memoria colectiva.
            </p>

            <button id="btnComenzar">
                Explorar colección
            </button>

        </div>

    </section>
    `;

    // Conecta el botón con la siguiente vista. Se hace acá porque el
    // elemento recién existe una vez que se corrió el innerHTML de arriba.
    document.getElementById("btnComenzar")?.addEventListener("click", () => {
        if (typeof mostrarExplorador === "function") {
            mostrarExplorador();
        } else {
            console.warn("[bienvenida] mostrarExplorador() no está definido todavía.");
        }
    });

}