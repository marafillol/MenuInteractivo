const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const apiRoutes = require("./routes/index.routes");
const legacyRoutes = require("./routes/legacy.routes");
const errorHandler = require("./middlewares/errorHandler");
const notFoundHandler = require("./middlewares/notFoundHandler");
const {
    publicDir,
    uploadsImagesDir,
    legacyUploadsDir
} = require("./config/paths");

require("./config/database");

const app = express();

fs.mkdirSync(uploadsImagesDir, { recursive: true });
fs.mkdirSync(legacyUploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());

app.use("/uploads/images", express.static(uploadsImagesDir));
app.use("/uploads", express.static(legacyUploadsDir));
app.use(express.static(path.join(publicDir, "admin")));
app.use("/visita", express.static(path.join(publicDir, "visita")));

app.get("/", (req, res) => {
    res.sendFile(path.join(publicDir, "admin", "index.html"));
});

app.get("/visita", (req, res) => {
    res.sendFile(path.join(publicDir, "visita", "index.html"));
});

app.use("/api", apiRoutes);
app.use(legacyRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
