const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const {
    validarClaveStorage,
    listarObjetos,
    auditarBucket
} = require('../scripts/auditar-storage-supabase-readonly');

function crearStorageMock() {
    const archivos = {
        'carpeta/foto.png': Buffer.from('contenido de imagen'),
        'video.mp4': Buffer.from('contenido de video')
    };
    const llamadas = [];
    return {
        llamadas,
        from(bucket) {
            assert.equal(bucket, 'multimedia');
            return {
                async list(carpeta, opciones) {
                    llamadas.push({ operacion: 'list', carpeta, offset: opciones.offset });
                    if (!carpeta) {
                        return { data: [
                            { id: null, name: 'carpeta', metadata: null },
                            { id: 'video-id', name: 'video.mp4', metadata: { size: 18, mimetype: 'video/mp4' } }
                        ], error: null };
                    }
                    if (carpeta === 'carpeta') {
                        return { data: [
                            { id: 'foto-id', name: 'foto.png', metadata: { size: 19, mimetype: 'image/png' } }
                        ], error: null };
                    }
                    return { data: [], error: null };
                },
                async download(key) {
                    llamadas.push({ operacion: 'download', key });
                    const contenido = archivos[key];
                    if (!contenido) return { data: null, error: new Error('no existe') };
                    const tipo = key.endsWith('.png') ? 'image/png' : 'video/mp4';
                    return { data: new Blob([contenido], { type: tipo }), error: null };
                }
            };
        }
    };
}

test('rechaza claves de Storage con traversal o separadores de Windows', () => {
    assert.equal(validarClaveStorage('multimedia/imagen/foto.png'), true);
    assert.equal(validarClaveStorage('carpeta/../secreto'), false);
    assert.equal(validarClaveStorage('C:/secreto'), false);
    assert.equal(validarClaveStorage('carpeta\\secreto'), false);
    assert.equal(validarClaveStorage('/absoluta'), false);
});

test('lista carpetas recursivamente sin escribir en Storage', async () => {
    const storage = crearStorageMock();
    const objetos = await listarObjetos(storage, 'multimedia');
    assert.deepEqual(objetos.map((x) => x.key).sort(), ['carpeta/foto.png', 'video.mp4']);
    assert.ok(storage.llamadas.every((x) => x.operacion === 'list'));
});

test('descarga, calcula SHA-256, guarda los bytes y genera manifiesto/ZIP', async () => {
    const storage = crearStorageMock();
    const outputBase = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-audit-'));
    try {
        const resultado = await auditarBucket({
            storage,
            bucket: 'multimedia',
            outputBase,
            ahora: new Date('2026-11-11T12:00:00.000Z')
        });
        assert.equal(resultado.manifiesto.completo, true);
        assert.equal(resultado.manifiesto.resumen.objetos_listados, 2);
        assert.equal(resultado.manifiesto.resumen.objetos_descargados, 2);
        const foto = resultado.manifiesto.objetos.find((x) => x.key === 'carpeta/foto.png');
        assert.equal(foto.sha256, createHash('sha256').update('contenido de imagen').digest('hex'));
        assert.equal(foto.size_bytes, Buffer.byteLength('contenido de imagen'));
        assert.equal((await fs.readFile(path.join(resultado.directorio, 'objects/carpeta/foto.png'))).toString(), 'contenido de imagen');
        assert.equal((await fs.readFile(resultado.zipPath)).subarray(0, 2).toString(), 'PK');
        assert.ok(storage.llamadas.some((x) => x.operacion === 'download'));
        assert.ok(storage.llamadas.every((x) => ['list', 'download'].includes(x.operacion)));
    } finally {
        await fs.rm(outputBase, { recursive: true, force: true });
    }
});