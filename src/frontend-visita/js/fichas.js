
// =======================================================
// CARGAR FICHAS
// =======================================================

async function cargarFichas(idMenu = null){

    try{

        let url = "/api/public/fichas";

        if(idMenu && idMenu != 0){

            url = `/api/public/fichas/menu/${idMenu}`;

        }

        const respuesta = await fetch(url);

        const fichas = await respuesta.json();

        const contenedor =
        document.getElementById("contenedorFichas");

        contenedor.innerHTML = "";

        fichas.forEach(ficha=>{


            let camposTarjeta="";


            if(ficha.plantilla){

                const campos =
                ficha.plantilla.estructura.campos || [];


                campos.forEach(campo=>{


                    if(!campo.mostrarTarjeta)
                        return;


                    const valor =
                    ficha.datos_json[campo.nombre];


                    if(!valor)
                        return;


                    camposTarjeta += `

                    <small>

                        <b>${campo.etiqueta}:</b>
                        ${valor}

                    </small>

                    `;


                });

            }


            contenedor.innerHTML += `

                <article
                    class="tarjetaFicha"
                    data-id="${ficha.id_ficha}">

                    <div class="imagenFicha">

                        <img
                            src="${
                                ficha.imagen
                                ? "/" + ficha.imagen
                                : "/imagenes/default.png"
                            }"
                            alt="${ficha.titulo}"
                        >

                    </div>

                    <div class="infoFicha">

                        <h3>${ficha.titulo}</h3>

                        <p>${ficha.menu}</p>

                        <div class="camposTarjeta">

                        ${camposTarjeta}

                        </div>

                    </div>

                </article>

            `;

        });


        const tarjetas =
        document.querySelectorAll(".tarjetaFicha");


        tarjetas.forEach(tarjeta=>{

            tarjeta.addEventListener("click",()=>{

                const idFicha =
                tarjeta.dataset.id;


                cargarVistaPrevia(idFicha);

            });

        });

    }

    catch(error){

        console.error(error);

    }

}

