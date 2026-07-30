let fichasCargadas = [];
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


        fichasCargadas = await respuesta.json();


        pintarFichas(fichasCargadas);


    }

    catch(error){

        console.error(error);

    }

}


function buscarFichas(){


    const texto =
    document
    .getElementById("buscador")
    .value
    .toLowerCase()
    .trim();



    if(texto === ""){


        pintarFichas(fichasCargadas);


        return;

    }



    const resultado =
    fichasCargadas.filter(ficha=>{


        const nombre =
        ficha.titulo
        ?.toLowerCase() || "";



        return nombre.includes(texto);


    });



    pintarFichas(resultado);


}

function pintarFichas(fichas){


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

        <article class="tarjetaFicha"
            data-id="${ficha.id_ficha}">


            <img class="baseFicha" src="img/fondo.png">


            <div class="clip">
                <img src="img/clip.png">
            </div>


            <div class="imagenFicha">

                <img
                src="${
                    ficha.imagen
                    ? "/" + ficha.imagen
                    : "/imagenes/default.png"
                }">

            </div>


            <div class="infoFicha">

                <h3>${ficha.titulo}</h3>


                <div class="camposTarjeta">

                    ${camposTarjeta}

                </div>


            </div>


        </article>

        `;


    });



    activarTarjetas();


}


function activarTarjetas(){

    const tarjetas =
    document.querySelectorAll(".tarjetaFicha");


    tarjetas.forEach(tarjeta=>{


        tarjeta.addEventListener("click",()=>{


            const idFicha =
            tarjeta.dataset.id;


            abrirHistoriaCompleta(idFicha);


        });


    });

}
