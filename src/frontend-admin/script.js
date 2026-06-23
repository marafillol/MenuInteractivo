let menuSeleccionadoId = null;
let fichaEditandoId = null;
let menuEditandoId = null;
let fichasActuales = [];

cargarMenus();

document
    .getElementById("buscadorFichas")
    .addEventListener("input", () => {

        renderizarFichas();

    });

document
    .getElementById("btnCerrarVistaPrevia")
    .addEventListener("click", () => {

        cerrarVistaPrevia();

    });

document
    .getElementById("modalVistaPrevia")
    .addEventListener("click", (evento) => {

        if (evento.target.id === "modalVistaPrevia") {
            cerrarVistaPrevia();
        }

    });

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

                    document
                        .getElementById("seccionFichas")
                        .classList
                        .remove("oculto");

                    document
                        .getElementById("menuSeleccionadoTexto")
                        .classList
                        .remove("oculto");

                    document
                        .getElementById("nombreMenuSeleccionado")
                        .textContent =
                            menu.descripcion;

                    cargarFichas(menu.id_menu);

                    document
                        .getElementById("seccionFichas")
                        .scrollIntoView({
                            behavior: "smooth"
                        });

                });

                const botonEditar =
                    document.createElement("button");

                botonEditar.textContent =
                    "Editar";

                botonEditar.addEventListener("click", (evento) => {

                    evento.stopPropagation();

                    menuEditandoId = menu.id_menu;

                    document.getElementById("estadoFormularioMenu").textContent =
                        "Modo edición";

                    document.getElementById("btnCancelarEdicionMenu")
                        .classList
                        .remove("oculto");

                    document.getElementById("btnCrearMenu").disabled =
                        true;

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

                        document
                            .getElementById("seccionFichas")
                            .classList
                            .add("oculto");

                        document
                            .getElementById("menuSeleccionadoTexto")
                            .classList
                            .add("oculto");

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

            document.getElementById("estadoFormularioMenu").textContent =
                "Modo creación";

            document.getElementById("btnCancelarEdicionMenu")
                .classList
                .add("oculto");

            document.getElementById("btnCrearMenu").disabled =
                false;

            cargarMenus();

        });

    });

function cargarFichas(id_menu) {

    fetch(`http://localhost:3000/menus/${id_menu}/fichas`)
        .then(respuesta => respuesta.json())
        .then(fichas => {

            fichasActuales = fichas;

            renderizarFichas();

        });

}

function renderizarFichas() {

    const lista =
        document.getElementById("listaFichas");

    const textoBuscado =
        document.getElementById("buscadorFichas").value.toLowerCase();

    lista.innerHTML = "";

    const fichasFiltradas =
        fichasActuales.filter(ficha => {

            const contenidoFicha =
                `${ficha.titulo || ""} ${ficha.resumen || ""} ${ficha.texto || ""}`.toLowerCase();

            return contenidoFicha.includes(textoBuscado);

        });

    if (fichasFiltradas.length === 0) {

        const itemVacio =
            document.createElement("li");

        itemVacio.textContent =
            "No se encontraron fichas.";

        lista.appendChild(itemVacio);

        return;

    }

    fichasFiltradas.forEach(ficha => {

        const item =
            document.createElement("li");

        const titulo =
            document.createElement("span");

        titulo.textContent =
            ficha.titulo + " ";

        const estado =
            document.createElement("span");

        estado.textContent =
            ficha.visible === 1 ? "Visible" : "Oculta";

        estado.className =
            ficha.visible === 1 ? "estado-visible" : "estado-oculta";

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

            document.getElementById("imagenFicha").value =
                ficha.imagen || "";

            document.getElementById("archivoImagenFicha").value =
                "";

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

                cargarFichas(menuSeleccionadoId);

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

                cargarFichas(menuSeleccionadoId);

            });

        });

        const botonVistaPrevia =
            document.createElement("button");

        botonVistaPrevia.textContent =
            "Vista previa";

        botonVistaPrevia.addEventListener("click", () => {

            abrirVistaPrevia(ficha);

        });

        item.appendChild(titulo);
        item.appendChild(estado);
        item.appendChild(botonEditar);
        item.appendChild(botonVistaPrevia);
        item.appendChild(botonVisible);
        item.appendChild(botonEliminar);

        lista.appendChild(item);

    });

}

