const test = require("node:test");
const assert = require("node:assert/strict");
const {
    resolverReferenciaHistorica,
    extraerClaveUrl,
    validarMapaStorageHistorico
} = require("../src/servicios/sincronizacion/resolverStorageHistorico");
const mapa = require("../src/servicios/sincronizacion/mapaStorageHistorico.json");

test("el mapa histórico contiene las 57 referencias verificadas", () => {
    assert.equal(validarMapaStorageHistorico(), true);
    assert.equal(Object.keys(mapa.entries).length, 57);
});

test("resuelve una ruta local antigua solo mediante el alias exacto", () => {
    const resultado = resolverReferenciaHistorica({
        entidad: "multimedia",
        id: 4,
        referencia: "imagenes/multimedia/imagen/1788718389061-CARLOS MAZZOCHI 3 (3).png"
    });
    assert.equal(resultado.storage_key, "imagenes/multimedia/imagen/1788718389061-CARLOS_MAZZOCHI_3__3_.png");
    assert.match(resultado.checksum_sha256, /^[a-f0-9]{64}$/);
    assert.equal(resultado.evidencia, "mapa_historico_verificado");
});

test("resuelve una URL pública únicamente en el host y bucket esperados", () => {
    const referencia = mapa.entries["ficha:15"][0];
    const resultado = resolverReferenciaHistorica({
        entidad: "ficha",
        id: 15,
        referencia
    });
    assert.equal(resultado.storage_key, "migracion/fichas/15-1788324777394-RAA_L_CIFUENTES.png");
    assert.equal(
        extraerClaveUrl(referencia),
        "migracion/fichas/15-1788324777394-RAA_L_CIFUENTES.png"
    );
});

test("permite referencias exactas ya expresadas como clave de Storage", () => {
    const resultado = resolverReferenciaHistorica({
        entidad: "multimedia",
        id: 39,
        referencia: "multimedia/pdf/1792599392155-Manual_de_Usuario_-_Museo_Malvinas.pdf"
    });
    assert.equal(resultado.mime_type, "application/pdf");
});

test("rechaza URLs de otros proyectos y buckets", () => {
    assert.throws(() => extraerClaveUrl(
        "https://otro.supabase.co/storage/v1/object/public/multimedia/archivo.png"
    ), /no pertenece/);
    assert.throws(() => extraerClaveUrl(
        "https://aegtxapeleyvwmzdfzvx.supabase.co/storage/v1/object/public/otro/archivo.png"
    ), /bucket/);
});

test("rechaza referencias desconocidas, colisiones y metadatos contradictorios", () => {
    assert.throws(() => resolverReferenciaHistorica({
        entidad: "multimedia", id: 4, referencia: "imagenes/multimedia/otro.png"
    }), /no coincide/);
    assert.throws(() => resolverReferenciaHistorica({
        entidad: "multimedia", id: 4,
        referencia: mapa.entries["multimedia:4"][0],
        storageKey: "multimedia/imagen/archivo.png"
    }), /contradice/);
    assert.throws(() => resolverReferenciaHistorica({
        entidad: "multimedia", id: 4,
        referencia: mapa.entries["multimedia:4"][0],
        checksumSha256: "0".repeat(64)
    }), /checksum existente contradice/);
});

test("no aplica normalización genérica de espacios, guiones o nombres", () => {
    assert.equal(resolverReferenciaHistorica({
        entidad: "multimedia",
        id: 4,
        referencia: "imagenes/multimedia/imagen/1788718389061-CARLOS_MAZZOCHI_3__3_.png"
    }).storage_key, mapa.entries["multimedia:4"][1]);
    assert.throws(() => resolverReferenciaHistorica({
        entidad: "multimedia",
        id: 4,
        referencia: "imagenes/multimedia/imagen/1788718389061-carlos-mazzochi-3-3.png"
    }), /no coincide/);
});

test("rechaza claves históricas con traversal o separadores inseguros", () => {
    const corrupto = {
        ...mapa,
        entries: {
            ...mapa.entries,
            "multimedia:999": ["legacy.png", "../privado.png", "a".repeat(64), 10, "image/png"]
        }
    };
    assert.throws(() => validarMapaStorageHistorico(corrupto), /metadatos multimedia inválidos/);
});
