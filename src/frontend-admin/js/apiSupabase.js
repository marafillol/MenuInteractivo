async function esperarTokenSupabase() {
    for (let intento = 0; intento < 150; intento += 1) {
        if (typeof window.obtenerTokenSupabase === "function") return;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("No se pudo inicializar la autenticación de Supabase.");
}

async function fetchProtegido(url, opciones = {}) {
    await esperarTokenSupabase();
    const token = await window.obtenerTokenSupabase();
    const headers = new Headers(opciones.headers || {});
    headers.set("Authorization", "Bearer " + token);

    return fetch(url, { ...opciones, headers });
}

window.fetchProtegido = fetchProtegido;
