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
const {
  calcularArchivo,
  obtenerRutaRelativaAuditable,
  resolverRutaSegura
} = require("./auditar-multimedia-historica");

const SQLITE_PATH = process.env.RECONCILIACION_SQLITE_PATH;
const POSTGRES_URL = process.env.RECONCILIACION_POSTGRES_URL;
const ARCHIVOS_ROOT = process.env.RECONCILIACION_ARCHIVOS_ROOT;
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
  { tabla: "etiqueta", pk: ["id_etiqueta"], excluir: ["id_etiqueta"] },
  { tabla: "menu", pk: ["id_menu"], excluir: ["id_menu", "id_plantilla", "imagen", "imagen_storage_key", "imagen_checksum_sha256", "imagen_mime_type", "imagen_tamano_bytes", "creado", "actualizado"], padres: [{ tabla: "plantilla", fk: "id_plantilla" }] },
  { tabla: "ficha", pk: ["id_ficha"], excluir: ["id_ficha", "id_menu", "id_usuario", "imagen", "imagen_storage_key", "imagen_checksum_sha256", "imagen_mime_type", "imagen_tamano_bytes", "creado", "actualizado"], padres: [{ tabla: "menu", fk: "id_menu" }] },
  { tabla: "ficha_etiqueta", pk: ["id_ficha", "id_etiqueta"], relacion: true, referencias: ["id_ficha", "id_etiqueta"], padres: [{ tabla: "ficha", fk: "id_ficha" }, { tabla: "etiqueta", fk: "id_etiqueta" }] },
  { tabla: "relacion_ficha", pk: ["id_relacion"], relacion: true, referencias: ["id_ficha_origen", "id_ficha_destino", "tipo_relacion"], padres: [{ tabla: "ficha", fk: "id_ficha_origen" }, { tabla: "ficha", fk: "id_ficha_destino" }] },
  { tabla: "multimedia", pk: ["id_multi"], excluir: ["id_multi", "id_ficha", "ruta_archivo", "miniatura", "storage_key", "sync_previous_path", "creado", "actualizado"], multimedia: true, padres: [{ tabla: "ficha", fk: "id_ficha" }] },
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
  const ignorar = new Set([...excluir, ...METADATOS_SYNC, "__integridad_archivo"]);
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
    sync_id_existente: fila.sync_id || null,
    huella_contenido: entidad.relacion ? null : huella(entidad.tabla, fila, entidad.excluir),
    ...(entidad.referencias ? {
      referencias: Object.fromEntries(entidad.referencias.map(k => [k, fila[k]]))
    } : {})
  }));
}
function evaluarPortada(local, remoto) {
  const a = local?.portada || { existe: false, checksum: null, tamano_bytes: null };
  const b = remoto?.portada || { existe: false, checksum: null, tamano_bytes: null };
  if (!a.existe && !b.existe) return { estado: "sin_portada" };
  if (a.checksum && b.checksum && a.tamano_bytes && b.tamano_bytes) {
    if (a.checksum === b.checksum && a.tamano_bytes === b.tamano_bytes) {
      return { estado: "portada_verificada_por_checksum", checksum_sha256: a.checksum };
    }
    return {
      estado: "conflicto_checksum_portada",
      checksum_sqlite: a.checksum,
      checksum_postgres: b.checksum
    };
  }
  return {
    estado: a.existe !== b.existe ? "portada_presente_en_una_sola_copia" : "portada_pendiente_checksum",
    checksum_sqlite: a.checksum,
    checksum_postgres: b.checksum
  };
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
function claveFila(fila, pk) {
  return JSON.stringify(pk.map((campo) => fila[campo]));
}

function registrarMapaIdentidades(tabla, pk, filasLocal, filasRemoto, candidatos, mapas) {
  const local = new Map();
  const remoto = new Map();
  for (const fila of filasLocal) {
    if (fila.sync_id) local.set(claveFila(fila, pk), fila.sync_id);
  }
  for (const fila of filasRemoto) {
    if (fila.sync_id) remoto.set(claveFila(fila, pk), fila.sync_id);
  }
  for (const candidato of candidatos) {
    for (const clave of candidato.claves_sqlite) local.set(claveFila(clave, pk), candidato.sync_id_propuesto);
    for (const clave of candidato.claves_postgres) remoto.set(claveFila(clave, pk), candidato.sync_id_propuesto);
  }
  mapas[tabla] = { sqlite: local, postgres: remoto };
}

function prepararFilasConDependencias(filas, entidad, mapas, fuente) {
  const pendientes = [];
  const pendientesPortada = [];
  const preparadas = [];
  for (const fila of filas) {
    const idsPadres = [];
    for (const padre of entidad.padres || []) {
      const mapa = mapas[padre.tabla]?.[fuente];
      const identidad = mapa?.get(JSON.stringify([fila[padre.fk]]));
      if (!identidad) {
        pendientes.push(Object.fromEntries(entidad.pk.map((campo) => [campo, fila[campo]])));
        break;
      }
      idsPadres.push(identidad);
    }
    if (idsPadres.length !== (entidad.padres || []).length) continue;
    if (entidad.multimedia && (
      !/^[a-f0-9]{64}$/i.test(String(fila.checksum_sha256 || "")) ||
      ["checksum_no_coincide", "tamano_no_coincide"].includes(fila.__integridad_archivo)
    )) {
      pendientes.push(Object.fromEntries(entidad.pk.map((campo) => [campo, fila[campo]])));
      continue;
    }
    if (["menu", "ficha"].includes(entidad.tabla) && fila.imagen &&
        !/^[a-f0-9]{64}$/i.test(String(fila.imagen_checksum_sha256 || ""))) {
      pendientesPortada.push(Object.fromEntries(entidad.pk.map((campo) => [campo, fila[campo]])));
    }
    if (entidad.tabla === "relacion_ficha" &&
        (fila.tipo_relacion === null || fila.tipo_relacion === undefined)) {
      pendientes.push(Object.fromEntries(entidad.pk.map((campo) => [campo, fila[campo]])));
      continue;
    }
    const padresNormalizados = entidad.tabla === "relacion_ficha"
      ? [...idsPadres].sort()
      : idsPadres;
    const registro = { ...fila, __sync_parent_ids: padresNormalizados };
    const hash = entidad.relacion
      ? crypto.createHash("sha256").update(JSON.stringify(canonicalizar({
          padres: padresNormalizados,
          ...(entidad.tabla === "relacion_ficha" ? { tipo_relacion: fila.tipo_relacion } : {})
        }))).digest("hex")
      : huella(entidad.tabla, registro, entidad.excluir);
    preparadas.push({
      clave_local: Object.fromEntries(entidad.pk.map((campo) => [campo, fila[campo]])),
      sync_id_existente: fila.sync_id || null,
      huella_contenido: hash,
      ...(entidad.referencias ? {
        referencias: Object.fromEntries(entidad.referencias.map((campo) => [campo, fila[campo]]))
      } : {}),
      ...( ["menu", "ficha"].includes(entidad.tabla) ? {
        portada: {
          existe: Boolean(fila.imagen),
          checksum: /^[a-f0-9]{64}$/i.test(String(fila.imagen_checksum_sha256 || ""))
            ? String(fila.imagen_checksum_sha256).toLowerCase() : null,
          tamano_bytes: fila.imagen_tamano_bytes !== null && fila.imagen_tamano_bytes !== undefined &&
            Number.isSafeInteger(Number(fila.imagen_tamano_bytes)) && Number(fila.imagen_tamano_bytes) > 0
            ? Number(fila.imagen_tamano_bytes) : null
        }
      } : {})
    });
  }
  return { filas: preparadas, pendientes, pendientesPortada };
}


function mimeDesdeRuta(valor) {
  const extension = path.extname(String(valor || "")).toLowerCase();
  return ({
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4",
    ".pdf": "application/pdf", ".ogg": "audio/ogg", ".mp3": "audio/mpeg",
    ".wav": "audio/wav"
  })[extension] || null;
}

/**
 * Completa metadatos multimedia solo en memoria desde archivos locales.
 * Nunca escribe en SQLite ni PostgreSQL.
 */
async function enriquecerFilasMultimediaConArchivos(filas, raizArchivos) {
  if (!raizArchivos) return { filas, resumen: { modo: "sin_raiz_archivos", total: filas.length } };
  if (!fs.existsSync(raizArchivos) || !fs.statSync(raizArchivos).isDirectory()) {
    throw new Error("RECONCILIACION_ARCHIVOS_ROOT debe ser una carpeta local existente.");
  }
  const raiz = fs.realpathSync(raizArchivos);
  const resumen = {
    modo: "solo_lectura", total: filas.length, archivo_encontrado: 0,
    checksum_calculado_en_memoria: 0, checksum_verificado: 0,
    checksum_no_coincide: 0, tamano_no_coincide: 0, archivo_no_encontrado: 0
  };
  const resultado = [];
  for (const original of filas) {
    const fila = { ...original };
    let archivo = null;
    let rutaUsada = null;
    for (const candidato of [fila.ruta_archivo, fila.storage_key]) {
      const relativa = obtenerRutaRelativaAuditable(candidato);
      const ruta = resolverRutaSegura(raiz, relativa);
      if (!ruta) continue;
      const calculado = await calcularArchivo(ruta, raiz);
      if (calculado.existe) { archivo = calculado; rutaUsada = relativa; break; }
    }
    const checksumGuardado = /^[a-f0-9]{64}$/i.test(String(fila.checksum_sha256 || ""))
      ? String(fila.checksum_sha256).toLowerCase() : null;
    const tamanoGuardado = Number.isSafeInteger(Number(fila.tamano_bytes)) && Number(fila.tamano_bytes) > 0
      ? Number(fila.tamano_bytes) : null;
    if (!archivo) {
      fila.__integridad_archivo = checksumGuardado ? "checksum_existente_sin_archivo_local" : "archivo_no_encontrado";
      if (!checksumGuardado) resumen.archivo_no_encontrado += 1;
      resultado.push(fila);
      continue;
    }
    resumen.archivo_encontrado += 1;
    if (checksumGuardado && checksumGuardado !== archivo.checksum_sha256) {
      fila.__integridad_archivo = "checksum_no_coincide";
      resumen.checksum_no_coincide += 1;
      resultado.push(fila);
      continue;
    }
    if (tamanoGuardado && tamanoGuardado !== archivo.tamano_bytes) {
      fila.__integridad_archivo = "tamano_no_coincide";
      resumen.tamano_no_coincide += 1;
      resultado.push(fila);
      continue;
    }
    if (!checksumGuardado) {
      fila.checksum_sha256 = archivo.checksum_sha256;
      resumen.checksum_calculado_en_memoria += 1;
    } else resumen.checksum_verificado += 1;
    if (!tamanoGuardado) fila.tamano_bytes = archivo.tamano_bytes;
    if (!fila.mime_type) fila.mime_type = mimeDesdeRuta(rutaUsada);
    fila.__integridad_archivo = checksumGuardado
      ? "checksum_verificado_con_archivo" : "checksum_calculado_solo_lectura";
    resultado.push(fila);
  }
  return { filas: resultado, resumen };
}

async function main() {
  if (!SQLITE_PATH || !POSTGRES_URL) {
    throw new Error("Configurá RECONCILIACION_SQLITE_PATH y RECONCILIACION_POSTGRES_URL con copias descartables, nunca producción.");
  }
  validarDestinoSeguro(POSTGRES_URL);
  if (ARCHIVOS_ROOT && (!fs.existsSync(ARCHIVOS_ROOT) || !fs.statSync(ARCHIVOS_ROOT).isDirectory())) {
    throw new Error("RECONCILIACION_ARCHIVOS_ROOT debe ser una carpeta local existente.");
  }
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
        postgres: { database: pgInfo[0]?.database, schema: pgInfo[0]?.schema },
        ...(ARCHIVOS_ROOT ? { archivos_root: path.basename(fs.realpathSync(ARCHIVOS_ROOT)) } : {})
      },
      reglas: [
        "Las huellas excluyen claves primarias y foráneas numéricas cuando están definidas como dependencias.",
        "JSON y booleanos se normalizan para reducir diferencias de representación entre SQLite y PostgreSQL.",
        "Los metadatos sync_id, sync_version y sync_deleted_at no participan en las huellas.",
        "Las huellas compartidas son candidatos, nunca aprobaciones automáticas.",
        "Menús, fichas y multimedia solo generan candidatos cuando la identidad de sus padres está disponible en ambas copias.",
        "Multimedia requiere una ficha padre reconciliada y un checksum_sha256 válido. Si se indica RECONCILIACION_ARCHIVOS_ROOT, calcula o verifica SHA-256 y tamaño desde archivos locales, solo en memoria y sin modificar bases.",
        "Las portadas de menú y ficha solo se consideran verificadas si ambas copias tienen checksum SHA-256; las referencias sin checksum se reportan por separado y no prueban igualdad binaria.",
        "Las relaciones se emparejan usando las identidades compartidas de todos sus extremos; ficha_etiqueta conserva su clave primaria compuesta.",
        "Los sync_id preexistentes se conservan como candidatos; identidades distintas entre copias se reportan como conflicto y nunca se sobrescriben.",
        "Rutas de archivos e imágenes no prueban igualdad binaria; multimedia requiere checksum SHA-256 aparte.",
        "No se leen ni exportan usuarios, credenciales, sesiones o tokens.",
        "No se exportan valores completos de registros: solo claves, huellas y referencias necesarias.",
        "Configuración se cuenta sin leer ni exportar sus valores hasta definir una lista permitida."
      ],
      entidades: {}
    };

    const mapasIdentidad = {};
    for (const entidad of ENTIDADES) {
      const tabla = entidad.tabla;
      let localRaw = entidad.soloConteo
        ? await allSQLite(sqlite, 'SELECT COUNT(*) AS cantidad FROM "' + tabla + '"')
        : await allSQLite(sqlite, 'SELECT * FROM "' + tabla + '"');
      let remotoRaw = entidad.soloConteo
        ? await allPostgres(pg, 'SELECT COUNT(*) AS cantidad FROM public."' + tabla + '"')
        : await allPostgres(pg, 'SELECT * FROM public."' + tabla + '"');
      let auditoriaArchivos = null;
      if (entidad.multimedia && ARCHIVOS_ROOT) {
        const localAuditoria = await enriquecerFilasMultimediaConArchivos(localRaw, ARCHIVOS_ROOT);
        const postgresAuditoria = await enriquecerFilasMultimediaConArchivos(remotoRaw, ARCHIVOS_ROOT);
        localRaw = localAuditoria.filas;
        remotoRaw = postgresAuditoria.filas;
        auditoriaArchivos = { sqlite: localAuditoria.resumen, postgres: postgresAuditoria.resumen };
      }

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

      let local;
      let remoto;
      let pendientesLocal = [];
      let pendientesRemoto = [];
      let pendientesPortadaLocal = [];
      let pendientesPortadaRemoto = [];
      if (entidad.padres?.length) {
        const preparadoLocal = prepararFilasConDependencias(localRaw, entidad, mapasIdentidad, "sqlite");
        const preparadoRemoto = prepararFilasConDependencias(remotoRaw, entidad, mapasIdentidad, "postgres");
        local = preparadoLocal.filas;
        remoto = preparadoRemoto.filas;
        pendientesLocal = preparadoLocal.pendientes;
        pendientesRemoto = preparadoRemoto.pendientes;
        pendientesPortadaLocal = preparadoLocal.pendientesPortada;
        pendientesPortadaRemoto = preparadoRemoto.pendientesPortada;
      } else {
        local = prepararFilas(localRaw, entidad);
        remoto = prepararFilas(remotoRaw, entidad);
      }

      const gruposLocal = agruparPorHuella(local);
      const gruposRemoto = agruparPorHuella(remoto);
      const compartidas = [];
      const ambiguas = [];
      const conflictosSyncId = [];
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
          const idsExistentes = [...new Set([
            filasLocal[0].sync_id_existente,
            filasRemotas[0].sync_id_existente
          ].filter(Boolean).map(String))];
          if (idsExistentes.length > 1) {
            conflictosSyncId.push({
              ...candidato,
              sync_id_sqlite: filasLocal[0].sync_id_existente,
              sync_id_postgres: filasRemotas[0].sync_id_existente,
              estado: "conflicto_identidades_existentes"
            });
            continue;
          }
          const syncId = idsExistentes[0] || uuidPropuesto(tabla, hash);
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(syncId)) {
            conflictosSyncId.push({
              ...candidato,
              sync_id_existente: syncId,
              estado: "sync_id_existente_invalido"
            });
            continue;
          }
          compartidas.push({
            ...candidato,
            sync_id_propuesto: syncId,
            ...( ["menu", "ficha"].includes(tabla) ? {
              portada: evaluarPortada(filasLocal[0], filasRemotas[0])
            } : {}),
            aprobado: false,
            estado: idsExistentes.length
              ? "candidato_completar_identidad_existente"
              : "candidato_revision_manual"
          });
        } else {
          ambiguas.push({ ...candidato, estado: "ambiguo_por_duplicidad" });
        }
      }

      const hashesRemotos = new Set(gruposRemoto.keys());
      const hashesLocales = new Set(gruposLocal.keys());
      informe.entidades[tabla] = {
        clave_primaria: entidad.pk,
        ...(auditoriaArchivos ? { integridad_archivos: auditoriaArchivos } : {}),
        ...(entidad.excluir ? { campos_excluidos_de_huella: entidad.excluir } : {}),
        conteos: {
          sqlite: localRaw.length,
          postgres: remotoRaw.length,
          candidatos_unicos: compartidas.length,
          grupos_ambiguos: ambiguas.length,
          conflictos_sync_id: conflictosSyncId.length,
          pendientes_dependencia_sqlite: pendientesLocal.length,
          pendientes_dependencia_postgres: pendientesRemoto.length,
          pendientes_portada_sqlite: pendientesPortadaLocal.length,
          pendientes_portada_postgres: pendientesPortadaRemoto.length,
          solo_sqlite_por_contenido: local.filter(f => !hashesRemotos.has(f.huella_contenido)).length,
          solo_postgres_por_contenido: remoto.filter(f => !hashesLocales.has(f.huella_contenido)).length
        },
        estado: pendientesLocal.length || pendientesRemoto.length ||
          pendientesPortadaLocal.length || pendientesPortadaRemoto.length
          ? "parcial; requiere_reconciliar_dependencias_o_portadas"
          : "candidatos_generados",
        ...(pendientesLocal.length ? { pendientes_sqlite: pendientesLocal } : {}),
        ...(pendientesRemoto.length ? { pendientes_postgres: pendientesRemoto } : {}),
        ...(pendientesPortadaLocal.length ? { portadas_pendientes_sqlite: pendientesPortadaLocal } : {}),
        ...(pendientesPortadaRemoto.length ? { portadas_pendientes_postgres: pendientesPortadaRemoto } : {}),
        candidatos_unicos: compartidas,
        ambiguos: ambiguas,
        conflictos_sync_id: conflictosSyncId,
        solo_sqlite: local.filter(f => !hashesRemotos.has(f.huella_contenido)),
        solo_postgres: remoto.filter(f => !hashesLocales.has(f.huella_contenido))
      };

      registrarMapaIdentidades(tabla, entidad.pk, localRaw, remotoRaw, compartidas, mapasIdentidad);
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
  evaluarPortada,
  uuidPropuesto,
  validarDestinoSeguro,
  claveFila,
  registrarMapaIdentidades,
  prepararFilasConDependencias,
  enriquecerFilasMultimediaConArchivos,
  ENTIDADES
};
