// =======================================================
// RECORTE DE IMAGEN DE PORTADA (CUADRADO)
// =======================================================
//
// Se engancha al input existente #imagenFicha.
//
// Al elegir un archivo:
//
// 1) Abre un recuadro de recorte 1:1 (Cropper.js).
// 2) El admin ajusta qué parte de la foto queda visible.
// 3) Al confirmar, se genera una imagen ya recortada
//    (cuadrada) y se guarda en memoria.
// 4) fichas.js debe usar esa imagen recortada en vez
//    del archivo original al armar el FormData.
//
// REQUIERE (agregar en el <head> del HTML del admin):
//
// <link
//   rel="stylesheet"
//   href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css"
// >
//
// Y antes de este script:
//
// <script
//   src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js"
// ></script>
//
// =======================================================


// =======================================================
// ESTADO GLOBAL
// =======================================================
//
// fichas.js debe leer window.imagenFichaRecortada
// en vez de imagenFicha.files[0] cuando exista.
//

window.imagenFichaRecortada = null;


let recorteCropperInstancia = null;


// =======================================================
// CREAR MODAL DE RECORTE (una sola vez)
// =======================================================

function crearModalRecorte() {

    if (document.getElementById("modalRecorteImagen")) {
        return;
    }

    const overlay = document.createElement("div");

    overlay.id = "modalRecorteImagen";

    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,.72);
    `;

    overlay.innerHTML = `

        <div style="
            background:#fff;
            padding:20px;
            border-radius:6px;
            width:min(520px,92vw);
            box-sizing:border-box;
        ">

            <h3 style="margin:0 0 14px;font-size:16px;">
                Ajustar imagen de portada
            </h3>

            <div style="
                width:100%;
                max-height:60vh;
                overflow:hidden;
                background:#222;
            ">
                <img id="recorteImagenPreview" style="max-width:100%;display:block;">
            </div>

            <p style="
                margin:10px 0 16px;
                font-size:12px;
                color:#666;
            ">
                Arrastrá y ajustá el recuadro para elegir qué parte
                de la foto se va a ver en la tarjeta.
            </p>

            <div style="display:flex;gap:10px;justify-content:flex-end;">

                <button
                    type="button"
                    id="recorteCancelar"
                    style="
                        padding:8px 16px;
                        border:1px solid #ccc;
                        background:#fff;
                        cursor:pointer;
                        border-radius:4px;
                    "
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    id="recorteConfirmar"
                    style="
                        padding:8px 16px;
                        border:0;
                        background:#163A61;
                        color:#fff;
                        cursor:pointer;
                        border-radius:4px;
                    "
                >
                    Confirmar recorte
                </button>

            </div>

        </div>

    `;

    document.body.appendChild(overlay);

    document
        .getElementById("recorteCancelar")
        .addEventListener("click", cerrarModalRecorte);

    document
        .getElementById("recorteConfirmar")
        .addEventListener("click", confirmarRecorte);

}


// =======================================================
// ABRIR RECORTE AL ELEGIR ARCHIVO
// =======================================================

document.addEventListener("change", function (evento) {

    if (evento.target.id !== "imagenFicha") {
        return;
    }

    const archivo = evento.target.files[0];

    console.log("[RECORTE] archivo elegido:", archivo);

    if (!archivo) {
        return;
    }

    if (!archivo.type.startsWith("image/")) {
        console.log("[RECORTE] no es imagen, se ignora.");
        return;
    }

    crearModalRecorte();

    const lector = new FileReader();

    lector.onload = function (e) {

        const overlay =
            document.getElementById("modalRecorteImagen");

        const imagenPreview =
            document.getElementById("recorteImagenPreview");

        // Cropper necesita que la imagen ya esté
        // insertada en el DOM y visible antes de iniciar.
        //
        // IMPORTANTE: el handler onload se asigna
        // ANTES de asignar el src. Si lo hiciéramos al
        // revés, en imágenes livianas el navegador podría
        // disparar "load" antes de que este código llegue
        // a escucharlo, y el recorte nunca se inicializaría.

        imagenPreview.onload = function () {

            console.log("[RECORTE] imagen cargada, creando Cropper...");

            if (recorteCropperInstancia) {
                recorteCropperInstancia.destroy();
            }

            recorteCropperInstancia = new Cropper(
                imagenPreview,
                {
                    aspectRatio: 1,
                    viewMode: 1,
                    dragMode: "move",
                    autoCropArea: 1,
                    background: false
                }
            );

            console.log("[RECORTE] Cropper creado:", recorteCropperInstancia);

        };

        imagenPreview.src = e.target.result;

        overlay.style.display = "flex";

    };

    lector.readAsDataURL(archivo);

});


// =======================================================
// CONFIRMAR RECORTE
// =======================================================

function confirmarRecorte() {

    console.log("[RECORTE] confirmarRecorte() ejecutado. Cropper actual:", recorteCropperInstancia);

    if (!recorteCropperInstancia) {
        console.log("[RECORTE] ABORTA: no hay instancia de Cropper.");
        return;
    }

    const canvas =
        recorteCropperInstancia.getCroppedCanvas({
            width: 800,
            height: 800,
            imageSmoothingQuality: "high"
        });

    console.log("[RECORTE] canvas generado:", canvas);

    canvas.toBlob(
        function (blob) {

            console.log("[RECORTE] blob generado:", blob);

            window.imagenFichaRecortada = blob;

            // Actualizamos la vista previa existente
            // del formulario, si está visible.

            const preview =
                document.getElementById("imagenActualFicha");

            const contenedorPreview =
                document.getElementById("contenedorImagenActual");

            if (preview) {

                preview.src =
                    URL.createObjectURL(blob);

                preview.style.display = "block";

            }

            if (contenedorPreview) {

                contenedorPreview.style.display = "block";

            }

            cerrarModalRecorte();

        },
        "image/jpeg",
        0.9
    );

}


// =======================================================
// CERRAR MODAL SIN GUARDAR
// =======================================================

function cerrarModalRecorte() {

    const overlay =
        document.getElementById("modalRecorteImagen");

    if (overlay) {
        overlay.style.display = "none";
    }

    if (recorteCropperInstancia) {
        recorteCropperInstancia.destroy();
        recorteCropperInstancia = null;
    }

}


// =======================================================
// LIMPIAR ESTADO
// =======================================================
//
// fichas.js debe llamar a esto:
//
// - Al abrir "Nueva ficha".
// - Al abrir "Editar ficha".
// - Después de guardar con éxito.
//

function limpiarImagenFichaRecortada() {

    window.imagenFichaRecortada = null;

}

window.limpiarImagenFichaRecortada =
    limpiarImagenFichaRecortada;


console.log(
    "[RECORTE] recorteImagen.js cargado correctamente."
);