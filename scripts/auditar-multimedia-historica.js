#!/usr/bin/env node
/**
 * Auditoría histórica de multimedia para la reconciliación inicial.
 *
 * Solo lectura: consulta exclusivamente museo_reconciliacion_prueba en
 * localhost:5432 dentro de una transacción READ ONLY y lee archivos locales.
 * No actualiza filas, no sube objetos y no contacta Supabase/Render.
 *
 * Variables:
 *   RECONCILIACION_POSTGRES_URL
 *   RECONCILIACION_ARCHIVOS_ROOT (raíz desde la que se resuelven rutas guardadas)
 *   RECONCILIACION_MULTIMEDIA_AUDITORIA (salida JSON opcional)
 */
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { Client } = require("pg");

const POSTGRES_URL = process.env.RECONCILIACION_POSTGRES_URL;
const ARCHIVOS_ROOT = process.env.RECONCILIACION_ARCHIVOS_ROOT;
const OUTPUT = process.env.RECONCILIACION_MULTIMEDIA_AUDITORIA ||
    path.resolve(process.cwd(), "auditoria-multimedia-historica.json");

function validarDestinoSeguro(connectionString) {
    let destino;
    try {
        destino = new URL(String(connectionString || ""));
    } catch {
        throw new Error("URL de PostgreSQL inválida.");
    }
    const hostPermitido = ["127.0.0.1", "localhost"].includes(destino.hostname);
    const puertoPermitido = destino.port === "5432";
    const basePermitida = destino.pathname.replace(/^[/]+/, "") === "museo_reconciliacion_prueba";
    if (!hostPermitido || !puertoPermitido || !basePermitida ||
        !["postgres:", "postgresql:"].includes(destino.protocol)) {
        throw new Error(
            "Conexión bloqueada: solo se permite museo_reconciliacion_prueba en localhost:5432."
        );
    }
}

