#!/usr/bin/env node
/**
 * Manifiesto preliminar SQLite ↔ PostgreSQL.
 * Solo lectura: SQLite OPEN_READONLY y PostgreSQL BEGIN READ ONLY.
 * Nunca asigna sync_id ni modifica las bases.
 *
 * Variables requeridas (siempre copias descartables):
 * RECONCILIACION_SQLITE_PATH
 * RECONCILIACION_POSTGRES_URL
 * Opcional: RECONCILIACION_SALIDA
 */
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sqlite3 = require("sqlite3");
const { Client } = require("pg");

const SQLITE_PATH = process.env.RECONCILIACION_SQLITE_PATH;
const POSTGRES_URL = process.env.RECONCILIACION_POSTGRES_URL;
const OUTPUT = process.env.RECONCILIACION_SALIDA ||
  path.resolve(process.cwd(), "manifiesto-reconciliacion.json");

/**
 * El generador solo puede consultar una copia PostgreSQL local restaurada
 * para reconciliación. Bloquea explícitamente cualquier host o base remotos,
 * incluida una URL de Supabase aunque sea de solo lectura.
 */
function validarDestinoSeguro(connectionString) {
  let destino;
  try {
    destino = new URL(String(connectionString || ""));
  } catch {
    throw new Error("URL de PostgreSQL inválida.");
  }
  const hostPermitido = ["127.0.0.1", "localhost"].includes(destino.hostname);
  const puertoPermitido = destino.port === "5432";
  const basePermitida =
    destino.pathname.replace(/^\/+/, "") === "museo_reconciliacion_prueba";
  if (
    !hostPermitido ||
    !puertoPermitido ||
    !basePermitida ||
    !["postgres:", "postgresql:"].includes(destino.protocol)
  ) {
    throw new Error(
      "Conexión bloqueada: solo se permite la copia local " +
      "museo_reconciliacion_prueba en localhost:5432."
    );
  }
}

// Los campos ID/FK y rutas físicas no se usan para comparar contenido.
// Las dependencias se validarán en una etapa posterior con mapas aprobados.
const ENTIDADES = [
  { tabla: "plantilla", pk: ["id_plantilla"], excluir: ["id_plantilla", "creado", "actualizado"] },
  { tabla: "menu", pk: ["id_menu"], excluir: ["id_menu", "id_plantilla", "imagen", "creado", "actualizado"], requiereDependencia: true },
  { tabla: "ficha", pk: ["id_ficha"], excluir: ["id_ficha", "id_menu", "id_usuario", "imagen", "creado", "actualizado"], requiereDependencia: true },
  { tabla: "etiqueta", pk: ["id_etiqueta"], excluir: ["id_etiqueta"] },
  { tabla: "ficha_etiqueta", pk: ["id_ficha", "id_etiqueta"], relacion: true, referencias: ["id_ficha", "id_etiqueta"] },
  { tabla: "relacion_ficha", pk: ["id_relacion"], relacion: true, referencias: ["id_ficha_origen", "id_ficha_destino", "tipo_relacion"] },
  { tabla: "multimedia", pk: ["id_multi"], excluir: ["id_multi", "id_ficha", "ruta_archivo", "miniatura", "creado", "actualizado"], multimedia: true, requiereDependencia: true },
  // Configuración queda fuera del manifiesto de contenido hasta definir una
  // lista permitida: sus valores podrían contener datos sensibles.
  { tabla: "configuracion", pk: ["clave"], soloConteo: true }
];

const METADATOS_SYNC = ["sync_id", "sync_version", "sync_deleted_at"];

function canonicalizar(valor) {
  if (Array.isArray(valor)) return valor.map(canonicalizar);
  if (valor && typeof valor === "object" && !(valor instanceof Date)) {
    return Object.fromEntries(Object.keys(valor).sort().map(k => [k, canonicalizar(valor[k])]));
  }
  if (valor instanceof Date) return valor.toISOString();
  return valor;
}

