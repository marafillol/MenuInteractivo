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

    // 2. Función para aplicar las clases de orientación al body
    const aplicarOrientacion = (modo) => {
        document.body.classList.remove("totem-horizontal", "totem-right", "totem-left");
        
        if (modo === "right") {
            document.body.classList.add("totem-right");
        } else if (modo === "left") {
            document.body.classList.add("totem-left");
        } else {
            document.body.classList.add("totem-horizontal");
        }
    };

    // 3. Consultar la API pública del servidor para obtener la configuración guardada
    try {
        const respuesta = await fetch("/api/public/configuracion/estilo-visitante");
        if (respuesta.ok) {
            const estilo = await respuesta.json();
            aplicarOrientacion(estilo.orientacionTotem || "horizontal");
        } else {
            aplicarOrientacion("horizontal");
        }
    } catch (error) {
        console.warn("No se pudo conectar con el servidor para la orientación, usando horizontal.");
        aplicarOrientacion("horizontal");
    }

    // 4. Chequeo periódico opcional por si el tótem queda abierto y cambian la config en el panel
    setInterval(async () => {
        try {
            const respuesta = await fetch("/api/public/configuracion/estilo-visitante");
            if (respuesta.ok) {
                const estilo = await respuesta.json();
                if (estilo.orientacionTotem) {
                    aplicarOrientacion(estilo.orientacionTotem);
                }
            }
        } catch (e) {
            // Silenciar errores de red periódicos
        }
    }, 10000); // Revisa cada 10 segundos si hubo cambios en el panel
})();