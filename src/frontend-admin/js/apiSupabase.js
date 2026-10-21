async function esperarTokenSupabase() {
    for (let intento = 0; intento < 150; intento += 1) {
        if (typeof window.obtenerTokenSupabase === "function") return;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("No se pudo inicializar la autenticación de Supabase.");
}


async function fetchProtegido(url, opciones = {}) {
    const inicio = performance.now();

    await esperarTokenSupabase();
    const despuesDeEsperar = performance.now();

    const token = await window.obtenerTokenSupabase();
    const despuesDelToken = performance.now();

    const headers = new Headers(opciones.headers || {});
    headers.set("Authorization", "Bearer " + token);

    const respuesta = await fetch(url, { ...opciones, headers });
    const fin = performance.now();

    console.log("[fetchProtegido]", url, {
        esperaInicializacionMs: Math.round(despuesDeEsperar - inicio),
        obtenerTokenMs: Math.round(despuesDelToken - despuesDeEsperar),
        respuestaServidorMs: Math.round(fin - despuesDelToken),
        totalMs: Math.round(fin - inicio),
        status: respuesta.status
    });

    return respuesta;
}


window.fetchProtegido = fetchProtegido;