// SQLite suele representar JSON como TEXT y booleanos como 0/1;
// PostgreSQL puede devolver JSON como objeto y booleanos como true/false.
// Homogeneizamos esos tipos antes de calcular la huella.
function normalizarRegistro(tabla, registro) {
  const salida = { ...registro };
  const camposJson = {
    plantilla: ["plantilla_json"],
    ficha: ["datos_json"]
  }[tabla] || [];

  for (const campo of camposJson) {
    if (typeof salida[campo] === "string") {
      try { salida[campo] = JSON.parse(salida[campo]); }
      catch { /* JSON inválido se conserva literalmente para que difiera */ }
    }
  }

  const camposBooleanos = {
    menu: ["visible"],
    ficha: ["visible"],
    etiqueta: ["activo"],
    multimedia: ["activo"]
  }[tabla] || [];

  for (const campo of camposBooleanos) {
    if (salida[campo] === 0 || salida[campo] === 1) salida[campo] = Boolean(salida[campo]);
  }
  return canonicalizar(salida);
}
function uuidPropuesto(tabla, hash) {
  const bytes = crypto.createHash("sha1")
    .update("museo-malvinas-sync:" + tabla + ":" + hash)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16),
    hex.slice(16, 20), hex.slice(20)
  ].join("-");
}

