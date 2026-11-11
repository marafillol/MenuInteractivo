const mapa = require("./mapaStorageHistorico.json");

const HASH_RE = /^[a-f0-9]{64}$/i;
const KEY_SEGMENT_RE = /^[a-zA-Z0-9._ -]+$/;

function esClaveSegura(clave) {
    if (typeof clave !== "string" || !clave || clave.startsWith("/") || clave.includes("\\")) return false;
    const partes = clave.split("/");
    return partes.length >= 2 && partes.every((parte) =>
        parte && parte !== "." && parte !== ".." && parte.trim() === parte && KEY_SEGMENT_RE.test(parte)
    );
}

function validarMapaStorageHistorico(datos = mapa) {
    if (!datos || datos.format !== 1 ||
        typeof datos.source_project_host !== "string" ||
        datos.bucket !== "multimedia" ||
        !datos.entries || typeof datos.entries !== "object" || Array.isArray(datos.entries)) {
        throw new Error("El mapa histórico de Storage tiene un formato inválido.");
    }

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

function esStorageKeyHistorica(storageKey, datos = mapa) {
    return Object.values(datos.entries).some((entrada) => entrada[1] === storageKey);
}

function esClaveHistoricaPermitida(entidad, id, storageKey, datos = mapa) {
    const entrada = datos.entries[`${entidad}:${id}`];
    return Boolean(entrada && entrada[1] === storageKey);
}

function aplicarMapaSnapshot(snapshot, datos = mapa) {
    validarMapaStorageHistorico(datos);
    if (!snapshot?.data || typeof snapshot.data !== "object") {
        throw new Error("La instantánea no contiene datos para reconciliar rutas históricas.");
    }
    const data = { ...snapshot.data };
    for (const tabla of ["multimedia", "ficha", "menu"]) {
        if (!Array.isArray(data[tabla])) continue;
        const entidad = tabla;
        const idCampo = tabla === "multimedia" ? "id_multi" : tabla === "ficha" ? "id_ficha" : "id_menu";
        const referenciaCampo = tabla === "multimedia" ? "ruta_archivo" : "imagen";
        data[tabla] = data[tabla].map((fila) => {
            if (!fila || fila.sync_deleted_at || !fila[referenciaCampo]) return fila;
            const resuelto = resolverReferenciaHistorica({
                entidad,
                id: fila[idCampo],
                referencia: fila[referenciaCampo],
                storageKey: tabla === "multimedia" ? fila.storage_key : fila.imagen_storage_key,
                checksumSha256: tabla === "multimedia" ? fila.checksum_sha256 : fila.imagen_checksum_sha256
            }, datos);
            if (!resuelto) return fila;
            if (tabla === "multimedia") {
                return { ...fila, storage_key: resuelto.storage_key,
                    checksum_sha256: resuelto.checksum_sha256,
                    mime_type: fila.mime_type || resuelto.mime_type,
                    tamano_bytes: fila.tamano_bytes || resuelto.tamano_bytes };
            }
            return { ...fila, imagen_storage_key: resuelto.storage_key,
                imagen_checksum_sha256: resuelto.checksum_sha256,
                imagen_mime_type: fila.imagen_mime_type || resuelto.mime_type,
                imagen_tamano_bytes: fila.imagen_tamano_bytes || resuelto.tamano_bytes };
        });
    }
    return { ...snapshot, data };
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
    // Las filas ya migradas a claves nuevas y con checksum válido conservan
    // su identidad actual; el mapa solo completa metadatos legacy faltantes.
    if (storageKey && storageKey.startsWith("multimedia/") && HASH_RE.test(String(checksumSha256 || ""))) {
        return null;
    }
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
    resolverReferenciaHistorica,
    esClaveHistoricaPermitida,
    esStorageKeyHistorica,
    aplicarMapaSnapshot
};
