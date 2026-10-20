
require("dotenv").config();

const db = require("./src/database");

const consultar = (sql) =>
    new Promise((resolve, reject) => {
        const inicio = Date.now();

        db.get(sql, [], (error, fila) => {
            const duracion = Date.now() - inicio;

            if (error) {
                reject(error);
                return;
            }

            console.log(`${sql} -> ${duracion} ms`);
            resolve(fila);
        });
    });

(async () => {
    try {
        for (let i = 0; i < 5; i++) {
            await consultar("SELECT 1 AS prueba");
        }
    } catch (error) {
        console.error("Falló la prueba de PostgreSQL:", error.code || "error");
    } finally {
        db.close(() => {});
    }
})();
