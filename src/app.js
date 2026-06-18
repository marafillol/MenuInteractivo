const express = require("express");
const cors = require("cors");
const path = require("path"); // Maneja las rutas de carpetas
const db = require("./database");

const app = express();

app.use(cors());
app.use(express.json());

/* =======================================================
   CONFIGURACIÓN DE PANTALLAS (FRONTEND)
   ======================================================= */

// 1. Pantalla de ADMINISTRACIÓN (Cargador de datos)
app.use(express.static(path.join(__dirname, "frontend-admin")));
app.use(express.static(path.join(__dirname, '../public')));


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend-admin", "index.html"));
});

// 2. Pantalla del VISITANTE (Tótem interactivo del público)
app.use("/visita", express.static(path.join(__dirname, "frontend-visita")));

app.get("/visita", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend-visita", "index.html"));
});


/* =======================================================
   RUTAS DE LA API (ESTRUCTURA DINÁMICA)
   ======================================================= */

app.get("/saludo", (req, res) => {
    res.json({ mensaje: "Hola Museo Malvinas" });
});

/* --- MENUS --- */
app.get("/menus", (req, res) => {
    db.all("SELECT * FROM menu", [], (err, filas) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.json(filas);
    });
});

app.post("/menus", (req, res) => {
    // Agregamos soporte para 'Imagen' e 'interfaz_json' según tu diagrama
    const { descripcion, Imagen, interfaz_json } = req.body;
    db.run(
        `
        INSERT INTO menu (descripcion, Imagen, interfaz_json)
        VALUES (?, ?, ?)
        `,
        [descripcion, Imagen || null, interfaz_json || null],
        function (err) {
            if (err) {
                return res.status(500).json(err);
            }
            res.json({
                mensaje: "Menu creado con éxito",
                id_menu: this.lastID
            });
        }
    );
});

/* --- FICHAS --- */
app.get("/fichas", (req, res) => {
    db.all("SELECT * FROM ficha", [], (err, filas) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.json(filas);
    });
});

app.post("/fichas", (req, res) => {
    // Extendemos las propiedades recibidas para mapear la abstracción del cuaderno
    const {
        id_menu,
        titulo,
        resumen,
        texto,
        Imagen,
        id_plantilla,
        datos_json,
        visible
    } = req.body;

    db.run(
        `
        INSERT INTO ficha
        (
            id_menu,
            titulo,
            resumen,
            texto,
            Imagen,
            id_plantilla,
            datos_json,
            visible
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id_menu,
            titulo,
            resumen,
            texto,
            Imagen || null,
            id_plantilla || null,
            datos_json || null,
            visible !== undefined ? visible : 1
        ],
        function (err) {
            if (err) {
                return res.status(500).json(err);
            }
            res.json({
                mensaje: "Ficha estructurada creada",
                id_ficha: this.lastID
            });
        }
    );
});

// Obtener fichas filtradas por menú (Filtra solo las visibles si se requiere)
app.get("/menus/:id/fichas", (req, res) => {
    const id_menu = req.params.id;
    db.all(
        `
        SELECT *
        FROM ficha
        WHERE id_menu = ? AND (visible = 1 OR visible IS NULL)
        `,
        [id_menu],
        (err, filas) => {
            if (err) {
                return res.status(500).json(err);
            }
            res.json(filas);
        }
    );
});

/* --- MOTOR ESTRUCTURAL DE INTERFAZ DINÁMICA --- */
// Esta ruta compacta y envía TODA la configuración para armar la UI sin hardcodeo
app.get("/api/estructura-pantalla/:id_menu", (req, res) => {
    const id_menu = req.params.id_menu;

    db.get("SELECT * FROM menu WHERE id_menu = ?", [id_menu], (err, menu) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!menu) return res.status(404).json({ mensaje: "Menú no encontrado" });

        db.all("SELECT * FROM ficha WHERE id_menu = ?", [id_menu], (err, fichas) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                configuracionMenu: {
                    id: menu.id_menu,
                    descripcion: menu.descripcion,
                    imagenFondo: menu.Imagen,
                    interfazConfig: menu.interfaz_json ? JSON.parse(menu.interfaz_json) : {}
                },
                elementosFichas: fichas.map(f => ({
                    id: f.id_ficha,
                    titulo: f.titulo,
                    resumen: f.resumen,
                    texto: f.texto,
                    imagen: f.Imagen,
                    plantillaId: f.id_plantilla,
                    datosEstructurales: f.datos_json ? JSON.parse(f.datos_json) : {},
                    visible: f.visible
                }))
            });
        });
    });
});

/* --- MULTIMEDIA (Soporte Multi-archivo relacional) --- */

// Obtener archivos multimedia usando los nombres exactos de tu tabla del cuaderno
app.get("/fichas/:id/multimedia", (req, res) => {
    const id_ficha = req.params.id;
    db.all(
        "SELECT * FROM contenido WHERE id_ficha = ?",
        [id_ficha],
        (err, filas) => {
            if (err) {
                return res.status(500).json(err);
            }
            res.json(filas);
        }
    );
});

// Registrar nuevo archivo de contenido
app.post("/multimedia", (req, res) => {
    const { id_ficha, tipo_contenido, contenido } = req.body;
    db.run(
        `
        INSERT INTO contenido (id_ficha, tipo_contenido, contenido)
        VALUES (?, ?, ?)
        `,
        [id_ficha, tipo_contenido, contenido],
        function (err) {
            if (err) {
                return res.status(500).json(err);
            }
            res.json({
                mensaje: "Archivo multimedia asociado con éxito",
                id_contenido: this.lastID
            });
        }
    );
});

/* =======================================================
   ENCENDIDO DEL SERVIDOR
   ======================================================= */
app.listen(3000, () => {
    console.log("Servidor iniciado en puerto 3000 y adaptado al modelo relacional");
});