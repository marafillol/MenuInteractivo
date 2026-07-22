async function cargarVistaPrevia(idFicha){

    try{

        const respuesta =
        await fetch(`/api/public/fichas/${idFicha}`);


        const ficha =
        await respuesta.json();


        const visor =
        document.getElementById("visorFicha");


        visor.classList.remove("oculto");

        document.body.classList.add("vistaAbierta");


        let contenido = `



            <button
            class="cerrarVista"
            onclick="cerrarVistaPrevia()">

            ✕
            </button>



            <div class="cabeceraVista">

                <img
                    class="imagenVista"
                    src="${
                        ficha.imagen
                        ? "/" + ficha.imagen
                        : "/imagenes/default.png"
                    }">

                <h2>
                    ${ficha.titulo}
                </h2>

                <span>
                    ${ficha.menu}
                </span>


                ${ficha.resumen ? `

                <div class="resumenFicha">

                    <label>
                        Resumen
                    </label>

                    <p>
                        ${ficha.resumen}
                    </p>

                </div>

                ` : ""}


                </div>

            </div>


        `;



        /*
            CAMPOS DINÁMICOS
        */

        const campos =
        ficha.plantilla?.estructura?.campos || [];



        campos.forEach(campo=>{


            if(!campo.mostrarVistaPrevia){

                return;

            }


            const valor =
            ficha.datos_json?.[campo.nombre];



            if(valor === undefined ||
               valor === null ||
               valor === ""){

                return;

            }



            contenido += `

                <div class="datoFicha">

                    <label>

                        ${campo.etiqueta}

                    </label>

                    <p>

                        ${valor}

                    </p>

                </div>

            `;


        });



        // ==========================================
        // ETIQUETAS
        // ==========================================

        if(ficha.etiquetas && ficha.etiquetas.length){

            contenido += `

                <section class="seccionEtiquetas">

                    <h3>

                        Etiquetas

                    </h3>

                    <div class="listaEtiquetas">

            `;

            ficha.etiquetas.forEach(etiqueta=>{

                contenido += `

                    <span class="etiquetaFicha">

                        ${etiqueta.nombre}

                    </span>

                `;

            });

            contenido += `

                    </div>

                </section>

            `;

        }

        contenido += `

        <button
        class="btnFichaCompleta"
        onclick="abrirHistoriaCompleta(${ficha.id_ficha})">

        VER HISTORIA COMPLETA

        </button>

        `;



        visor.innerHTML = contenido;


    }
    catch(error){

        console.error(
            "Error cargando vista previa:",
            error
        );

    }

}

function cerrarVistaPrevia(){

    const visor =
    document.getElementById("visorFicha");


    visor.classList.add("oculto");




    document.body.classList.remove("vistaAbierta");

}