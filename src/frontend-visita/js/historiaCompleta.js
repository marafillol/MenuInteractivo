async function abrirHistoriaCompleta(idFicha){
        console.log(
            "Historia completa clickeada:",
            idFicha
        );


    try{

        const respuesta =
        await fetch(`/api/public/fichas/${idFicha}`);


        const ficha =
        await respuesta.json();

        console.log("Ficha recibida:", ficha);

        console.log("MULTIMEDIA:", ficha.multimedia);



        const visor =
        document.getElementById("visorFicha");

        visor.classList.remove("oculto");

        document.body.classList.add("vistaAbierta");

        console.log("visor:", visor);

        console.log(
            "modal:",
            document.getElementById("modalHistoriaCompleta")
        );


        let contenido = `


        <div class="historiaCompleta">


            <button
            class="btnVolverVista"
            onclick="cerrarVistaCompleta()">

                ← Volver

            </button>


            <img
            class="imagenHistoria"
            src="${
                ficha.imagen
                ? "/" + ficha.imagen
                : "/imagenes/default.png"
            }">


            <h1>
                ${ficha.titulo}
            </h1>


            <span>
                ${ficha.menu}
            </span>


            ${ficha.resumen ? `

            <section class="seccionHistoria">

                <h2>Resumen</h2>

                <p>${ficha.resumen}</p>

            </section>

            ` : ""}


        `;



        // =========================
        // DATOS DINÁMICOS
        // =========================


        const campos =
        ficha.plantilla?.estructura?.campos || [];


        const camposConValor =
        campos.filter(campo=>{

            const valor =
            ficha.datos_json?.[campo.nombre];


            return valor !== undefined &&
                valor !== null &&
                valor !== "";

        });


        if(camposConValor.length){

            contenido += `

            <section class="seccionHistoria">

                <h2>Datos especificos de ${ficha.menu}</h2>

            `;


            camposConValor.forEach(campo=>{

                const valor =
                ficha.datos_json[campo.nombre];


                contenido += `

                <div class="datoHistoria">

                    <label>

                    ${campo.etiqueta}

                    </label>


                    <p>

                    ${valor}

                    </p>


                </div>


                `;

            });


            contenido += `

            </section>

            `;

        }


        // ======================================
        // ETIQUETAS
        // ======================================

        if(ficha.etiquetas && ficha.etiquetas.length){

            contenido += `

                <section class="seccionHistoria">

                    <h2>Etiquetas</h2>

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


        // =========================
        // TEXTO COMPLETO
        // =========================


        if(ficha.texto){


            contenido += `


            <section class="textoHistoria">


                <h2>

                    Historia

                </h2>


                <p>

                    ${ficha.texto}

                </p>


            </section>


            `;


        }



        if(ficha.multimedia && ficha.multimedia.length){

            contenido += `

                <section class="seccionMultimedia">

                    <h2>Galería multimedia</h2>

                    <div class="galeriaMultimedia">

            `;

            ficha.multimedia.forEach(item=>{

                if(item.tipo_multi === "imagen"){

                    contenido += `

                        <article class="itemMultimedia">

                            <img
                                class="miniaturaMultimedia"
                                src="/${item.ruta_archivo}"
                                onclick="abrirImagenMultimedia(this.src)"
                                alt="${item.descripcion || ""}">


                            <p>
                                ${item.descripcion || ""}
                            </p>

                        </article>

                    `;

                }

                else if(item.tipo_multi === "video"){

                    contenido += `

                        <article class="itemMultimedia">

                            <video
                                class="miniaturaMultimedia"
                                onclick="abrirVideoMultimedia('/${item.ruta_archivo}')">

                                <source
                                    src="/${item.ruta_archivo}"
                                    type="video/mp4">

                            </video>


                            <p>
                                ${item.descripcion || ""}
                            </p>

                        </article>

                    `;

                }

                else if(item.tipo_multi === "audio"){

                    contenido += `

                        <article class="itemMultimedia">


                            <div
                            class="miniaturaAudio"
                            onclick="abrirAudioMultimedia('/${item.ruta_archivo}')">


                                🎧


                            </div>


                            <p>
                                ${item.descripcion || "Audio"}
                            </p>


                        </article>

                    `;

                }
                else if(item.tipo_multi === "pdf"){

                    contenido += `

                        <article class="itemMultimedia">

                            <div
                            class="miniaturaDocumento"
                            onclick="abrirDocumentoMultimedia('/${item.ruta_archivo}')">

                                📄

                            </div>


                            <p>
                                ${item.descripcion || "Documento"}
                            </p>

                        </article>

                    `;

                }

            });

            contenido += `

                    </div>

                </section>

            `;

        }else{

             contenido += `

                 <section class="seccionMultimedia">

                     <h2>
                         Galería multimedia
                     </h2>

                     <p>
                         No hay contenido multimedia disponible.
                     </p>

                 </section>

             `;

        }


        // ======================================
        // FICHAS RELACIONADAS
        // ======================================

        if(ficha.relacionadas && ficha.relacionadas.length){

            contenido += `

                <section class="seccionRelacionadas">

                    <h2>

                        Fichas relacionadas

                    </h2>

                    <div class="gridRelacionadas">

            `;

            ficha.relacionadas.forEach(relacionada=>{

                contenido += `

                    <article
                        class="tarjetaRelacionada"
                        onclick="abrirHistoriaCompleta(${relacionada.id_ficha})">

                        <div class="encabezadoRelacion">

                            <small>

                                RELACIÓN

                            </small>

                            <strong>

                                ${relacionada.tipo_relacion}

                            </strong>

                        </div>

                        <img
                            src="${
                                relacionada.imagen
                                ? "/" + relacionada.imagen
                                : "/imagenes/default.png"
                            }">

                        <div class="infoRelacion">

                            <h3>

                                ${relacionada.titulo}

                            </h3>

                            <p>

                                ${relacionada.menu}

                            </p>

                        </div>

                    </article>

                `;

            });

            contenido += `

                    </div>

                </section>

            `;

        }



        contenido += `

        </div>

        `;


        visor.innerHTML = contenido;

        visor
        .querySelector(".btnVolverVista")
        .textContent = "Cerrar";


    }
    catch(error){

        console.error(
            "Error historia completa:",
            error
        );

    }

}

function abrirImagenMultimedia(src){


    const visor =
    document.getElementById("visorImagen");


    const imagen =
    document.getElementById("imagenAmpliada");


    imagen.src = src;


    visor.style.display="flex";


}


function cerrarImagenMultimedia(){


    document
    .getElementById("visorImagen")
    .style.display="none";


}




function abrirVideoMultimedia(src){


    const visor =
    document.getElementById("visorVideo");


    const video =
    document.getElementById("videoAmpliado");


    video.src = src;


    visor.style.display="flex";


}


function cerrarVideoMultimedia(){


    const visor =
    document.getElementById("visorVideo");


    const video =
    document.getElementById("videoAmpliado");


    video.pause();

    video.src="";


    visor.style.display="none";


}



function abrirDocumentoMultimedia(src){


    const visor =
    document.getElementById("visorDocumento");


    const documento =
    document.getElementById("documentoAmpliado");


    documento.src = src;


    visor.style.display="flex";


}



function cerrarDocumentoMultimedia(){


    document
    .getElementById("visorDocumento")
    .style.display="none";


    document
    .getElementById("documentoAmpliado")
    .src="";


}



function abrirAudioMultimedia(src){


    const visor =
    document.getElementById("visorAudio");


    const audio =
    document.getElementById("audioAmpliado");


    audio.src = src;


    visor.style.display="flex";


}



function cerrarAudioMultimedia(){


    const visor =
    document.getElementById("visorAudio");


    const audio =
    document.getElementById("audioAmpliado");


    audio.pause();

    audio.src="";


    visor.style.display="none";


}

function cerrarVistaCompleta(){

    const visor =
    document.getElementById("visorFicha");


    visor.innerHTML = "";
    visor.classList.add("oculto");


    document.body.classList.remove("vistaAbierta");

}

function volverVistaPrevia(){

    cerrarVistaCompleta();

}
