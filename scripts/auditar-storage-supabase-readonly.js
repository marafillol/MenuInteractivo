#!/usr/bin/env node
require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const archiver = require('archiver');

const LIMITE_PAGINA = 100;

function validarClaveStorage(clave) {
    if (typeof clave !== 'string' || !clave || clave.startsWith('/') || clave.includes('\\') || clave.includes('\0')) {
        return false;
    }
    const segmentos = clave.split('/');
    return segmentos.every((segmento) => segmento && segmento !== '.' && segmento !== '..' && !segmento.includes(':'));
}

function rutaSegura(raiz, clave) {
    if (!validarClaveStorage(clave)) throw new Error('Storage devolvió una clave de objeto no válida.');
    const destino = path.resolve(raiz, ...clave.split('/'));
    const relativa = path.relative(path.resolve(raiz), destino);
    if (!relativa || relativa === '..' || relativa.startsWith('..' + path.sep) || path.isAbsolute(relativa)) {
        throw new Error('La clave de Storage sale de la carpeta de auditoría.');
    }
    return destino;
}

async function listarObjetos(storage, bucket, carpeta = '') {
    const objetos = [];
    for (let offset = 0; ; offset += LIMITE_PAGINA) {
        const { data, error } = await storage.from(bucket).list(carpeta, {
            limit: LIMITE_PAGINA,
            offset,
            sortBy: { column: 'name', order: 'asc' }
        });
        if (error) throw new Error(`No se pudo listar ${bucket}/${carpeta}: ${error.message}`);
        for (const item of data || []) {
            const clave = carpeta ? `${carpeta}/${item.name}` : item.name;
            if (!validarClaveStorage(clave)) throw new Error('Storage devolvió una ruta de objeto no válida.');
            if (item.id === null) {
                objetos.push(...await listarObjetos(storage, bucket, clave));
            } else {
                objetos.push({
                    key: clave,
                    metadata: item.metadata || {},
                    created_at: item.created_at || null,
                    updated_at: item.updated_at || null,
                    last_accessed_at: item.last_accessed_at || null,
                    etag: item.etag || null
                });
            }
        }
        if (!data || data.length < LIMITE_PAGINA) break;
    }
    return objetos;
}

async function descargarYVerificar(storage, bucket, objeto, raizObjetos) {
    const { data, error } = await storage.from(bucket).download(objeto.key);
    if (error || !data) throw new Error(`No se pudo descargar ${objeto.key}: ${error?.message || 'respuesta vacía'}`);
    const bytes = Buffer.from(await data.arrayBuffer());
    const checksum = createHash('sha256').update(bytes).digest('hex');
    const destino = rutaSegura(raizObjetos, objeto.key);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, bytes, { flag: 'wx' });

    const tamanoInformado = Number(objeto.metadata?.size);
    const tamanoCoincide = Number.isSafeInteger(tamanoInformado) && tamanoInformado >= 0
        ? tamanoInformado === bytes.length
        : null;
    return {
        key: objeto.key,
        sha256: checksum,
        size_bytes: bytes.length,
        mime_type: data.type || objeto.metadata?.mimetype || objeto.metadata?.mimeType || 'application/octet-stream',
        size_reported_bytes: Number.isSafeInteger(tamanoInformado) && tamanoInformado >= 0 ? tamanoInformado : null,
        size_matches_storage_metadata: tamanoCoincide,
        etag: objeto.etag,
        created_at: objeto.created_at,
        updated_at: objeto.updated_at,
        last_accessed_at: objeto.last_accessed_at
    };
}

function crearZip(origen, destino, bucket) {
    return new Promise((resolve, reject) => {
        const salida = require('node:fs').createWriteStream(destino, { flags: 'wx' });
        const zip = archiver('zip', { zlib: { level: 6 } });
        const limpiarError = (error) => reject(error);
        salida.once('error', limpiarError);
        zip.once('error', limpiarError);
        salida.once('close', resolve);
        zip.pipe(salida);
        zip.directory(path.join(origen, 'objects'), `almacenamiento/${bucket}`);
        zip.file(path.join(origen, 'manifest.json'), { name: 'manifest.json' });
        Promise.resolve(zip.finalize()).catch(reject);
    });
}

async function auditarBucket({ storage, bucket, outputBase = path.resolve(process.cwd(), 'backups'), ahora = new Date() }) {
    if (!bucket || !/^[a-zA-Z0-9_-]+$/.test(bucket)) throw new Error('Nombre de bucket inválido.');
    const marca = ahora.toISOString().replace(/[:.]/g, '-');
    const nombre = `supabase-storage-audit-${marca}`;
    await fs.mkdir(outputBase, { recursive: true });
    const directorio = path.join(outputBase, nombre);
    const zipPath = path.join(outputBase, `${nombre}.zip`);
    await fs.mkdir(directorio, { recursive: false });
    const raizObjetos = path.join(directorio, 'objects');
    await fs.mkdir(raizObjetos, { recursive: true });

    const listado = await listarObjetos(storage, bucket);
    const vistos = new Set();
    const registros = [];
    const errores = [];
    for (const objeto of listado.sort((a, b) => a.key.localeCompare(b.key))) {
        if (vistos.has(objeto.key)) {
            errores.push({ key: objeto.key, error: 'Clave duplicada en el listado de Storage.' });
            continue;
        }
        vistos.add(objeto.key);
        try {
            registros.push(await descargarYVerificar(storage, bucket, objeto, raizObjetos));
        } catch (error) {
            errores.push({ key: objeto.key, error: error.message });
        }
    }

    for (const registro of registros) {
        if (registro.size_matches_storage_metadata === false) {
            errores.push({ key: registro.key, error: 'El tamaño descargado no coincide con los metadatos informados por Storage.' });
        }
    }

    const manifiesto = {
        formato: 1,
        generado_en: ahora.toISOString(),
        modo: 'solo_lectura',
        bucket,
        completo: errores.length === 0 && registros.length === listado.length,
        resumen: {
            objetos_listados: listado.length,
            objetos_descargados: registros.length,
            errores: errores.length,
            bytes_totales: registros.reduce((total, item) => total + item.size_bytes, 0)
        },
        objetos: registros,
        errores
    };
    const manifestPath = path.join(directorio, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifiesto, null, 2), { encoding: 'utf8', flag: 'wx' });
    await crearZip(directorio, zipPath, bucket);
    return { directorio, zipPath, manifestPath, manifiesto };
}

async function main() {
    const url = process.env.SUPABASE_URL;
    const clave = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    const bucket = process.env.SUPABASE_BUCKET || 'multimedia';
    if (!url || !clave) {
        throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY en el .env local. No compartas esos valores.');
    }
    const cliente = createClient(url, clave, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    });
    const resultado = await auditarBucket({ storage: cliente.storage, bucket });
    console.log('[storage-audit] Resumen:', resultado.manifiesto.resumen);
    console.log('[storage-audit] Manifiesto:', resultado.manifestPath);
    console.log('[storage-audit] ZIP:', resultado.zipPath);
    if (!resultado.manifiesto.completo) process.exitCode = 1;
}

if (require.main === module) {
    main().catch((error) => {
        console.error('[storage-audit] Auditoría detenida:', error.message);
        process.exitCode = 1;
    });
}

module.exports = { validarClaveStorage, rutaSegura, listarObjetos, descargarYVerificar, auditarBucket };