require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { esModoLocal } = require("../src/config/modoServidor");

async function main() {
    if (!esModoLocal) {
        throw new Error("La inicialización solo se permite en una instalación SQLite local.");
    }
    const configurada = String(process.env.DATABASE_SQLITE_PATH || "").trim();
    if (!configurada) {
        throw new Error("Definí DATABASE_SQLITE_PATH con la ruta de una SQLite nueva o descartable.");
    }

    const destino = path.resolve(configurada);
    const baseActiva = path.resolve(__dirname, "../database/museo.db");
    if (destino === baseActiva ||
        (fs.existsSync(destino) && fs.existsSync(baseActiva) &&
            fs.realpathSync(destino) === fs.realpathSync(baseActiva))) {
        throw new Error("Inicialización bloqueada: no se permite usar database/museo.db del proyecto.");
    }

    const db = require("../src/database");
    try {
        await db.preparar();
        const cliente = require("../src/servicios/sincronizacion/cliente");
        const resultado = await cliente.inicializarDesdeServidor();
        if (resultado.estado !== "inicializado" && resultado.estado !== "ya_inicializado") {
            throw new Error("La inicialización no se completó: " + resultado.estado);
        }
        console.log("[bootstrap] Resultado:", JSON.stringify(resultado));
    } finally {
        await new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
    }
}

main().catch((error) => {
    console.error("[bootstrap] Inicialización cancelada:", error.message);
    process.exitCode = 1;
});
