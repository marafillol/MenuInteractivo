const mapa = require("./mapaStorageHistorico.json");

const HASH_RE = /^[a-f0-9]{64}$/i;
const KEY_SEGMENT_RE = /^[a-zA-Z0-9._-]+$/;

function esClaveSegura(clave) {
    if (typeof clave !== "string" || !clave || clave.startsWith("/") || clave.includes("\\\\")) return false;
    const partes = clave.split("/");
    return partes.length >= 2 && partes.every((parte) =>
        parte && parte !== "." && parte !== ".." && KEY_SEGMENT_RE.test(parte)
    );
}

function validarMapaStorageHistorico(datos = mapa) {
    if (!datos || datos.format !== 1 ||
        typeof datos.source_project_host !== "string" ||
        datos.bucket !== "multimedia" ||
        !datos.entries || typeof datos.entries !== "object" || Array.isArray(datos.entries)) {
        throw new Error("El mapa histórico de Storage tiene un formato inválido.");
    }

    const claves = new Set();
    for (const [identidad, entrada] of Object.entries(datos.entries)) {
        if (!/^(multimedia|ficha|menu):[1-9][0-9]*$/.test(identidad) ||
            !Array.isArray(entrada) || entrada.length !== 5) {
            throw new Error("El mapa histórico contiene una entrada inválida.");
        }
        const [referencia, storageKey, checksum, bytes, mimeType] = entrada;
        if (typeof referencia !== "string" || !referencia ||
            !esClaveSegura(storageKey) || !HASH_RE.test(String(checksum)) ||
            !Number.isSafeInteger(bytes) || bytes < 1 ||
            typeof mimeType !== "string" || !mimeType.includes("/")) {
            throw new Error("El mapa histórico contiene metadatos multimedia inválidos.");
        }
        if (claves.has(storageKey)) {
            // Un mismo objeto puede ser compartido por dos entidades; el control de
            // identidad se hace por entidad/ID, no se prohíben claves repetidas.
        }
        claves.add(storageKey);
    }
    return true;
}

function extraerClaveUrl(referencia, datos = mapa) {
    let url;
    try {
        url = new URL(referencia);
    } catch {
        return null;
    }
    if (url.protocol !== "https:" || url.hostname !== datos.source_project_host ||
        url.username || url.password || url.port) {
        throw new Error("La URL multimedia no pertenece al proyecto histórico autorizado.");
    }
    const prefijo = `/storage/v1/object/public/${datos.bucket}/`;
    if (!url.pathname.startsWith(prefijo)) {
        throw new Error("La URL no apunta al bucket histórico autorizado.");
    }
    let clave;
    try {
        clave = decodeURIComponent(url.pathname.slice(prefijo.length));
    } catch {
        throw new Error("La URL multimedia contiene una ruta codificada inválida.");
    }
    if (!esClaveSegura(clave)) {
        throw new Error("La clave histórica de Storage no es segura.");
    }
    return clave;
}

function resolverReferenciaHistorica({ entidad, id, referencia, storageKey, checksumSha256 }, datos = mapa) {
    validarMapaStorageHistorico(datos);
    if (!["multimedia", "ficha", "menu"].includes(entidad) ||
        !/^[1-9][0-9]*$/.test(String(id))) {
        throw new TypeError("La identidad de la referencia multimedia no es válida.");
    }

    const entrada = datos.entries[`${entidad}:${id}`];
    if (!entrada) return null;

    const [referenciaOriginal, claveEsperada, hashEsperado, bytes, mimeType] = entrada;
    const claveDesdeUrl = typeof referencia === "string" && /^https?:\/\//i.test(referencia)
        ? extraerClaveUrl(referencia, datos)
        : null;
    const coincideReferencia = referencia === referenciaOriginal ||
        referencia === claveEsperada ||
        (claveDesdeUrl !== null && claveDesdeUrl === claveEsperada);

    if (!coincideReferencia) {
        throw new Error("La referencia no coincide con el alias histórico verificado para este registro.");
    }
    if (storageKey && storageKey !== claveEsperada) {
        throw new Error("La clave Storage existente contradice el mapa histórico verificado.");
    }
    if (checksumSha256 && checksumSha256 !== hashEsperado) {
        throw new Error("El checksum existente contradice el mapa histórico verificado.");
    }

    return {
        storage_key: claveEsperada,
        checksum_sha256: hashEsperado,
        tamano_bytes: bytes,
        mime_type: mimeType,
        evidencia: "mapa_historico_verificado"
    };
}

validarMapaStorageHistorico();

module.exports = {
    validarMapaStorageHistorico,
    extraerClaveUrl,
    resolverReferenciaHistorica
};
