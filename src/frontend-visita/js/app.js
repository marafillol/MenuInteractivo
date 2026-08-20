function esperarImagen(ruta){

    return new Promise(resolve=>{

        const imagen = new Image();

        imagen.onload = resolve;
        imagen.onerror = resolve;
        imagen.src = ruta;

    });

}

document.addEventListener("DOMContentLoaded", async() => {

    const fuentes = document.fonts?.ready || Promise.resolve();

    await Promise.all([
        fuentes,
        esperarImagen("img/fondo-malvinass.png")
    ]);

    mostrarBienvenida();

    requestAnimationFrame(()=>{
        document.body.classList.remove("cargando-visita");
    });

});

