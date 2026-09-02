const db = require("../database");

const obtener = (clave)=>new Promise((resolve,reject)=>{

    db.get(
        "SELECT valor FROM configuracion WHERE clave = ?",
        [clave],
        (error, fila)=>{

            if(error){
                reject(error);
                return;
            }

            resolve(fila?.valor || null);

        }
    );

});

const guardar = (clave, valor)=>new Promise((resolve,reject)=>{

    db.run(
        `
        INSERT OR REPLACE INTO configuracion(clave, valor, actualizado)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        `,
        [clave, valor],
        (error)=>{

            if(error){
                console.error("Error al guardar configuración en base de datos:", error);
                reject(error);
                return;
            }

            resolve();

        }
    );

});

module.exports = { obtener, guardar };