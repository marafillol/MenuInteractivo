// =======================================================
// IMPORTACIÓN DE LIBRERÍAS
// =======================================================

// Express permite crear el servidor web y manejar rutas HTTP.
const express = require("express");

// CORS permite aceptar solicitudes desde otros orígenes.
// Es necesario cuando frontend y backend están separados.
const cors = require("cors");

// Path permite trabajar con rutas de archivos de manera segura.
const path = require("path");

// File System permite manejar archivos y carpetas del sistema.
const fs = require("fs");


// Creación de la aplicación Express.
const app = express();




// =======================================================
// CONFIGURACIÓN GENERAL DEL SERVIDOR
// =======================================================

// Habilita solicitudes desde otros dominios/orígenes.
app.use(cors());


// Permite recibir información enviada en formato JSON
// desde las solicitudes POST, PUT, PATCH, etc.
app.use(express.json());





// =======================================================
// CONFIGURACIÓN DE CARPETAS
// =======================================================


// Define la carpeta donde se almacenarán los archivos subidos
// por los usuarios (imágenes, multimedia, etc.).
const carpetaUploads =
path.join(__dirname,"../public/uploads");


// Comprueba si la carpeta uploads existe.
// Si no existe, la crea automáticamente.
if(!fs.existsSync(carpetaUploads)){

    fs.mkdirSync(
        carpetaUploads,
        {recursive:true}
    );

}





// =======================================================
// ARCHIVOS ESTÁTICOS
// =======================================================


// -------------------------------
// PANEL ADMINISTRATIVO
// -------------------------------

// Sirve todos los archivos del frontend administrativo.
// Incluye HTML, CSS, JavaScript e imágenes del panel.
app.use(
express.static(
path.join(__dirname,"frontend-admin")
)
);



// -------------------------------
// RECURSOS PÚBLICOS
// -------------------------------

// Sirve archivos públicos utilizados por el sistema.
// Ejemplo:
// imágenes subidas, archivos multimedia, etc.
app.use(
express.static(
path.join(__dirname,"../public")
)
);



// -------------------------------
// INTERFAZ DEL VISITANTE
// -------------------------------

// Sirve la aplicación pública del museo.
// Se accede mediante:
// localhost:3000/visita
app.use(
"/visita",
express.static(
path.join(__dirname,"frontend-visita")
)
);





// =======================================================
// PÁGINAS PRINCIPALES
// =======================================================


// Página inicial del panel administrativo.
// Cuando alguien entra a:
// localhost:3000
// carga el login del administrador.

app.get("/",(req,res)=>{

    res.sendFile(
        path.join(
            __dirname,
            "frontend-admin",
            "index.html"
        )
    );

});




// Página principal del visitante.
// Cuando alguien entra a:
// localhost:3000/visita
// carga la interfaz pública.

app.get("/visita",(req,res)=>{

    res.sendFile(
        path.join(
            __dirname,
            "frontend-visita",
            "index.html"
        )
    );

});





// =======================================================
// CARGA DE RUTAS API
// =======================================================


// Importación de controladores de rutas.
// Cada archivo administra un módulo del sistema.

const menuRuta = require("./rutas/menus");

const plantillaRuta = require("./rutas/plantillas");

const rutasFichas =
require("./rutas/fichas");

const rutasMultimedia =
require("./rutas/multimedia");

const etiquetasRouter =
require("./rutas/etiquetas");

const fichaEtiquetaRutas =
require("./rutas/fichaEtiquetaRutas");

const relacionFichaRutas =
require("./rutas/relacionFichaRutas");

const dashboardRoutes =
require("./rutas/dashboard");




// =======================================================
// REGISTRO DE ENDPOINTS API
// =======================================================


// Dashboard administrativo.
app.use(
    "/api/dashboard",
    dashboardRoutes
);


// Sirve la carpeta de imágenes.
// Permite acceder a archivos mediante:
// /imagenes/nombre_archivo

app.use(
    "/imagenes",
    express.static("imagenes")
);



// Gestión de menús.
app.use(
"/api/menus",
menuRuta
);


// Gestión de plantillas.
app.use(
"/api/plantillas",
plantillaRuta
);


// Gestión de etiquetas.
app.use(
"/api/etiquetas",
etiquetasRouter
);


// Gestión de fichas.
app.use(
"/api/fichas",
rutasFichas
);


// Gestión de archivos multimedia.
app.use(
"/api/multimedia",
rutasMultimedia
);


// Relación entre fichas y etiquetas.
app.use(
"/api",
fichaEtiquetaRutas
);


// Relación entre fichas.
app.use(
"/api/relacion-ficha",
relacionFichaRutas
);





// =======================================================
// ESTADO DEL SERVIDOR
// =======================================================


// Endpoint utilizado para comprobar si el backend
// está funcionando correctamente.

app.get("/api/estado-admin",(req,res)=>{


    res.json({

        servidor:true,

        mensaje:
        "Panel administrativo funcionando"

    });


});





// =======================================================
// INICIO DEL SERVIDOR
// =======================================================


// Define el puerto donde escuchará el servidor.
// Si existe una variable de entorno PORT la utiliza,
// si no utiliza el puerto 3000.

const PORT =
process.env.PORT || 3000;



// Inicia el servidor Express.
app.listen(
PORT,
"0.0.0.0",
()=>{

console.log(
`Servidor iniciado en puerto ${PORT}`
);

});