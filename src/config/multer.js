const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { uploadsImagesDir } = require("./paths");

fs.mkdirSync(uploadsImagesDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsImagesDir);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const safeName = `image-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
        cb(null, safeName);
    }
});

function fileFilter(req, file, cb) {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
        return cb(new Error("Solo se permiten archivos de imagen"));
    }

    return cb(null, true);
}

module.exports = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});
