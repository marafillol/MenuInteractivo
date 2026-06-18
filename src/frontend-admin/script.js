let menuSeleccionadoId = null;
let fichaEditandoId = null;
let menuEditandoId = null;

cargarMenus();

function cargarMenus() {

    fetch("http://localhost:3000/menus")
        .then(respuesta => respuesta.json())
        .then(menus => {

            const lista = document.getElementById("listaMenus");

            lista.innerHTML = "";

            menus.forEach(menu => {

                if (!menu.descripcion || menu.descripcion.trim() === "") {
                    return;
                }

                const item =
                    document.createElement("li");

                const texto =
                    document.createElement("span");

                texto.textContent =
                    menu.descripcion + " ";

                item.style.cursor = "pointer";

                item.addEventListener("click", () => {

                    menuSeleccionadoId = menu.id_menu;

                    cargarFichas(menu.id_menu);

                });

                const botonEditar =
                    document.createElement("button");

                botonEditar.textContent =
                    "Editar";

                botonEditar.addEventListener("click", (evento) => {

                    evento.stopPropagation();

                    menuEditandoId = menu.id_menu;

                    document.getElementById("descripcionMenu").value =
                        menu.descripcion;

                });

                const botonEliminar =
                    document.createElement("button");

                botonEliminar.textContent =
                    "Eliminar";

                botonEliminar.addEventListener("click", (evento) => {

                    evento.stopPropagation();

                    if (!confirm("¿Eliminar este menú?")) {
                        return;
                    }

                    fetch(
                        `http://localhost:3000/menus/${menu.id_menu}`,
                        {
                            method: "DELETE"
                        }
                    )
                    .then(() => {

                        cargarMenus();

                        document.getElementById("listaFichas").innerHTML = "";

                    });

                });

                item.appendChild(texto);
                item.appendChild(botonEditar);
                item.appendChild(botonEliminar);

                lista.appendChild(item);

            });

        });

}

document
    .getElementById("btnCrearMenu")
    .addEventListener("click", () => {

        const descripcion =
            document.getElementById("descripcionMenu").value;

        fetch("http://localhost:3000/menus", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                descripcion
            })

        })
        .then(respuesta => respuesta.json())
        .then(() => {

            document.getElementById("descripcionMenu").value = "";

            cargarMenus();

        });

    });

document
    .getElementById("btnGuardarMenu")
    .addEventListener("click", () => {

        if (!menuEditandoId) {

            alert("Selecciona un menú para editar.");

            return;

        }

        const descripcion =
            document.getElementById("descripcionMenu").value;

        fetch(
            `http://localhost:3000/menus/${menuEditandoId}`,
            {

                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    descripcion
                })

            }
        )
        .then(respuesta => respuesta.json())
        .then(() => {

            menuEditandoId = null;

            document.getElementById("descripcionMenu").value = "";

            cargarMenus();

        });

    });

function cargarFichas(id_menu) {

    fetch(`http://localhost:3000/menus/${id_menu}/fichas`)
        .then(respuesta => respuesta.json())
        .then(fichas => {

            const lista =
                document.getElementById("listaFichas");

            lista.innerHTML = "";

            fichas.forEach(ficha => {

                const item =
                    document.createElement("li");

                const titulo =
                    document.createElement("span");

                titulo.textContent =
                    ficha.titulo + " ";

                const botonEditar =
                    document.createElement("button");

                botonEditar.textContent =
                    "Editar";

                botonEditar.addEventListener("click", () => {

                    fichaEditandoId =
                        ficha.id_ficha;

                    document.getElementById("tituloFicha").value =
                        ficha.titulo || "";

                    document.getElementById("resumenFicha").value =
                        ficha.resumen || "";

                    document.getElementById("textoFicha").value =
                        ficha.texto || "";

                });

                const botonEliminar =
                    document.createElement("button");

                botonEliminar.textContent =
                    "Eliminar";

                botonEliminar.addEventListener("click", () => {

                    if (!confirm("¿Eliminar esta ficha?")) {
                        return;
                    }

                    fetch(
                        `http://localhost:3000/fichas/${ficha.id_ficha}`,
                        {
                            method: "DELETE"
                        }
                    )
                    .then(() => {

                        cargarFichas(id_menu);

                    });

                });

                const botonVisible =
                    document.createElement("button");

                botonVisible.textContent =
                    ficha.visible === 1 ? "Ocultar" : "Mostrar";

                botonVisible.addEventListener("click", () => {

                    const nuevoEstado =
                        ficha.visible === 1 ? 0 : 1;

                    fetch(
                        `http://localhost:3000/fichas/${ficha.id_ficha}/visible`,
                        {

                            method: "PUT",

                            headers: {
                                "Content-Type": "application/json"
                            },

                            body: JSON.stringify({
                                visible: nuevoEstado
                            })

                        }
                    )
                    .then(() => {

                        cargarFichas(id_menu);

                    });

                });

                item.appendChild(titulo);
                item.appendChild(botonEditar);
                item.appendChild(botonVisible);
                item.appendChild(botonEliminar);

                lista.appendChild(item);

            });

        });

}

document
    .getElementById("btnCrearFicha")
    .addEventListener("click", () => {

        if (!menuSeleccionadoId) {

            alert(
                "Por favor, selecciona un menú antes de crear una ficha."
            );

            return;

        }

        const titulo =
            document.getElementById("tituloFicha").value;

        const resumen =
            document.getElementById("resumenFicha").value;

        const texto =
            document.getElementById("textoFicha").value;

        fetch("http://localhost:3000/fichas", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                id_menu: menuSeleccionadoId,
                titulo,
                resumen,
                texto

            })

        })
        .then(respuesta => respuesta.json())
        .then(() => {

            limpiarFormulario();

            cargarFichas(menuSeleccionadoId);

        });

    });

document
    .getElementById("btnGuardarCambios")
    .addEventListener("click", () => {

        if (!fichaEditandoId) {

            alert("Selecciona una ficha para editar.");

            return;

        }

        const titulo =
            document.getElementById("tituloFicha").value;

        const resumen =
            document.getElementById("resumenFicha").value;

        const texto =
            document.getElementById("textoFicha").value;

        fetch(
            `http://localhost:3000/fichas/${fichaEditandoId}`,
            {

                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    titulo,
                    resumen,
                    texto
                })

            }
        )
        .then(respuesta => respuesta.json())
        .then(() => {

            fichaEditandoId = null;

            limpiarFormulario();

            cargarFichas(menuSeleccionadoId);

        });

    });

function limpiarFormulario() {

    document.getElementById("tituloFicha").value = "";
    document.getElementById("resumenFicha").value = "";
    document.getElementById("textoFicha").value = "";

}