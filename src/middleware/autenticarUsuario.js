const { esModoLocal } = require("../config/modoServidor");

module.exports = esModoLocal
    ? require("./autenticarLocal")
    : require("./autenticarSupabase");
