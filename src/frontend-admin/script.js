let menuSeleccionadoId = null; // <-- Para saber en qué menú meter la ficha

cargarMenus();

function cargarMenus() {
    fetch("http://localhost:3000/menus")
        .then(respuesta => respuesta.json())
        .then(menus => {
            const lista = document.getElementById("listaMenus");
            lista.innerHTML = "";

            menus.forEach(menu => {

                if (!menu.descripcion || menu.descripcion.trim() === "") return;
                const item = document.createElement("li");
                item.textContent = menu.descripcion;
                item.style.cursor = "pointer";

                item.addEventListener("click", () => {
                    // MODIFICADO: Guardamos el ID del menú seleccionado antes de cargar las fichas
                    menuSeleccionadoId = menu.id_menu; 
                    cargarFichas(menu.id_menu);
                });

                lista.appendChild(item);
            });
        });
}

document
    .getElementById("btnCrearMenu")
    .addEventListener("click", () => {
        const descripcion = document.getElementById("descripcionMenu").value;

        fetch("http://localhost:3000/menus", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descripcion })
        })
        .then(respuesta => respuesta.json())
        .then(() => {
            document.getElementById("descripcionMenu").value = "";
            cargarMenus();
        });
    });

function cargarFichas(id_menu) {
    fetch(`http://localhost:3000/menus/${id_menu}/fichas`)
        .then(respuesta => respuesta.json())
        .then(fichas => {
            const lista = document.getElementById("listaFichas");
            lista.innerHTML = "";

            fichas.forEach(ficha => {
                const item = document.createElement("li");
                item.textContent = ficha.titulo;
                lista.appendChild(item);
            });
        });
}

/* =======================================================
   NUEVO: Lógica para enviar los datos de la nueva Ficha
   ======================================================= */
document
    .getElementById("btnCrearFicha") // Asegúrate de que este ID coincida con tu botón en el HTML
    .addEventListener("click", () => {
        
        // 1. Validar que el usuario haya seleccionado un menú primero
        if (!menuSeleccionadoId) {
            alert("Por favor, selecciona un menú de la lista izquierda antes de crear una ficha.");
            return;
        }

        // 2. Capturar los valores de los inputs del formulario de fichas
        const titulo = document.getElementById("tituloFicha").value;
        const resumen = document.getElementById("resumenFicha").value;
        const texto = document.getElementById("textoFicha").value;

        // 3. Enviar la petición POST al backend
        fetch("http://localhost:3000/fichas", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id_menu: menuSeleccionadoId, // Mandamos el ID del menú que guardamos al hacer clic
                titulo,
                resumen,
                texto
            })
        })
        .then(respuesta => respuesta.json())
        .then(() => {
            // 4. Limpiar los campos del formulario
            document.getElementById("tituloFicha").value = "";
            document.getElementById("resumenFicha").value = "";
            document.getElementById("textoFicha").value = "";

            // 5. Recargar la lista de fichas para que aparezca la nueva inmediatamente
            cargarFichas(menuSeleccionadoId);
        });
    });