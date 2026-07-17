// ======================================
// CLIENTE API CON FIREBASE TOKEN
// ======================================


async function esperarFirebase(){


    while(
        typeof window.obtenerTokenFirebase !== "function"
    ){

        await new Promise(
            resolve => setTimeout(resolve,100)
        );

    }


}




async function fetchProtegido(url, opciones = {}){


    await esperarFirebase();


    const token =
    await window.obtenerTokenFirebase();



    if(!opciones.headers){

        opciones.headers = {};

    }



    opciones.headers.Authorization =
    "Bearer " + token;



    return fetch(
        url,
        opciones
    );


}



window.fetchProtegido =
fetchProtegido;