function abrirVistaPrevia(ficha) {

    const modal =
        document.getElementById("modalVistaPrevia");

    const estado =
        document.getElementById("vistaPreviaEstado");

    estado.textContent =
        ficha.visible === 1 ? "Visible" : "Oculta";

    estado.className =
        ficha.visible === 1 ? "estado-visible" : "estado-oculta";

    document.getElementById("vistaPreviaTitulo").textContent =
        ficha.titulo || "Sin título";

    const imagen =
        document.getElementById("vistaPreviaImagen");

    if (ficha.imagen) {

        imagen.src =
            ficha.imagen;

        imagen.style.display =
            "block";

    } else {

        imagen.removeAttribute("src");

        imagen.style.display =
            "none";

    }

    document.getElementById("vistaPreviaResumen").textContent =
        ficha.resumen || "Sin resumen cargado.";

    document.getElementById("vistaPreviaTexto").textContent =
        ficha.texto || "Sin texto cargado.";

    modal.className =
        "modal-visible";

}

function cerrarVistaPrevia() {

    document.getElementById("modalVistaPrevia").className =
        "modal-oculto";

}

function subirImagenSeleccionada() {

    const archivoImagen =
        document.getElementById("archivoImagenFicha").files[0];

    if (!archivoImagen) {
        return Promise.resolve(document.getElementById("imagenFicha").value.trim() || null);
    }

    const datosImagen =
        new FormData();

    datosImagen.append("imagen", archivoImagen);

    return fetch("http://localhost:3000/imagenes/upload", {

        method: "POST",

        body: datosImagen

    })
    .then(async respuesta => {

        const textoRespuesta =
            await respuesta.text();

        let datosRespuesta = {};

        try {
            datosRespuesta = textoRespuesta ? JSON.parse(textoRespuesta) : {};
        } catch (error) {
            throw new Error("El servidor no respondio como API. Verifica que Express este iniciado en http://localhost:3000 y abre la administracion desde esa direccion.");
        }

        if (!respuesta.ok) {
            throw new Error(datosRespuesta.mensaje || "No se pudo subir la imagen");
        }

        return datosRespuesta;

    })
    .then(resultado => {

        document.getElementById("imagenFicha").value =
            resultado.ruta;

        return resultado.ruta;

    });

}

function leerRespuestaApi(respuesta) {

    return respuesta.text()
        .then(textoRespuesta => {

            let datosRespuesta = {};

            try {
                datosRespuesta = textoRespuesta ? JSON.parse(textoRespuesta) : {};
            } catch (error) {
                throw new Error("El servidor no respondio como API. Verifica que Express este iniciado en http://localhost:3000.");
            }

            if (!respuesta.ok) {
                throw new Error(datosRespuesta.mensaje || datosRespuesta.error || "La operacion no se pudo completar");
            }

            return datosRespuesta;

        });

}

document
    .getElementById("btnCrearFicha")
    .addEventListener("click", async () => {

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

        let imagen = null;

        try {

            imagen =
                await subirImagenSeleccionada();

        } catch (error) {

            alert("No se pudo cargar la imagen: " + error.message);
            return;

        }

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
                imagen,
                texto

            })

        })
        .then(leerRespuestaApi)
        .then(() => {

            limpiarFormulario();

            cargarFichas(menuSeleccionadoId);

        })
        .catch(error => {

            alert("No se pudo crear la ficha: " + error.message);

        });

    });

document
    .getElementById("btnGuardarCambios")
    .addEventListener("click", async () => {

        if (!fichaEditandoId) {

            alert("Selecciona una ficha para editar.");

            return;

        }

        const titulo =
            document.getElementById("tituloFicha").value;

        const resumen =
            document.getElementById("resumenFicha").value;

        let imagen = null;

        try {

            imagen =
                await subirImagenSeleccionada();

        } catch (error) {

            alert("No se pudo cargar la imagen: " + error.message);
            return;

        }

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
                    imagen,
                    texto
                })

            }
        )
        .then(leerRespuestaApi)
        .then(() => {

            fichaEditandoId = null;

            limpiarFormulario();

            cargarFichas(menuSeleccionadoId);

            alert("Ficha actualizada correctamente.");

        })
        .catch(error => {

            alert("No se pudo guardar la ficha: " + error.message);

        });

    });

function limpiarFormulario() {

    document.getElementById("tituloFicha").value = "";
    document.getElementById("resumenFicha").value = "";
    document.getElementById("imagenFicha").value = "";
    document.getElementById("archivoImagenFicha").value = "";
    document.getElementById("textoFicha").value = "";

    document
        .getElementById("btnCancelarEdicionMenu")
        .addEventListener("click", () => {

            menuEditandoId = null;

            document.getElementById("descripcionMenu").value = "";

            document.getElementById("estadoFormularioMenu").textContent =
                "Modo creación";

            document.getElementById("btnCancelarEdicionMenu")
                .classList
                .add("oculto");

            document.getElementById("btnCrearMenu").disabled =
                false;

        });

}