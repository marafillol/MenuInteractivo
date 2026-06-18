cargarMenus();

function cargarMenus() {

    fetch("http://localhost:3000/menus")
        .then(respuesta => respuesta.json())
        .then(menus => {

            const lista = document.getElementById("listaMenus");

            lista.innerHTML = "";

            menus.forEach(menu => {

                const item = document.createElement("li");

                item.textContent = menu.descripcion;

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