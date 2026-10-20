
require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function probarConexion() {
    try {
        const resultado = await pool.query("SELECT NOW()");
        console.log("✅ Conexión a PostgreSQL correcta");
        console.log(resultado.rows[0]);
    } catch (error) {
        console.error("❌ Error de conexión:");
        console.error(error.message);
    } finally {
        await pool.end();
    }
}

probarConexion();