/**
 * Adapta construcciones SQLite usadas por los modelos al SQL de PostgreSQL.
 * El escáner conserva literales, identificadores y comentarios al traducir ?.
 */
function traducirFuncionesFecha(consulta) {
    let salida = "";
    let i = 0;
    let estado = "normal";
    let etiquetaDolar = null;
    let profundidadComentario = 0;

    while (i < consulta.length) {
        const resto = consulta.slice(i);
        if (estado === "normal") {
            if (resto.startsWith("--")) { salida += "--"; i += 2; estado = "comentarioLinea"; continue; }
            if (resto.startsWith("/*")) { salida += "/*"; i += 2; estado = "comentarioBloque"; profundidadComentario = 1; continue; }
            const dolar = resto.match(/^\$[a-zA-Z_][a-zA-Z0-9_]*\$|^\$\$/);
            if (dolar) { etiquetaDolar = dolar[0]; salida += etiquetaDolar; i += etiquetaDolar.length; estado = "literalDolar"; continue; }

            const anterior = i === 0 ? "" : consulta[i - 1];
            if (!/[\w$]/.test(anterior)) {
                const actualizadoTexto = /\bactualizado\s*=\s*$/i.test(salida);
                const desplazada = resto.match(/^datetime\s*\(\s*'now'\s*,\s*'-3 hours'\s*\)/i);
                if (desplazada) {
                    salida += actualizadoTexto
                        ? "TO_CHAR(CURRENT_TIMESTAMP - INTERVAL '3 hours', 'YYYY-MM-DD HH24:MI:SS')"
                        : "(CURRENT_TIMESTAMP - INTERVAL '3 hours')";
                    i += desplazada[0].length; continue;
                }
                const actual = resto.match(/^datetime\s*\(\s*'now'\s*\)/i);
                if (actual) {
                    salida += actualizadoTexto
                        ? "TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')"
                        : "CURRENT_TIMESTAMP";
                    i += actual[0].length; continue;
                }
            }
            const ch = consulta[i++];
            salida += ch;
            if (ch === "'") estado = "literalSimple";
            else if (ch === '"') estado = "identificadorDoble";
            else if (ch === String.fromCharCode(96)) estado = "identificadorBacktick";
            continue;
        }
        if (estado === "comentarioLinea") {
            const ch = consulta[i++]; salida += ch; if (ch === "\n") estado = "normal"; continue;
        }
        if (estado === "comentarioBloque") {
            if (consulta.startsWith("/*", i)) { salida += "/*"; i += 2; profundidadComentario += 1; }
            else if (consulta.startsWith("*/", i)) {
                salida += "*/"; i += 2; profundidadComentario -= 1; if (!profundidadComentario) estado = "normal";
            } else salida += consulta[i++];
            continue;
        }
        if (estado === "literalDolar") {
            if (consulta.startsWith(etiquetaDolar, i)) { salida += etiquetaDolar; i += etiquetaDolar.length; estado = "normal"; etiquetaDolar = null; }
            else salida += consulta[i++];
            continue;
        }
        const ch = consulta[i++]; salida += ch;
        if (estado === "literalSimple" && ch === "'") {
            if (consulta[i] === "'") salida += consulta[i++]; else estado = "normal";
        } else if (estado === "identificadorDoble" && ch === '"') {
            if (consulta[i] === '"') salida += consulta[i++]; else estado = "normal";
        } else if (estado === "identificadorBacktick" && ch === String.fromCharCode(96)) {
            if (consulta[i] === String.fromCharCode(96)) salida += consulta[i++]; else estado = "normal";
        }
    }
    return salida;
}

function pareceOperadorJson(consulta, indice) {
    const siguiente = consulta.slice(indice + 1).match(/^\s*(.)/s)?.[1];
    if (siguiente === "|" || siguiente === "&") return true;
    if (siguiente !== "'" && siguiente !== "?") return false;
    let anterior = indice - 1;
    while (anterior >= 0 && /\s/.test(consulta[anterior])) anterior -= 1;
    return anterior >= 0 && /[\w)\]']/.test(consulta[anterior]);
}

function traducirParametros(consulta) {
    let salida = "";
    let indiceParametro = 0;
    let i = 0;
    let estado = "normal";
    let etiquetaDolar = null;
    let profundidadComentario = 0;

    while (i < consulta.length) {
        const resto = consulta.slice(i);
        if (estado === "normal") {
            if (resto.startsWith("--")) { salida += "--"; i += 2; estado = "comentarioLinea"; continue; }
            if (resto.startsWith("/*")) { salida += "/*"; i += 2; estado = "comentarioBloque"; profundidadComentario = 1; continue; }
            const dolar = resto.match(/^\$[a-zA-Z_][a-zA-Z0-9_]*\$|^\$\$/);
            if (dolar) { etiquetaDolar = dolar[0]; salida += etiquetaDolar; i += etiquetaDolar.length; estado = "literalDolar"; continue; }

            const ch = consulta[i];
            if (ch === "'") { salida += ch; i += 1; estado = "literalSimple"; continue; }
            if (ch === '"') { salida += ch; i += 1; estado = "identificadorDoble"; continue; }
            if (ch === String.fromCharCode(96)) { salida += ch; i += 1; estado = "identificadorBacktick"; continue; }
            if (ch === "?" && !pareceOperadorJson(consulta, i)) { indiceParametro += 1; salida += "$" + indiceParametro; }
            else salida += ch;
            i += 1; continue;
        }
        if (estado === "comentarioLinea") {
            const ch = consulta[i++]; salida += ch; if (ch === "\n") estado = "normal"; continue;
        }
        if (estado === "comentarioBloque") {
            if (consulta.startsWith("/*", i)) { salida += "/*"; i += 2; profundidadComentario += 1; }
            else if (consulta.startsWith("*/", i)) {
                salida += "*/"; i += 2; profundidadComentario -= 1; if (!profundidadComentario) estado = "normal";
            } else salida += consulta[i++];
            continue;
        }
        if (estado === "literalDolar") {
            if (consulta.startsWith(etiquetaDolar, i)) { salida += etiquetaDolar; i += etiquetaDolar.length; estado = "normal"; etiquetaDolar = null; }
            else salida += consulta[i++];
            continue;
        }
        const ch = consulta[i++]; salida += ch;
        if (estado === "literalSimple" && ch === "'") {
            if (consulta[i] === "'") salida += consulta[i++]; else estado = "normal";
        } else if (estado === "identificadorDoble" && ch === '"') {
            if (consulta[i] === '"') salida += consulta[i++]; else estado = "normal";
        } else if (estado === "identificadorBacktick" && ch === String.fromCharCode(96)) {
            if (consulta[i] === String.fromCharCode(96)) salida += consulta[i++]; else estado = "normal";
        }
    }
    return salida;
}

function traducirConsulta(consulta) {
    let sql = traducirParametros(traducirFuncionesFecha(consulta));
    const inicioUpsert = /^\s*INSERT\s+OR\s+REPLACE\s+INTO\s+configuracion\b/i;
    if (inicioUpsert.test(sql)) {
        sql = sql.trim().replace(/;\s*$/, "");
        sql = sql.replace(inicioUpsert, "INSERT INTO configuracion");
        sql += " ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado = EXCLUDED.actualizado";
    }
    return sql;
}
module.exports = { traducirConsulta, traducirParametros, traducirFuncionesFecha };
