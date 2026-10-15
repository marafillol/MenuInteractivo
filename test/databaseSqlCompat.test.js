const test = require("node:test");
const assert = require("node:assert/strict");
const { traducirConsulta, traducirParametros, traducirFuncionesFecha } = require("../src/databaseSqlCompat");

test("reemplaza placeholders y conserva literales, identificadores y comentarios", () => {
    const sql = "SELECT ? AS valor, '?' AS literal, \"col?\" AS identificador -- ? ignorado\nWHERE id = ? /* ? ignorado */";
    assert.equal(traducirParametros(sql), "SELECT $1 AS valor, '?' AS literal, \"col?\" AS identificador -- ? ignorado\nWHERE id = $2 /* ? ignorado */");
});
test("conserva comillas simples escapadas", () => {
    assert.equal(traducirParametros("SELECT 'it''s ?' AS literal, ? AS valor"), "SELECT 'it''s ?' AS literal, $1 AS valor");
});
test("conserva operadores JSONB ? , ?| y ?&", () => {
    assert.equal(traducirParametros("SELECT datos_json ? 'clave', datos_json ?| array['a','b'], datos_json ?& array['a'], id = ?"), "SELECT datos_json ? 'clave', datos_json ?| array['a','b'], datos_json ?& array['a'], id = $1");
});
test("conserva signos de interrogación en dollar-quoted strings", () => {
    assert.equal(traducirParametros("SELECT $$texto ?$$, $body$otro ? texto$body$, ? AS valor"), "SELECT $$texto ?$$, $body$otro ? texto$body$, $1 AS valor");
});
test("admite comentarios de bloque anidados", () => {
    assert.equal(traducirParametros("SELECT ? /* externo /* ? interno */ sigue ? */ WHERE x = ?"), "SELECT $1 /* externo /* ? interno */ sigue ? */ WHERE x = $2");
});
test("traduce fechas SQLite según el tipo de columna y la zona horaria", () => {
    // Las columnas creado son timestamptz en PostgreSQL: guardar el instante actual,
    // sin atrasarlo artificialmente tres horas.
    assert.equal(traducirFuncionesFecha("INSERT INTO ficha(creado) VALUES (datetime('now','-3 hours'))"), "INSERT INTO ficha(creado) VALUES (CURRENT_TIMESTAMP)");
    // Las columnas actualizado de menu y ficha son TEXT y esperan la hora local argentina.
    assert.equal(traducirFuncionesFecha("UPDATE menu SET actualizado = datetime('now','-3 hours') WHERE id_menu = ?"), "UPDATE menu SET actualizado = TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD HH24:MI:SS') WHERE id_menu = ?");
    assert.equal(traducirFuncionesFecha("UPDATE menu SET actualizado = datetime('now') WHERE id_menu = ?"), "UPDATE menu SET actualizado = TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') WHERE id_menu = ?");
});
test("traduce INSERT OR REPLACE de configuración a upsert", () => {
    assert.equal(traducirConsulta("INSERT OR REPLACE INTO configuracion(clave, valor, actualizado) VALUES (?, ?, CURRENT_TIMESTAMP);"), "INSERT INTO configuracion(clave, valor, actualizado) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado = EXCLUDED.actualizado");
});

test("convierte CURRENT_TIMESTAMP a texto al actualizar la fecha de una plantilla", () => {
    assert.equal(
        traducirConsulta("UPDATE plantilla SET nombre = ?, actualizado = CURRENT_TIMESTAMP WHERE id_plantilla = ?"),
        "UPDATE plantilla SET nombre = $1, actualizado = TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') WHERE id_plantilla = $2"
    );
});
