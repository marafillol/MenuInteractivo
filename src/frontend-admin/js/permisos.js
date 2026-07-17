const Permisos = {


    ocultarSecciones(){


        const usuario = window.usuarioActual;


        if(!usuario){
            return;
        }


        const rol = usuario.rol;



        // ==========================
        // ADMIN
        // ==========================

        if(rol === "admin"){
            return;
        }



        // ==========================
        // EDITOR
        // ==========================

        if(rol === "editor"){


            document
            .querySelector('[data-ventana="usuarios"]')
            ?.remove();


            document
            .querySelector('[data-ventana="plantillas"]')
            ?.remove();


            document
            .querySelector('[data-ventana="configuracion"]')
            ?.remove();


            return;

        }



        // ==========================
        // CONSULTA
        // ==========================

        if(rol === "consulta"){


            // Secciones que no puede ver

            [
                "usuarios",
                "plantillas",
                "configuracion"
            ]
            .forEach(seccion=>{

                document
                .querySelector(
                    `[data-ventana="${seccion}"]`
                )
                ?.remove();

            });


            // Ocultar botones de edición
            Permisos.ocultarBotonesEdicion();

            return;

        }


    },



    ocultarBotonesEdicion(){


        const botones = [

            // Botones generales
            ".btn-nuevo",
            ".btn-editar",
            ".btn-eliminar",
            ".btn-guardar",
            ".btn-cancelar",

            // Menús
            "#nuevoMenu",
            "#guardarMenu",
            ".btn-editar",
            ".btn-eliminar",


            // Fichas
            "#nuevaFicha",
            "#guardarFicha",
            "#btnGuardarFicha",

            // Multimedia
            "#nuevoMultimedia",

            // Etiquetas
            "#nuevaEtiqueta",
            "#guardarEtiqueta",

            // Plantillas
            "#nuevaPlantilla",
            "#btnGuardarPlantilla",
            "#btnNuevoCampo",
            "#btnGuardarCampo",

            // Usuarios
            "#nuevoUsuario",
            "#guardarUsuario"

        ];


        botones.forEach(selector=>{


            document
            .querySelectorAll(selector)
            .forEach(boton=>{

                boton.style.display = "none";

            });


        });


    }





};


window.Permisos = Permisos;