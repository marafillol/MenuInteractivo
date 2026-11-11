const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
    validarDestinoSeguro,
    resolverRutaSegura,
    calcularArchivo,
    auditarRegistro
} = require("../scripts/auditar-multimedia-historica");

test("solo permite museo_reconciliacion_prueba en localhost:5432", () => {
    assert.doesNotThrow(() =>
        validarDestinoSeguro("postgresql://postgres:pass@127.0.0.1:5432/museo_reconciliacion_prueba")
    );
    assert.throws(() =>
        validarDestinoSeguro("postgresql://postgres:pass@127.0.0.1:5433/museo_reconciliacion_prueba")
    );
    assert.throws(() =>
        validarDestinoSeguro("postgresql://postgres:pass@db.example.com:5432/museo_reconciliacion_prueba")
    );
    assert.throws(() =>
        validarDestinoSeguro("postgresql://postgres:pass@127.0.0.1:5432/postgres")
    );
});

test("rechaza rutas absolutas y traversal fuera de la raíz", () => {
    const raiz = path.resolve("copia-multimedia");
    assert.equal(resolverRutaSegura(raiz, "../secreto.jpg"), null);
    assert.equal(resolverRutaSegura(raiz, "C:\\secreto.jpg"), null);
    assert.equal(resolverRutaSegura(raiz, "subcarpeta/foto.jpg"),
        path.join(raiz, "subcarpeta", "foto.jpg"));
});

test("calcula SHA-256 y tamaño desde los bytes reales", async () => {
    const raiz = await fs.promises.mkdtemp(path.join(os.tmpdir(), "auditoria-multimedia-"));
    try {
        const archivo = path.join(raiz, "foto.bin");
        await fs.promises.writeFile(archivo, Buffer.from("contenido de prueba"));
        const resultado = await calcularArchivo(archivo, raiz);
        assert.equal(resultado.existe, true);
        assert.equal(resultado.checksum_sha256,
            "f3e9d8f4c1d6f7f2a3d9b2d6e0a4f2c7");
    } finally {
        await fs.promises.rm(raiz, { recursive: true, force: true });
    }
});

test("marca checksum histórico ausente como pendiente, sin inventarlo", async () => {
    const raiz = await fs.promises.mkdtemp(path.join(os.tmpdir(), "auditoria-multimedia-"));
    try {
        await fs.promises.writeFile(path.join(raiz, "archivo.bin"), Buffer.from("bytes"));
        const resultado = await auditarRegistro({
            id_multi: 4,
            id_ficha: 2,
            ruta_archivo: "archivo.bin",
            storage_key: null,
            checksum_sha256: null,
            tamano_bytes: null
        }, raiz);
        assert.equal(resultado.archivo_encontrado, true);
        assert.equal(resultado.checksum_guardado, null);
        assert.equal(resultado.checksum_coincide, null);
        assert.equal(resultado.estado, "checksum_pendiente");
    } finally {
        await fs.promises.rm(raiz, { recursive: true, force: true });
    }
});

test("no sigue enlaces simbólicos que salen de la raíz auditada", async (t) => {
    if (process.platform === "win32") {
        t.skip("La creación de enlaces simbólicos puede requerir permisos elevados en Windows.");
        return;
    }
    const raiz = await fs.promises.mkdtemp(path.join(os.tmpdir(), "auditoria-multimedia-"));
    const externa = await fs.promises.mkdtemp(path.join(os.tmpdir(), "auditoria-externa-"));
    try {
        await fs.promises.writeFile(path.join(externa, "privado.bin"), Buffer.from("privado"));
        await fs.promises.symlink(path.join(externa, "privado.bin"), path.join(raiz, "enlace.bin"));
        const resultado = await calcularArchivo(path.join(raiz, "enlace.bin"), raiz);
        assert.equal(resultado.existe, false);
    } finally {
        await fs.promises.rm(raiz, { recursive: true, force: true });
        await fs.promises.rm(externa, { recursive: true, force: true });
    }
});
