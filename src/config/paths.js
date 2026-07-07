const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const publicDir = path.join(projectRoot, "public");
const databaseDir = path.join(projectRoot, "database");
const storageDir = path.join(projectRoot, "storage");
const uploadsDir = path.join(storageDir, "uploads");
const uploadsImagesDir = path.join(uploadsDir, "images");
const uploadsTempDir = path.join(uploadsDir, "temp");
const legacyUploadsDir = path.join(publicDir, "uploads");

module.exports = {
    projectRoot,
    publicDir,
    databaseDir,
    storageDir,
    uploadsDir,
    uploadsImagesDir,
    uploadsTempDir,
    legacyUploadsDir
};
