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

    // Obtener el token después de que la autenticación esté lista.
    const token = await window.obtenerTokenSupabase();

    const headers = new Headers(opciones.headers || {});
    headers.set("Authorization", "Bearer " + token);

    const respuesta = await fetch(url, {
        ...opciones,
        headers
    });

    console.log("[fetchProtegido]", url, {
        totalMs: Math.round(performance.now() - inicio),
        status: respuesta.status
    });

    return respuesta;
}

window.fetchProtegido = fetchProtegido;
