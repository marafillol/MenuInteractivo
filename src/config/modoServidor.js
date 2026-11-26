require("dotenv").config();

const valorConfigurado = String(process.env.MODO_SERVIDOR || "").trim().toLowerCase();

const modoServidor = valorConfigurado || (
    process.env.DATABASE_URL || process.env.SUPABASE_URL
        ? "supabase"
        : "local"
);

if (!["local", "supabase"].includes(modoServidor)) {
    throw new Error("MODO_SERVIDOR debe ser 'local' o 'supabase'.");
}

if (modoServidor === "local" && String(process.env.LOCAL_AUTH_SECRET || "").length < 32) {
    throw new Error(
        "Falta LOCAL_AUTH_SECRET o tiene menos de 32 caracteres. Configuralo para usar el modo local."
    );
}

module.exports = {
    modoServidor,
    esModoLocal: modoServidor === "local",
    esModoSupabase: modoServidor === "supabase"
};
