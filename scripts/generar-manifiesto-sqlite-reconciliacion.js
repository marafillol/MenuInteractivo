const fs = require("node:fs");
const path = require("node:path");
const sqlite3 = require("sqlite3");
const {
  ENTIDADES,
  prepararFilas,
  agruparPorHuella,
  uuidPropuesto
} = require("./generar-manifiesto-reconciliacion");

const LOCAL = path.resolve("backups-local/museo-reconciliacion-local.db");
const REMOTO = path.resolve("backups-local/supabase-reconciliacion.db");
const SALIDA = path.resolve("backups-local/manifiesto-sqlite-reconciliacion-v2.json");

function abrir(ruta) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(ruta, sqlite3.OPEN_READONLY, err =>
      err ? reject(err) : resolve(db)
    );
  });
}
function consultar(db, sql) {
  return new Promise((resolve, reject) =>
    db.all(sql, [], (err, rows) => err ? reject(err) : resolve(rows))
  );
}
function cerrar(db) {
  return new Promise(resolve => db.close(() => resolve()));
}

async function main() {
  if (!fs.existsSync(LOCAL) || !fs.existsSync(REMOTO)) {
    throw new Error("Falta una de las SQLite descartables.");
  }
  if (fs.existsSync(SALIDA)) {
    throw new Error("El manifiesto ya existe; no se sobrescribe: " + SALIDA);
  }

  const localDb = await abrir(LOCAL);
  const remotoDb = await abrir(REMOTO);

  try {
    const informe = {
      formato: 1,
      generado_en: new Date().toISOString(),
      modo: "solo_lectura",
      fuentes: {
        sqlite_local: path.basename(LOCAL),
        sqlite_exportada_supabase: path.basename(REMOTO)
      },
      entidades: {}
    };

    for (const entidad of ENTIDADES) {
      const tabla = entidad.tabla;
      const localRaw = entidad.soloConteo
        ? await consultar(localDb, `SELECT COUNT(*) AS cantidad FROM "${tabla}"`)
        : await consultar(localDb, `SELECT * FROM "${tabla}"`);
      const remotoRaw = entidad.soloConteo
        ? await consultar(remotoDb, `SELECT COUNT(*) AS cantidad FROM "${tabla}"`)
        : await consultar(remotoDb, `SELECT * FROM "${tabla}"`);

      if (entidad.soloConteo) {
        informe.entidades[tabla] = {
          estado: "solo_conteo",
          conteos: {
            local: Number(localRaw[0]?.cantidad || 0),
            supabase_exportada: Number(remotoRaw[0]?.cantidad || 0)
          }
        };
        continue;
      }

      const local = prepararFilas(localRaw, entidad);
      const remoto = prepararFilas(remotoRaw, entidad);

      if (entidad.requiereDependencia) {
        informe.entidades[tabla] = {
          estado: "pendiente_de_reconciliar_dependencias",
          conteos: { local: local.length, supabase_exportada: remoto.length },
          pendientes_local: local.map(f => f.clave_local),
          pendientes_supabase_exportada: remoto.map(f => f.clave_local)
        };
        continue;
      }

      if (entidad.relacion) {
        informe.entidades[tabla] = {
          estado: "pendiente_de_reconciliar_extremos",
          conteos: { local: local.length, supabase_exportada: remoto.length },
          filas_local: local,
          filas_supabase_exportada: remoto
        };
        continue;
      }

      const gruposLocal = agruparPorHuella(local);
      const gruposRemoto = agruparPorHuella(remoto);
      const candidatos = [];
      const ambiguos = [];

      for (const [hash, filasLocal] of gruposLocal) {
        const filasRemotas = gruposRemoto.get(hash);
        if (!filasRemotas) continue;

        const candidato = {
          huella_contenido: hash,
          claves_local: filasLocal.map(f => f.clave_local),
          claves_supabase_exportada: filasRemotas.map(f => f.clave_local),
          cantidad_local: filasLocal.length,
          cantidad_supabase_exportada: filasRemotas.length
        };

        if (filasLocal.length === 1 && filasRemotas.length === 1) {
          candidatos.push({
            ...candidato,
            sync_id_propuesto: uuidPropuesto(tabla, hash),
            aprobado: false,
            estado: "candidato_revision_manual"
          });
        } else {
          ambiguos.push({ ...candidato, estado: "ambiguo_por_duplicidad" });
        }
      }

      const hashesRemotos = new Set(gruposRemoto.keys());
      const hashesLocales = new Set(gruposLocal.keys());

      informe.entidades[tabla] = {
        estado: "comparado_por_huella; requiere_revision_manual",
        conteos: {
          local: local.length,
          supabase_exportada: remoto.length,
          candidatos_unicos: candidatos.length,
          grupos_ambiguos: ambiguos.length,
          solo_local_por_contenido: local.filter(f => !hashesRemotos.has(f.huella_contenido)).length,
          solo_supabase_por_contenido: remoto.filter(f => !hashesLocales.has(f.huella_contenido)).length
        },
        candidatos_unicos: candidatos,
        ambiguos,
        solo_local: local.filter(f => !hashesRemotos.has(f.huella_contenido)),
        solo_supabase_exportada: remoto.filter(f => !hashesLocales.has(f.huella_contenido))
      };
    }

    fs.writeFileSync(SALIDA, JSON.stringify(informe, null, 2), { flag: "wx" });
    console.log("Manifiesto SQLite generado:", SALIDA);
    for (const [tabla, datos] of Object.entries(informe.entidades)) {
      console.log(`${tabla}:`, JSON.stringify(datos.conteos));
    }
    console.log("Solo lectura: no se modificaron las bases ni se asignaron sync_id.");
  } finally {
    await cerrar(localDb);
    await cerrar(remotoDb);
  }
}

main().catch(err => {
  console.error("No se pudo comparar:", err.message);
  process.exitCode = 1;
});
