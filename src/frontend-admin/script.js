fetch("http://localhost:3000/menus")
    .then(respuesta => respuesta.json())
    .then(menus => {

        const lista = document.getElementById("listaMenus");

        menus.forEach(menu => {

            const item = document.createElement("li");

            item.textContent = menu.descripcion;

            lista.appendChild(item);

        });

    })
    .catch(error => {
        console.error(error);
    });
    