function obtenerRutaRelativaAuditable(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return null;
    if (!/^https:\/\//i.test(texto)) return texto;

    try {
        const url = new URL(texto);
        const marcador = "/storage/v1/object/public/multimedia/";
        const posicion = url.pathname.indexOf(marcador);
        if (url.protocol !== "https:" || posicion < 0) return null;
        const objeto = decodeURIComponent(url.pathname.slice(posicion + marcador.length));
        const segmentos = objeto.split("/");
        if (!objeto || objeto.startsWith("/") || objeto.includes("\\0") ||
            segmentos.some(segmento => !segmento || segmento === "." || segmento === "..")) return null;
        return objeto;
    } catch {
        return null;
    }
}

function resolverRutaSegura(raiz, rutaRelativa) {
    const valor = String(rutaRelativa || "").trim();
    if (!valor || path.isAbsolute(valor) || /^[a-z]:[\\/]/i.test(valor) ||
        valor.startsWith("\\\\") || valor.includes("\0")) return null;

    const normalizada = valor.replace(/[\\/]+/g, path.sep);
    const raizAbsoluta = path.resolve(raiz);
    const destino = path.resolve(raizAbsoluta, normalizada);
    const relativa = path.relative(raizAbsoluta, destino);
    if (!relativa || relativa === ".." || relativa.startsWith(".." + path.sep) ||
        path.isAbsolute(relativa)) return null;
    return destino;
}

async function calcularArchivo(ruta, raiz) {
    try {
        const raizReal = await fs.promises.realpath(raiz);
        const rutaReal = await fs.promises.realpath(ruta);
        const relativa = path.relative(raizReal, rutaReal);
        if (!relativa || relativa === ".." || relativa.startsWith(".." + path.sep) ||
            path.isAbsolute(relativa)) {
            return { existe: false, error: "La ruta resuelta queda fuera de la carpeta permitida." };
        }
        const stat = await fs.promises.stat(rutaReal);
        if (!stat.isFile()) return { existe: false, error: "La ruta no corresponde a un archivo." };
        const contenido = await fs.promises.readFile(rutaReal);
        return {
            existe: true,
            checksum_sha256: createHash("sha256").update(contenido).digest("hex"),
            tamano_bytes: contenido.length
        };
    } catch (error) {
        if (error.code === "ENOENT" || error.code === "ENOTDIR") {
            return { existe: false, error: "Archivo no encontrado." };
        }
        throw error;
    }
}

async function auditarRegistro(registro, raiz) {
    const candidatos = [
        { origen: "ruta_archivo", valor: registro.ruta_archivo },
        { origen: "storage_key", valor: registro.storage_key }
    ];
    let archivo = null;
    let origen = null;
    let rutaUsada = null;

    for (const candidato of candidatos) {
        const rutaRelativa = obtenerRutaRelativaAuditable(candidato.valor);
        const ruta = resolverRutaSegura(raiz, rutaRelativa);
        if (!ruta) continue;
        const resultado = await calcularArchivo(ruta, raiz);
        if (resultado.existe) {
            archivo = resultado;
            origen = candidato.origen;
            rutaUsada = rutaRelativa;
            break;
        }
    }

    const checksumGuardado = /^[a-f0-9]{64}$/i.test(String(registro.checksum_sha256 || ""))
        ? String(registro.checksum_sha256).toLowerCase()
        : null;
    const tamanoGuardado = Number.isSafeInteger(Number(registro.tamano_bytes)) &&
        Number(registro.tamano_bytes) > 0 ? Number(registro.tamano_bytes) : null;

    return {
        id_multi: registro.id_multi,
        id_ficha: registro.id_ficha,
        sync_id: registro.sync_id || null,
        ruta_archivo: registro.ruta_archivo || null,
        storage_key: registro.storage_key || null,
        archivo_encontrado: Boolean(archivo),
        ruta_resuelta_desde: origen,
        ruta_relativa_utilizada: rutaUsada,
        checksum_guardado: checksumGuardado,
        checksum_calculado: archivo?.checksum_sha256 || null,
        checksum_coincide: archivo && checksumGuardado
            ? archivo.checksum_sha256 === checksumGuardado
            : null,
        tamano_guardado_bytes: tamanoGuardado,
        tamano_calculado_bytes: archivo?.tamano_bytes ?? null,
        tamano_coincide: archivo && tamanoGuardado
            ? archivo.tamano_bytes === tamanoGuardado
            : null,
        estado: !archivo ? "archivo_no_encontrado"
            : !checksumGuardado ? "checksum_pendiente"
            : archivo.checksum_sha256 !== checksumGuardado ? "checksum_no_coincide"
            : tamanoGuardado && archivo.tamano_bytes !== tamanoGuardado ? "tamano_no_coincide"
            : "verificado"
    };
}

async function main() {
    if (!POSTGRES_URL || !ARCHIVOS_ROOT) {
        throw new Error(
            "Configurá RECONCILIACION_POSTGRES_URL y RECONCILIACION_ARCHIVOS_ROOT con copias locales."
        );
    }
    validarDestinoSeguro(POSTGRES_URL);
    if (!fs.existsSync(ARCHIVOS_ROOT) || !fs.statSync(ARCHIVOS_ROOT).isDirectory()) {
        throw new Error("RECONCILIACION_ARCHIVOS_ROOT debe ser una carpeta local existente.");
    }
    if (fs.existsSync(OUTPUT)) {
        throw new Error("El archivo de salida ya existe; no se sobrescribe: " + OUTPUT);
    }

    const raiz = fs.realpathSync(ARCHIVOS_ROOT);
    const client = new Client({
        connectionString: POSTGRES_URL,
        application_name: "menuinteractivo-auditoria-multimedia-readonly",
        connectionTimeoutMillis: 10000,
        ssl: process.env.RECONCILIACION_PG_SSL === "true"
            ? { rejectUnauthorized: true } : undefined
    });

    let conectado = false;
    let transaccion = false;
    try {
        await client.connect();
        conectado = true;
        await client.query("BEGIN READ ONLY");
        transaccion = true;
        await client.query("SET LOCAL statement_timeout = '30s'");
        await client.query("SET LOCAL lock_timeout = '5s'");

        const identidad = await client.query(
            "SELECT current_database() AS database, current_setting('port') AS port"
        );
        if (identidad.rows[0]?.database !== "museo_reconciliacion_prueba" ||
            identidad.rows[0]?.port !== "5432") {
            throw new Error("La conexión efectiva no corresponde a museo_reconciliacion_prueba en 5432.");
        }

        const consulta = await client.query(`
            SELECT id_multi, id_ficha, sync_id, ruta_archivo, storage_key,
                   checksum_sha256, tamano_bytes
            FROM public.multimedia
            ORDER BY id_multi
        `);
        const registros = [];
        for (const fila of consulta.rows) {
            registros.push(await auditarRegistro(fila, raiz));
        }

        const conteos = registros.reduce((acumulado, fila) => {
            acumulado[fila.estado] = (acumulado[fila.estado] || 0) + 1;
            return acumulado;
        }, {});
        const informe = {
            formato: 1,
            generado_en: new Date().toISOString(),
            modo: "solo_lectura",
            fuente: {
                database: identidad.rows[0].database,
                port: Number(identidad.rows[0].port),
                archivos_root: path.basename(raiz)
            },
            resumen: {
                total: registros.length,
                verificados: conteos.verificado || 0,
                checksum_pendiente: conteos.checksum_pendiente || 0,
                checksum_no_coincide: conteos.checksum_no_coincide || 0,
                tamano_no_coincide: conteos.tamano_no_coincide || 0,
                archivo_no_encontrado: conteos.archivo_no_encontrado || 0
            },
            registros
        };

        await client.query("COMMIT");
        transaccion = false;
        await fs.promises.writeFile(OUTPUT, JSON.stringify(informe, null, 2), {
            encoding: "utf8",
            flag: "wx"
        });
        console.log("Auditoría terminada (sin modificar la base):", informe.resumen);
        console.log("Informe:", OUTPUT);
    } catch (error) {
        if (transaccion) await client.query("ROLLBACK").catch(() => {});
        throw error;
    } finally {
        if (conectado) await client.end();
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error("[auditoria-multimedia]", error.message);
        process.exitCode = 1;
    });
}

module.exports = {
    validarDestinoSeguro,
    resolverRutaSegura,
    obtenerRutaRelativaAuditable,
    calcularArchivo,
    auditarRegistro
};
