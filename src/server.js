const app = require("./app");
const { port } = require("./config/env");
const { publicDir, uploadsImagesDir } = require("./config/paths");

process.on("uncaughtException", (error) => {
    console.error("Error critico no controlado:", error);
});

process.on("unhandledRejection", (reason) => {
    console.error("Promesa rechazada sin manejar:", reason);
});

app.listen(port, () => {
    console.log(`Servidor iniciado en puerto ${port}`);
    console.log(`Admin disponible en / -> ${publicDir}\\admin`);
    console.log(`Visita disponible en /visita -> ${publicDir}\\visita`);
    console.log(`Uploads de imagenes disponibles en /uploads/images -> ${uploadsImagesDir}`);
});
