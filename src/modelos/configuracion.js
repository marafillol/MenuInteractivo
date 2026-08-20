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
        INSERT INTO configuracion(clave, valor, actualizado)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(clave) DO UPDATE SET
            valor = excluded.valor,
            actualizado = CURRENT_TIMESTAMP
        `,
        [clave, valor],
        (error)=>{

            if(error){
                reject(error);
                return;
            }

            resolve();

        }
    );

});

module.exports = { obtener, guardar };
