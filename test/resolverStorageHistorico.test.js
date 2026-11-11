const test = require("node:test");
const assert = require("node:assert/strict");
const {
    resolverReferenciaHistorica,
    extraerClaveUrl,
    validarMapaStorageHistorico,
    aplicarMapaSnapshot,
    esClaveHistoricaPermitida,
    esStorageKeyHistorica
} = require("../src/servicios/sincronizacion/resolverStorageHistorico");
const mapa = require("../src/servicios/sincronizacion/mapaStorageHistorico.json");
const { validarSnapshot } = require("../src/servicios/sincronizacion/bootstrap");

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

test("completa metadatos históricos del snapshot sin cambiar referencias originales", () => {
    const snapshot = {
        version: 1,
        cursor: 0,
        data: {
            multimedia: [{
                id_multi: 4,
                ruta_archivo: mapa.entries["multimedia:4"][0],
                storage_key: null,
                checksum_sha256: null,
                sync_deleted_at: null
            }],
            ficha: [{
                id_ficha: 15,
                imagen: mapa.entries["ficha:15"][0],
                imagen_storage_key: null,
                imagen_checksum_sha256: null,
                sync_deleted_at: null
            }],
            menu: [{
                id_menu: 1,
                imagen: mapa.entries["menu:1"][0],
                imagen_storage_key: null,
                imagen_checksum_sha256: null,
                sync_deleted_at: null
            }]
        }
    };
    const resultado = aplicarMapaSnapshot(snapshot);
    assert.equal(resultado.data.multimedia[0].storage_key, mapa.entries["multimedia:4"][1]);
    assert.equal(resultado.data.multimedia[0].checksum_sha256, mapa.entries["multimedia:4"][2]);
    assert.equal(resultado.data.ficha[0].imagen_storage_key, mapa.entries["ficha:15"][1]);
    assert.equal(resultado.data.menu[0].imagen_storage_key, mapa.entries["menu:1"][1]);
    assert.equal(snapshot.data.multimedia[0].storage_key, null);
});

test("solo habilita descargas legacy para claves presentes en el mapa", () => {
    const key = mapa.entries["multimedia:4"][1];
    assert.equal(esStorageKeyHistorica(key), true);
    assert.equal(esClaveHistoricaPermitida("multimedia", 4, key), true);
    assert.equal(esClaveHistoricaPermitida("multimedia", 5, key), false);
    assert.equal(esStorageKeyHistorica("../privado.png"), false);
});

test("el bootstrap valida claves Storage legacy solo cuando coinciden con el mapa", () => {
    const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    const snapshot = {
        version: 1,
        cursor: 0,
        data: {
            plantilla: [{ id_plantilla: 1, sync_id: uuid(1), sync_version: 1 }],
            menu: [{
                id_menu: 1, id_plantilla: 1, imagen: mapa.entries["menu:1"][0],
                imagen_storage_key: null, imagen_checksum_sha256: null,
                sync_id: uuid(2), sync_version: 1, sync_deleted_at: null
            }],
            ficha: [{
                id_ficha: 15, id_menu: 1, imagen: mapa.entries["ficha:15"][0],
                imagen_storage_key: null, imagen_checksum_sha256: null,
                sync_id: uuid(3), sync_version: 1, sync_deleted_at: null
            }],
            etiqueta: [],
            ficha_etiqueta: [],
            relacion_ficha: [],
            multimedia: [{
                id_multi: 4, id_ficha: 15, ruta_archivo: mapa.entries["multimedia:4"][0],
                storage_key: null, checksum_sha256: null,
                sync_id: uuid(4), sync_version: 1, sync_deleted_at: null
            }]
        }
    };
    const normalizado = aplicarMapaSnapshot(snapshot);
    assert.doesNotThrow(() => validarSnapshot(normalizado));
    normalizado.data.multimedia[0].storage_key = "imagenes/multimedia/otro.png";
    assert.throws(() => validarSnapshot(normalizado), /clave de Storage y checksum verificables/);
});

test("preserva claves modernas con checksum aunque el ID exista en el mapa legacy", () => {
    const resultado = resolverReferenciaHistorica({
        entidad: "multimedia",
        id: 48,
        referencia: "referencia-historica-ya-superada",
        storageKey: "multimedia/imagen/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/v1.png",
        checksumSha256: "a".repeat(64)
    });
    assert.equal(resultado, null);
});
