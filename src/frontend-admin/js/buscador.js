// ======================================
// BUSCADOR GLOBAL DEL PANEL
// ======================================

(function () {

    const ESPERA_MS = 300;
    const MINIMO_LETRAS = 2;

    const ORDEN_TIPOS = ["ficha", "menu", "etiqueta", "multimedia", "plantilla"];

    // Cómo abrir cada tipo de resultado.
    //  - ventana:   sección del panel que se abre
    //  - tarjeta:   selector de cada elemento de la lista de esa sección
    //  - idTarjeta: función que devuelve el id de una tarjeta
    //  - lista:     contenedor donde se muestra el aviso de filtro
    //  - verTodos:  texto del botón que quita el filtro
    // Si un tipo no tiene "tarjeta", solo se abre la sección.
    // Para sumar otro tipo: agregar su entrada acá y su grupo arriba.
    const TIPOS = {

        ficha: {
            ventana: "fichas",
            lista: "#listaFichas",
            tarjeta: ".ficha-tarjeta",
            idTarjeta: tarjeta =>
                leerIdDesdeOnclick(tarjeta, /vistaPreviaFicha\(\s*(\d+)\s*\)/),
            verTodos: "Ver todas las fichas"
        },

        menu: {
            ventana: "menus",
            lista: "#listaMenus",
            tarjeta: ".menu-tarjeta",
            idTarjeta: tarjeta =>
                leerIdDesdeOnclick(tarjeta, /vistaPreviaMenu\(\s*(\d+)\s*\)/),
            verTodos: "Ver todos los menús"
        },

        etiqueta: {
            ventana: "etiquetas",
            lista: "#gridEtiquetas",
            tarjeta: ".tarjeta-etiqueta",
            idTarjeta: tarjeta =>
                leerIdDesdeOnclick(tarjeta, /vistaPreviaEtiqueta\(\s*(\d+)\s*\)/),
            verTodos: "Ver todas las etiquetas"
        },

        multimedia: {
            ventana: "multimedia",
            lista: "#listaMultimediaGeneral",
            tarjeta: ".tarjeta-multimedia",
            idTarjeta: tarjeta =>
                leerIdDesdeOnclick(tarjeta, /vistaPreviaMultimedia\(\s*(\d+)\s*\)/),
            verTodos: "Ver toda la multimedia"
        },

        plantilla: {
            ventana: "plantillas",
            lista: "#gridPlantillas",
            tarjeta: ".tarjeta-plantilla",
            idTarjeta: tarjeta =>
                leerIdDesdeOnclick(tarjeta, /vistaPreviaPlantilla\(\s*(\d+)\s*\)/),
            verTodos: "Ver todas las plantillas"
        }

    };

    const TITULO_POR_TIPO = {
        ficha: "Fichas",
        menu: "Menús",
        etiqueta: "Etiquetas",
        multimedia: "Multimedia",
        plantilla: "Plantillas"
    };

    const caja = document.getElementById("buscadorGlobal");
    const entrada = document.getElementById("buscadorGlobalInput");
    const lista = document.getElementById("buscadorGlobalResultados");

    if (!caja || !entrada || !lista) {
        return;
    }

    let temporizador = null;
    let numeroBusqueda = 0;


    function abrirLista() {
        lista.hidden = false;
    }

    function cerrarLista() {
        lista.hidden = true;
    }


    function mostrarMensaje(texto) {

        lista.replaceChildren();

        const mensaje = document.createElement("p");
        mensaje.className = "buscador-mensaje";
        mensaje.textContent = texto;

        lista.appendChild(mensaje);

        abrirLista();

    }


    // Busca, dentro de una tarjeta, un botón con onclick="funcion(ID)"
    // y devuelve ese ID
    function leerIdDesdeOnclick(tarjeta, patron) {

        for (const elemento of tarjeta.querySelectorAll("[onclick]")) {

            const coincidencia =
                patron.exec(elemento.getAttribute("onclick"));

            if (coincidencia) {
                return coincidencia[1];
            }

        }

        return null;

    }


    // Espera a que la sección termine de dibujar su lista
    function esperarElementos(selector, maximoMs = 6000) {

        return new Promise(resolve => {

            const inicio = Date.now();

            (function revisar() {

                const encontrados =
                    document.querySelectorAll(selector);

                if (encontrados.length > 0) {
                    resolve([...encontrados]);
                    return;
                }

                if (Date.now() - inicio > maximoMs) {
                    resolve([]);
                    return;
                }

                setTimeout(revisar, 100);

            })();

        });

    }


    // Deja visible solo la tarjeta buscada y agrega un aviso
    // con un botón para volver a ver todas
    async function mostrarSoloResultado(resultado, config) {

        const tarjetas = await esperarElementos(config.tarjeta);

        const elegida = tarjetas.find(
            tarjeta =>
                config.idTarjeta(tarjeta) === String(resultado.id)
        );

        // Si no se encuentra, se deja la lista completa
        if (!elegida) {
            return;
        }

        tarjetas.forEach(tarjeta => {
            if (tarjeta !== elegida) {
                tarjeta.style.display = "none";
            }
        });

        const lista = document.querySelector(config.lista);

        if (!lista) {
            return;
        }

        const aviso = document.createElement("div");
        aviso.className = "buscador-filtro-activo";

        const texto = document.createElement("span");
        texto.textContent =
            "Mostrando solo el resultado de la búsqueda: " +
            (resultado.titulo || "");

        const volver = document.createElement("button");
        volver.type = "button";
        volver.textContent = config.verTodos || "Ver todos";

        volver.addEventListener("click", () => {

            tarjetas.forEach(tarjeta => {
                tarjeta.style.display = "";
            });

            aviso.remove();

        });

        aviso.append(texto, volver);

        lista.before(aviso);

    }


    // Abre la sección que corresponde al tipo del resultado
    async function abrirResultado(resultado) {

        const config = TIPOS[resultado.tipo];

        if (!config || typeof cargarVentana !== "function") {
            return;
        }

        document
            .querySelectorAll(".sidebar .item")
            .forEach(item => {
                item.classList.toggle(
                    "activo",
                    item.dataset.ventana === config.ventana
                );
            });

        entrada.value = "";
        cerrarLista();

        await cargarVentana(config.ventana);

        if (config.tarjeta) {
            await mostrarSoloResultado(resultado, config);
        }

    }


    function mostrarResultados(resultados) {

        if (!Array.isArray(resultados) || resultados.length === 0) {
            mostrarMensaje("Sin resultados.");
            return;
        }

        lista.replaceChildren();

        ORDEN_TIPOS.forEach(tipo => {

            const delTipo = resultados.filter(r => r.tipo === tipo);

            if (delTipo.length === 0) {
                return;
            }

            const encabezado = document.createElement("h4");
            encabezado.className = "buscador-grupo";
            encabezado.textContent = TITULO_POR_TIPO[tipo];
            lista.appendChild(encabezado);

            delTipo.forEach(resultado => {

                const boton = document.createElement("button");
                boton.type = "button";
                boton.className = "buscador-resultado";

                // textContent (no innerHTML): los títulos los escriben
                // usuarios y no deben interpretarse como HTML
                const titulo = document.createElement("strong");
                titulo.textContent = resultado.titulo || "(sin título)";
                boton.appendChild(titulo);

                if (resultado.extra) {
                    const extra = document.createElement("small");
                    extra.textContent = resultado.extra;
                    boton.appendChild(extra);
                }

                boton.addEventListener(
                    "click",
                    () => abrirResultado(resultado)
                );

                lista.appendChild(boton);

            });

        });

        abrirLista();

    }


    async function buscar(texto) {

        const miBusqueda = ++numeroBusqueda;

        try {

            const respuesta = await window.fetchProtegido(
                "/api/buscar?q=" + encodeURIComponent(texto)
            );

            const datos = await respuesta.json();

            // Si mientras tanto se escribió otra cosa, se descarta esta respuesta
            if (miBusqueda !== numeroBusqueda) {
                return;
            }

            if (!respuesta.ok) {
                mostrarMensaje(datos.error || "No se pudo buscar.");
                return;
            }

            mostrarResultados(datos);

        } catch (error) {

            if (miBusqueda !== numeroBusqueda) {
                return;
            }

            console.error("ERROR BUSCADOR:", error);

            mostrarMensaje("No se pudo buscar.");

        }

    }


    entrada.addEventListener("input", () => {

        clearTimeout(temporizador);

        const texto = entrada.value.trim();

        if (texto.length < MINIMO_LETRAS) {
            numeroBusqueda++;
            cerrarLista();
            return;
        }

        temporizador = setTimeout(
            () => buscar(texto),
            ESPERA_MS
        );

    });

    entrada.addEventListener("focus", () => {

        if (
            entrada.value.trim().length >= MINIMO_LETRAS &&
            lista.childElementCount > 0
        ) {
            abrirLista();
        }

    });

    entrada.addEventListener("keydown", evento => {

        if (evento.key === "Escape") {
            cerrarLista();
            entrada.blur();
        }

    });

    document.addEventListener("click", evento => {

        if (!caja.contains(evento.target)) {
            cerrarLista();
        }

    });

})();