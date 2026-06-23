// Cargar Héroes Dinámicamente
function cargarPantallaDinamica(id_menu) {
    fetch(`/api/estructura-pantalla/${id_menu}`)
        .then(res => res.json())
        .then(data => {
            const gridContainer = document.getElementById('listaFichasDinamica');
            gridContainer.innerHTML = ''; // Limpiar grilla

            data.elementosFichas.forEach(ficha => {
                const card = document.createElement('div');
                card.className = "group relative aspect-[3/4] bg-surface-container-low border border-outline-variant/20 hover:border-primary/50 transition-all duration-300 cursor-pointer overflow-hidden inner-glow parchment-texture";

                card.innerHTML = `
                    <div class="absolute inset-0 flex flex-col items-center justify-end p-4 z-10">
                        <div class="bg-surface-dim/80 w-full py-4 text-center">
                            <p class="font-label-caps text-outline mb-1">SOLDADO</p>
                            <p class="font-headline-md text-on-secondary uppercase text-[14px]">${ficha.titulo}</p>
                        </div>
                    </div>
                    <div class="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity"
                         style="background-image: url('${ficha.imagen || '/default-soldado.png'}')">
                    </div>
                `;

                card.onclick = () => abrirPanelDetalle(ficha);
                gridContainer.appendChild(card);
            });
        });
}

// Abrir Panel Lateral
function abrirPanelDetalle(ficha) {
    const panel = document.getElementById('panel-lateral-detalle');
    document.getElementById('contenido-detalle').innerHTML = `
        <h2 class="text-2xl text-on-secondary">${ficha.titulo}</h2>
        <p class="mt-4 text-on-surface-variant">${ficha.texto}</p>
    `;
    panel.classList.add('panel-abierto');
}

function cerrarPanel() {
    document.getElementById('panel-lateral-detalle').classList.remove('panel-abierto');
}