function huella(tabla, registro, excluir) {
  const ignorar = new Set([...excluir, ...METADATOS_SYNC]);
  const normalizado = normalizarRegistro(tabla, registro);
  const contenido = Object.fromEntries(
    Object.entries(normalizado).filter(([campo]) => !ignorar.has(campo))
  );
  return crypto.createHash("sha256").update(JSON.stringify(canonicalizar(contenido))).digest("hex");
}
function allSQLite(db, sql) {
  return new Promise((resolve, reject) => db.all(sql, [], (e, rows) => e ? reject(e) : resolve(rows)));
}
function allPostgres(client, sql) {
  return client.query(sql).then(r => r.rows);
}
function cerrarSQLite(db) {
  return new Promise(resolve => db.close(() => resolve()));
}
function tieneClaves(fila, claves) {
  return claves.every(k => Object.prototype.hasOwnProperty.call(fila, k));
}
function prepararFilas(filas, entidad) {
  return filas.map(fila => ({
    clave_local: Object.fromEntries(entidad.pk.map(k => [k, fila[k]])),
    huella_contenido: entidad.relacion ? null : huella(entidad.tabla, fila, entidad.excluir),
    ...(entidad.referencias ? {
      referencias: Object.fromEntries(entidad.referencias.map(k => [k, fila[k]]))
    } : {})
  }));
}
function agruparPorHuella(filas) {
  const mapa = new Map();
  for (const fila of filas) {
    if (!fila.huella_contenido) continue;
    const lista = mapa.get(fila.huella_contenido) || [];
    lista.push(fila);
    mapa.set(fila.huella_contenido, lista);
  }
  return mapa;
}
async function main() {
  if (!SQLITE_PATH || !POSTGRES_URL) {
    throw new Error("Configurá RECONCILIACION_SQLITE_PATH y RECONCILIACION_POSTGRES_URL con copias descartables, nunca producción.");
  }
  validarDestinoSeguro(POSTGRES_URL);
  if (!fs.existsSync(SQLITE_PATH)) throw new Error("No existe la copia SQLite indicada.");
  const sqliteReal = fs.realpathSync(SQLITE_PATH);
  const sqliteProduccion = path.resolve(process.cwd(), "database", "museo.db");
  if (sqliteReal === sqliteProduccion) {
    throw new Error("Conexión bloqueada: no se permite analizar la SQLite activa del proyecto; usá una copia descartable.");
  }
  if (fs.existsSync(OUTPUT)) throw new Error("El archivo de salida ya existe; no se sobrescribe: " + OUTPUT);

  const sqlite = new sqlite3.Database(SQLITE_PATH, sqlite3.OPEN_READONLY);
  const pg = new Client({
    connectionString: POSTGRES_URL,
    application_name: "menuinteractivo-manifiesto-readonly",
    connectionTimeoutMillis: 10000,
    ssl: process.env.RECONCILIACION_PG_SSL === "true" ? { rejectUnauthorized: true } : undefined
  });
  let pgConectado = false;
  let transaccion = false;
  let sqliteCerrada = false;

  try {
    await pg.connect();
    pgConectado = true;
    await pg.query("BEGIN READ ONLY");
    transaccion = true;
    await pg.query("SET LOCAL statement_timeout = '30s'");
    await pg.query("SET LOCAL lock_timeout = '5s'");

    const sqliteVersion = await allSQLite(sqlite, "SELECT sqlite_version() AS version");
    const pgInfo = await allPostgres(pg, "SELECT current_database() AS database, current_schema() AS schema");

    const informe = {
      formato: 2,
      generado_en: new Date().toISOString(),
      modo: "solo_lectura",
      fuentes: {
        sqlite: { archivo: path.basename(SQLITE_PATH), version: sqliteVersion[0]?.version },
        postgres: { database: pgInfo[0]?.database, schema: pgInfo[0]?.schema }
      },
      reglas: [
        "Las huellas excluyen claves primarias y foráneas numéricas cuando están definidas como dependencias.",
        "JSON y booleanos se normalizan para reducir diferencias de representación entre SQLite y PostgreSQL.",
        "Los metadatos sync_id, sync_version y sync_deleted_at no participan en las huellas.",
        "Las huellas compartidas son candidatos, nunca aprobaciones automáticas.",
        "Menús, fichas y multimedia quedan pendientes: no se comparan hijos sin identidad de padre reconciliada.",
        "Multimedia no recibe candidatos hasta verificar checksum_sha256 y la identidad de su ficha padre en ambas copias.",
        "Las tablas de relaciones se enumeran pero no se emparejan hasta reconciliar sus extremos.",
        "Rutas de archivos e imágenes no prueban igualdad binaria; multimedia requiere checksum SHA-256 aparte.",
        "No se leen ni exportan usuarios, credenciales, sesiones o tokens.",
        "No se exportan valores completos de registros: solo claves, huellas y referencias necesarias.",
        "Configuración se cuenta sin leer ni exportar sus valores hasta definir una lista permitida."
      ],
      entidades: {}
    };

    for (const entidad of ENTIDADES) {
      const tabla = entidad.tabla;
      const localRaw = entidad.soloConteo
        ? await allSQLite(sqlite, 'SELECT COUNT(*) AS cantidad FROM "' + tabla + '"')
        : await allSQLite(sqlite, 'SELECT * FROM "' + tabla + '"');
      const remotoRaw = entidad.soloConteo
        ? await allPostgres(pg, 'SELECT COUNT(*) AS cantidad FROM public."' + tabla + '"')
        : await allPostgres(pg, 'SELECT * FROM public."' + tabla + '"');

      if (!entidad.soloConteo) {
        for (const [origen, filas] of [["SQLite", localRaw], ["PostgreSQL", remotoRaw]]) {
          for (const fila of filas) {
            if (!tieneClaves(fila, entidad.pk)) {
              throw new Error("Esquema inesperado en " + origen + "." + tabla + "; faltan: " + entidad.pk.join(", "));
            }
          }
        }
      }

      if (entidad.soloConteo) {
        informe.entidades[tabla] = {
          clave_primaria: entidad.pk,
          estado: "pendiente_lista_permitida; valores_no_leidos_ni_exportados",
          conteos: { sqlite: Number(localRaw[0]?.cantidad || 0), postgres: Number(remotoRaw[0]?.cantidad || 0) }
        };
        continue;
      }

      const local = prepararFilas(localRaw, entidad);
      const remoto = prepararFilas(remotoRaw, entidad);
      if (entidad.requiereDependencia) {
        informe.entidades[tabla] = {
          clave_primaria: entidad.pk,
          campos_excluidos_de_huella: entidad.excluir,
          estado: "pendiente_de_reconciliar_dependencias",
          motivo: tabla === "multimedia"
            ? "No se propone identidad sin reconciliar primero la ficha padre y verificar checksum_sha256 en ambas copias."
            : "No se comparan registros hijos por contenido aislado: primero debe aprobarse la identidad de su registro padre.",
          conteos: { sqlite: local.length, postgres: remoto.length },
          pendientes_sqlite: local.map(f => f.clave_local),
          pendientes_postgres: remoto.map(f => f.clave_local)
        };
        continue;
      }
      if (entidad.relacion) {
        informe.entidades[tabla] = {
          clave_primaria: entidad.pk,
          estado: "pendiente_de_reconciliar_extremos",
          conteos: { sqlite: local.length, postgres: remoto.length },
          filas_sqlite: local,
          filas_postgres: remoto
        };
        continue;
      }

      const gruposLocal = agruparPorHuella(local);
      const gruposRemoto = agruparPorHuella(remoto);
      const compartidas = [];
      const ambiguas = [];
      for (const [hash, filasLocal] of gruposLocal) {
        const filasRemotas = gruposRemoto.get(hash);
        if (!filasRemotas) continue;
        const candidato = {
          huella_contenido: hash,
          claves_sqlite: filasLocal.map(f => f.clave_local),
          claves_postgres: filasRemotas.map(f => f.clave_local),
          cantidad_sqlite: filasLocal.length,
          cantidad_postgres: filasRemotas.length
        };
        if (filasLocal.length === 1 && filasRemotas.length === 1) {
          compartidas.push({
            ...candidato,
            sync_id_propuesto: uuidPropuesto(tabla, hash),
            aprobado: false,
            estado: "candidato_revision_manual"
          });
        } else {
          ambiguas.push({ ...candidato, estado: "ambiguo_por_duplicidad" });
        }
      }

      const hashesRemotos = new Set(gruposRemoto.keys());
      const hashesLocales = new Set(gruposLocal.keys());
      informe.entidades[tabla] = {
        clave_primaria: entidad.pk,
        campos_excluidos_de_huella: entidad.excluir,
        conteos: {
          sqlite: local.length,
          postgres: remoto.length,
          candidatos_unicos: compartidas.length,
          grupos_ambiguos: ambiguas.length,
          solo_sqlite_por_contenido: local.filter(f => !hashesRemotos.has(f.huella_contenido)).length,
          solo_postgres_por_contenido: remoto.filter(f => !hashesLocales.has(f.huella_contenido)).length
        },
        candidatos_unicos: compartidas,
        ambiguos: ambiguas,
        solo_sqlite: local.filter(f => !hashesRemotos.has(f.huella_contenido)),
        solo_postgres: remoto.filter(f => !hashesLocales.has(f.huella_contenido))
      };
    }

    await pg.query("ROLLBACK");
    transaccion = false;
    await cerrarSQLite(sqlite);
    sqliteCerrada = true;

    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify(informe, null, 2), { flag: "wx" });
    console.log("Manifiesto preliminar generado: " + OUTPUT);
    for (const [tabla, datos] of Object.entries(informe.entidades)) {
      const c = datos.conteos;
      console.log("- " + tabla + ": SQLite " + c.sqlite + ", PostgreSQL " + c.postgres +
        (c.candidatos_unicos !== undefined ? ", candidatos únicos " + c.candidatos_unicos + ", ambiguos " + c.grupos_ambiguos : ", relaciones pendientes"));
    }
    console.log("Solo lectura: no se modificaron las bases ni se asignaron sync_id.");
  } finally {
    if (transaccion && pgConectado) await pg.query("ROLLBACK").catch(() => {});
    if (pgConectado) await pg.end().catch(() => {});
    if (!sqliteCerrada) await cerrarSQLite(sqlite);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error("No se pudo generar el manifiesto:", error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  canonicalizar,
  normalizarRegistro,
  huella,
  prepararFilas,
  agruparPorHuella,
  uuidPropuesto,
  validarDestinoSeguro,
  ENTIDADES
};
