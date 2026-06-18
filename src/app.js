const express = require("express");
const db = require("./database");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Museo Malvinas funcionando");
});

app.get("/saludo", (req, res) => {
    res.json({
        mensaje: "Hola Museo Malvinas"
    });
});

/* ===========================
   MENUS
=========================== */

app.get("/menus", (req, res) => {

    db.all("SELECT * FROM menu", [], (err, filas) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(filas);

    });

});

app.post("/menus", (req, res) => {

    const { descripcion } = req.body;

    db.run(
        `
        INSERT INTO menu (descripcion)
        VALUES (?)
        `,
        [descripcion],
        function (err) {

            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                mensaje: "Menu creado",
                id_menu: this.lastID
            });

        }
    );

});

/* ===========================
   FICHAS
=========================== */

app.get("/fichas", (req, res) => {

    

    db.all("SELECT * FROM ficha", [], (err, filas) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json(filas);

    });

});



app.post("/fichas", (req, res) => {

    const {
        id_menu,
        titulo,
        resumen,
        texto
    } = req.body;

    db.run(
        `
        INSERT INTO ficha
        (
            id_menu,
            titulo,
            resumen,
            texto
        )
        VALUES
        (?, ?, ?, ?)
        `,
        [id_menu, titulo, resumen, texto],
        function (err) {

            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                mensaje: "Ficha creada",
                id_ficha: this.lastID
            });

        }
    );

});

app.get("/menus/:id/fichas", (req, res) => {

    const id_menu = req.params.id;

    db.all(
        `
        SELECT *
        FROM ficha
        WHERE id_menu = ?
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

app.get("/menu-completo/:id", (req, res) => {

    const id_menu = req.params.id;

    db.get(
        "SELECT * FROM menu WHERE id_menu = ?",
        [id_menu],
        (err, menu) => {

            if (err) {
                return res.status(500).json(err);
            }

            db.all(
                "SELECT * FROM ficha WHERE id_menu = ?",
                [id_menu],
                (err, fichas) => {

                    if (err) {
                        return res.status(500).json(err);
                    }

                    res.json({
                        menu,
                        fichas
                    });

                }
            );

        }
    );

});

app.listen(3000, () => {
    console.log("Servidor iniciado en puerto 3000");
});