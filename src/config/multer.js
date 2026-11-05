const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { estaConfigurado } = require("./almacenamientoSupabase");

const obtenerDirectorioDestino = (req) => {
    if (req.baseUrl.includes("menus")) {
        return path.join("imagenes", "menus");
    }

    if (req.baseUrl.includes("fichas")) {
        return path.join("imagenes", "fichas");
    }

    if (req.baseUrl.includes("multimedia")) {
        switch (req.body.tipo_multi) {
            case "imagen":
                return path.join("imagenes", "multimedia", "imagen");
            case "video":
                return path.join("imagenes", "multimedia", "videos");
            case "audio":
                return path.join("imagenes", "multimedia", "audios");
            default:
                return path.join("imagenes", "multimedia", "documentos");
        }
    }

    return null;
};

const storage = estaConfigurado
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => {
            const destino = obtenerDirectorioDestino(req);

            if (!destino) {
                cb(new Error("No se pudo determinar la carpeta de destino del archivo."));
                return;
            }

            // Algunos subdirectorios (audio/documentos) pueden no existir
            // en una instalación nueva del museo. Crearlos evita errores ENOENT.
            fs.mkdir(path.resolve(process.cwd(), destino), { recursive: true }, (error) => {
                cb(error, destino);
            });
        },

        filename: (req, file, cb) => {
            // El nombre recibido del navegador nunca debe poder aportar
            // segmentos de ruta ni caracteres de control al nombre local.
            const nombreOriginal = path.basename(
                String(file.originalname || "archivo").replace(/\\/g, "/")
            );
            const nombreSeguro = nombreOriginal
                .normalize("NFD")
                .replace(/[\\u0300-\\u036f]/g, "")
                .replace(/[^a-zA-Z0-9._-]/g, "_")
                .replace(/^\\.+/, "");

            cb(null, `${Date.now()}-${nombreSeguro || "archivo"}`);
        }
    });

module.exports = multer({ storage });
