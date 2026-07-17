console.log("dashboard.js cargado");


async function cargarDashboard(){

    try{

        const respuesta =
        await window.fetchProtegido("/api/dashboard");


        const datos =
        await respuesta.json();

        console.log("Datos dashboard:", datos);



        document.getElementById("totalMenus").textContent =
        datos.resumen.menus;


        document.getElementById("totalFichas").textContent =
        datos.resumen.fichas;


        document.getElementById("totalMultimedia").textContent =
        datos.resumen.multimedia;


        document.getElementById("totalPlantillas").textContent =
        datos.resumen.plantillas;


        document.getElementById("totalEtiquetas").textContent =
        datos.resumen.etiquetas;



        const listaFichas =
        document.getElementById("listaFichas");


        if(listaFichas){

            listaFichas.innerHTML =
            datos.fichas.map(f=>`

                <div class="dashboard-item">

                    <strong>
                        📄 ${f.titulo}
                    </strong>

                    <span>
                        ${f.creado}
                    </span>

                </div>

            `).join("");

        }



        const listaMenus =
        document.getElementById("listaMenus");


        if(listaMenus){

            listaMenus.innerHTML =
            datos.menus.map(m=>`

                <div class="dashboard-item">

                    <strong>
                        ${m.nombre}
                    </strong>

                    <span>
                        ${m.actualizado}
                    </span>

                </div>

            `).join("");

        }



        const listaMulti =
        document.getElementById("listaMultimedia");


        if(listaMulti){

            listaMulti.innerHTML =
            datos.multimedia.map(m=>`

                <div class="dashboard-item">

                    <strong>
                        ${m.tipo_multi}
                    </strong>

                    <span>
                        ${m.descripcion}
                    </span>

                </div>

            `).join("");

        }


        crearGraficoBarras(

            document.getElementById(
                "graficoFichasMenu"
            ),

            datos.fichasMenu,

            "nombre",

            "cantidad"

        );



        crearGraficoBarras(

            document.getElementById(
                "graficoMultimedia"
            ),

            datos.multimedia,

            "tipo_multi",

            "cantidad"

        );

        mostrarEstadoContenido(
            datos.estado
        );



    }
    catch(error){

        console.error(
            "Error cargando dashboard:",
            error
        );

    }

}



function crearGraficoBarras(
    elemento,
    datos,
    campoNombre,
    campoValor
){

    const max =
    Math.max(
        ...datos.map(
            d=>d[campoValor]
        )
    );


    elemento.innerHTML =
    datos.map(d=>{


        let porcentaje =
        (d[campoValor] / max) * 100;



        return `

        <div class="dashboard-barra-item">


            <div class="dashboard-barra-titulo">

                <span>
                ${d[campoNombre]}
                </span>


                <strong>
                ${d[campoValor]}
                </strong>

            </div>



            <div class="dashboard-barra-fondo">

                <div
                class="dashboard-barra-progreso"
                style="width:${porcentaje}%">

                </div>

            </div>


        </div>

        `;


    }).join("");

}


function mostrarEstadoContenido(datos){


    const contenedor =
    document.getElementById(
        "estadoContenido"
    );


    contenedor.innerHTML =
    datos.map(item=>{


        return `

        <div class="dashboard-item">


            <strong>
            ${item.tipo.toUpperCase()}
            </strong>


            <span>

            ✅ ${item.visibles}

            |

            ❌ ${item.no_visibles}

            </span>


        </div>

        `;


    }).join("");


}

cargarDashboard();