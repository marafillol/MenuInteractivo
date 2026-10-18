
(() => {
    "use strict";

    const PREFIJO = "menuinteractivo:borrador:v1";

    function obtenerUsuarioId() {
        return window.usuarioActual?.id_usuario ?? null;
    }

    function obtenerClave(tipo, idRegistro = "nuevo") {
        const usuarioId = obtenerUsuarioId();

        // No guardar borradores si todavía no se identificó al usuario.
        if (!usuarioId || !tipo) {
            return null;
        }

        return `${PREFIJO}:${usuarioId}:${tipo}:${idRegistro}`;
    }

    function guardar(tipo, idRegistro, datos) {
        const clave = obtenerClave(tipo, idRegistro);

        if (!clave || !datos || typeof datos !== "object") {
            return false;
        }

        try {
            const borrador = {
                tipo,
                idRegistro: String(idRegistro ?? "nuevo"),
                actualizadoEn: new Date().toISOString(),
                datos
            };

            localStorage.setItem(clave, JSON.stringify(borrador));
            return true;
        } catch (error) {
            console.error("No se pudo guardar el borrador:", error);
            return false;
        }
    }

    function leer(tipo, idRegistro = "nuevo") {
        const clave = obtenerClave(tipo, idRegistro);

        if (!clave) {
            return null;
        }

        try {
            const contenido = localStorage.getItem(clave);
            return contenido ? JSON.parse(contenido) : null;
        } catch (error) {
            console.error("No se pudo recuperar el borrador:", error);
            return null;
        }
    }

    function eliminar(tipo, idRegistro = "nuevo") {
        const clave = obtenerClave(tipo, idRegistro);

        if (!clave) {
            return false;
        }

        try {
            localStorage.removeItem(clave);
            return true;
        } catch (error) {
            console.error("No se pudo eliminar el borrador:", error);
            return false;
        }
    }

    function obtenerTodos(tipo) {
        const usuarioId = obtenerUsuarioId();

        if (!usuarioId) {
            return [];
        }

        const prefijoUsuario = `${PREFIJO}:${usuarioId}:`;
        const borradores = [];

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const clave = localStorage.key(i);

                if (!clave?.startsWith(prefijoUsuario)) {
                    continue;
                }

                if (tipo && !clave.startsWith(`${prefijoUsuario}${tipo}:`)) {
                    continue;
                }

                try {
                    const borrador = JSON.parse(localStorage.getItem(clave));

                    if (borrador) {
                        borradores.push(borrador);
                    }
                } catch {
                    // Ignorar únicamente el borrador dañado.
                }
            }
        } catch (error) {
            console.error("No se pudieron listar los borradores:", error);
        }

        return borradores.sort(
            (a, b) =>
                new Date(b.actualizadoEn).getTime() -
                new Date(a.actualizadoEn).getTime()
        );
    }

    window.Borradores = Object.freeze({
        guardar,
        leer,
        eliminar,
        obtenerTodos
    });
})();
