(async function() {
    // 1. Asegurar que exista un .totem-wrapper que envuelva todo el contenido del body
    let wrapper = document.querySelector('.totem-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'totem-wrapper';
        
        // Mover todos los hijos del body (excepto los scripts) dentro del wrapper
        const elementos = Array.from(document.body.children);
        elementos.forEach(el => {
            if (el.tagName !== 'SCRIPT') {
                wrapper.appendChild(el);
            }
        });
        document.body.appendChild(wrapper);
    }

    // 1.b. Overlays que deben rotar por su cuenta (fuera del wrapper).
    // El wrapper tiene transform, y eso rompe el position:fixed de sus hijos,
    // así que se sacan al body para que el CSS los rote de forma independiente.
    const IDS_OVERLAYS = ['historiaCompleta', 'visorFicha'];

    const sacarOverlaysDelWrapper = () => {
        IDS_OVERLAYS.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.parentElement !== document.body) {
                document.body.appendChild(el);
            }
        });
    };

    // Se ejecuta como máximo una vez por frame para no sumar carga
    let pendiente = false;
    new MutationObserver(() => {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(() => {
            pendiente = false;
            sacarOverlaysDelWrapper();
        });
    }).observe(document.body, { childList: true, subtree: true });

    sacarOverlaysDelWrapper();

    // 2. Función para aplicar las clases de orientación al body
    let orientacionActual = null;

    const aplicarOrientacion = (modo) => {
        // Si no cambió, no se hace nada (evita disparar "resize" cada 10 segundos)
        if (modo === orientacionActual) return;
        orientacionActual = modo;

        document.body.classList.remove("totem-horizontal", "totem-right", "totem-left");
        
        if (modo === "right") {
            document.body.classList.add("totem-right");
        } else if (modo === "left") {
            document.body.classList.add("totem-left");
        } else {
            document.body.classList.add("totem-horizontal");
        }

        // Forzar un evento de redimensionamiento para que los scripts internos recalculen las dimensiones
        window.dispatchEvent(new Event('resize'));
    };

    // =====================================================
    // 2.b. INACTIVIDAD: si nadie toca el tótem durante X segundos
    //      (X se configura en el panel administrativo), se recarga
    //      la pantalla y se vuelve al inicio.
    //
    //      El valor llega en la misma respuesta de configuración que la
    //      orientación, con el nombre "tiempoInactividad" (en segundos).
    //      0, vacío o ausente = función desactivada.
    // =====================================================
    // Todas las vistas (inicio, fichas, etc.) comparten la misma URL, así que no se
    // navega a ninguna ruta: se recarga la página actual y la app arranca de cero
    // desde la pantalla de bienvenida.
    const MINIMO_SEGUNDOS = 10;     // tope inferior para evitar reinicios en bucle

    let inactividadMs = 0;          // 0 = desactivada
    let ultimaActividad = Date.now();
    let huboActividad = false;      // solo se reinicia si alguien usó el tótem desde la última carga

    const registrarActividad = () => {
        ultimaActividad = Date.now();
        huboActividad = true;
    };

    // Solo se guarda una marca de tiempo (no se reinician timers), así que es muy liviano.
    // capture:true permite captar también el "scroll" de elementos internos.
    ['pointerdown', 'pointermove', 'mousedown', 'touchstart', 'touchmove', 'keydown', 'wheel', 'scroll']
        .forEach(evento => {
            document.addEventListener(evento, registrarActividad, { passive: true, capture: true });
        });

    // Un video/audio que se está reproduciendo cuenta como actividad
    // (no se corta lo que el visitante está mirando). Los que están en loop
    // (fondos decorativos) se ignoran.
    const hayMediaReproduciendo = () =>
        Array.from(document.querySelectorAll('video, audio'))
            .some(m => !m.paused && !m.ended && !m.loop);

    const aplicarInactividad = (segundos) => {
        const s = Number(segundos);
        const nuevo = s > 0 ? Math.max(s, MINIMO_SEGUNDOS) * 1000 : 0;
        if (nuevo !== inactividadMs) {
            inactividadMs = nuevo;
            ultimaActividad = Date.now(); // al cambiar la config se empieza a contar de cero
        }
    };

    // Recarga la página actual (vuelve a la pantalla de bienvenida).
    // Antes comprueba que el servidor responda: si no hay conexión, recargar dejaría
    // el tótem en una página de error del navegador, así que se reintenta más tarde.
    let reiniciando = false;

    const reiniciarPantalla = async () => {
        if (reiniciando) return;
        reiniciando = true;

        try {
            await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
            window.location.reload();
        } catch (e) {
            reiniciando = false;
        }
    };

    setInterval(() => {
        if (!inactividadMs || !huboActividad) return;

        if (hayMediaReproduciendo()) {
            ultimaActividad = Date.now();
            return;
        }

        if (Date.now() - ultimaActividad >= inactividadMs) {
            reiniciarPantalla();
        }
    }, 1000);

    // Diagnóstico: en la consola del navegador del tótem ejecutar  totemInactividad()
    window.totemInactividad = () => ({
        configuradoSegundos: inactividadMs / 1000,   // 0 = no llegó la configuración o está desactivada
        huboActividad: huboActividad,                // debe ser true después de tocar la pantalla
        segundosSinActividad: Math.round((Date.now() - ultimaActividad) / 1000),
        mediaReproduciendo: hayMediaReproduciendo()  // true = un video/audio impide el reinicio
    });

    // 3. Aplicar la configuración recibida del servidor
    const aplicarConfiguracion = (estilo) => {
        if (estilo.orientacionTotem || orientacionActual === null) {
            aplicarOrientacion(estilo.orientacionTotem || "horizontal");
        }
        aplicarInactividad(estilo.tiempoInactividad);
    };

    // 3.b. Consultar la API pública del servidor para obtener la configuración guardada
    try {
        const respuesta = await fetch("/api/public/configuracion/estilo-visitante");
        if (respuesta.ok) {
            aplicarConfiguracion(await respuesta.json());
        } else {
            aplicarOrientacion("horizontal");
        }
    } catch (error) {
        console.warn("No se pudo conectar con el servidor para la orientación, usando horizontal.");
        aplicarOrientacion("horizontal");
    }

    // 4. Chequeo periódico por si cambian la config en el panel con el tótem abierto
    setInterval(async () => {
        try {
            const respuesta = await fetch("/api/public/configuracion/estilo-visitante");
            if (respuesta.ok) {
                aplicarConfiguracion(await respuesta.json());
            }
        } catch (e) {
            // Silenciar errores de red periódicos
        }
    }, 10000); // Revisa cada 10 segundos si hubo cambios en el panel
})();