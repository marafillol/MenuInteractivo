// =======================================================
// IMPORTACIÓN DE LIBRERÍAS
// =======================================================

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();


// =======================================================
// CONFIGURACIÓN GENERAL DEL SERVIDOR
// =======================================================

app.use(cors());

app.use(express.json());


// =======================================================
// CONFIGURACIÓN DE CARPETAS
// =======================================================

const carpetaUploads =
path.join(__dirname,"../public/uploads");

if(!fs.existsSync(carpetaUploads)){

    fs.mkdirSync(
        carpetaUploads,
        {recursive:true}
    );

}


// =======================================================
// ARCHIVOS ESTÁTICOS
// =======================================================

// =======================================================
// FRONTEND ADMINISTRATIVO
// =======================================================

// Archivos públicos del login

app.use(
    express.static(
        path.join(__dirname,"frontend-admin"),
        {
            index:false
        }
    )
);


// RECURSOS PÚBLICOS
app.use(
    express.static(
        path.join(__dirname,"../public")
    )
);


// FRONTEND VISITANTE
app.use(
    "/visita",
    express.static(
        path.join(__dirname,"frontend-visita")
    )
);


// =======================================================
// PÁGINAS PRINCIPALES
// =======================================================

// Login administrador
app.get("/",(req,res)=>{

    res.sendFile(
        path.join(
            __dirname,
            "frontend-admin",
            "index.html"
        )
    );

});

// =======================================================
// PANEL ADMINISTRATIVO PROTEGIDO
// =======================================================

app.get("/panel.html",(req,res)=>{

    res.sendFile(
        path.join(
            __dirname,
            "frontend-admin",
            "panel.html"
        )
    );

});

// Frontend visitante
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
// IMPORTACIÓN DE RUTAS ADMIN
// =======================================================

const menuRuta =
require("./rutas/admin/menus");

const plantillaRuta =
require("./rutas/admin/plantillas");

const rutasFichas =
require("./rutas/admin/fichas");

const rutasMultimedia =
require("./rutas/admin/multimedia");

const etiquetasRouter =
require("./rutas/admin/etiquetas");

const fichaEtiquetaRutas =
require("./rutas/admin/fichaEtiquetaRutas");

const relacionFichaRutas =
require("./rutas/admin/relacionFichaRutas");

const dashboardRoutes =
require("./rutas/admin/dashboard");

const usuarioRoutes =
require("./rutas/admin/usuarios");

// =======================================================
// ENDPOINTS API ADMIN
// =======================================================


app.use(
    "/api/dashboard",
    dashboardRoutes
);

app.use(
    "/imagenes",
    express.static("imagenes")
);

app.use(
    "/api/menus",
    menuRuta
);

app.use(
    "/api/plantillas",
    plantillaRuta
);

app.use(
    "/api/etiquetas",
    etiquetasRouter
);

app.use(
    "/api/fichas",
    rutasFichas
);

app.use(
    "/api/multimedia",
    rutasMultimedia
);

app.use(
    "/api",
    fichaEtiquetaRutas
);

app.use(
    "/api/relacion-ficha",
    relacionFichaRutas
);

app.use(
    "/api/usuarios",
    usuarioRoutes
);

// =======================================================
// ESTADO DEL SERVIDOR
// =======================================================

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

const PORT =
process.env.PORT || 3000;

app.listen(
    PORT,
    "0.0.0.0",
    ()=>{

        console.log(
            `Servidor iniciado en puerto ${PORT}`
        );

    }
);