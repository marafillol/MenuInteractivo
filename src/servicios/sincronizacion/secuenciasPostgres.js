const IDENTIFICADORES_POSTGRES = Object.freeze([
  ["plantilla", "id_plantilla"],
  ["menu", "id_menu"],
  ["ficha", "id_ficha"],
  ["etiqueta", "id_etiqueta"],
  ["relacion_ficha", "id_relacion"],
  ["multimedia", "id_multi"]
]);

/**
 * Verifica y prepara las secuencias de las PK autoincrementales usadas
 * por las entidades y relaciones del protocolo de sincronización.
 * Crea las faltantes, las asocia a sus columnas y las posiciona por encima
 * del mayor ID sin hacer retroceder una secuencia ya utilizada.
 */
async function asegurarSecuenciasIdentificadores({ run, all }) {
  for (const [tabla, columna] of IDENTIFICADORES_POSTGRES) {
    const secuencia = `${tabla}_${columna}_seq`;
    const tablaSql = `public."${tabla}"`;
    const secuenciaSql = `public."${secuencia}"`;

    await run(`CREATE SEQUENCE IF NOT EXISTS ${secuenciaSql} AS BIGINT`);
    await run(
      `ALTER TABLE ${tablaSql} ALTER COLUMN "${columna}" ` +
      `SET DEFAULT nextval('public."${secuencia}"'::regclass)`
    );
    await run(`ALTER SEQUENCE ${secuenciaSql} OWNED BY ${tablaSql}."${columna}"`);

    // Conserva el mayor valor entre el estado actual de la secuencia y MAX(id).
    // En una tabla vacía y una secuencia nueva, mantiene is_called=false para
    // que el primer INSERT reciba 1; nunca reduce una secuencia ya avanzada.
    await all(
      `SELECT setval('public."${secuencia}"'::regclass, ` +
      `GREATEST((SELECT last_value FROM ${secuenciaSql}), ` +
      `COALESCE((SELECT MAX("${columna}") FROM ${tablaSql}), 1)), ` +
      `(SELECT is_called FROM ${secuenciaSql}) OR EXISTS (SELECT 1 FROM ${tablaSql})) AS valor`
    );
  }
}

module.exports = { IDENTIFICADORES_POSTGRES, asegurarSecuenciasIdentificadores };
