const test = require("node:test");
const assert = require("node:assert/strict");
const { registrarEvento } = require("../src/servicios/sincronizacion/outbox");

test("registra el evento usando el ejecutor transaccional y un UUID", async () => {
    let llamada;
    const consultar = async (sql, valores) => {
        llamada = { sql, valores };
        return { rowCount: 1 };
    };

    const eventId = await registrarEvento(consultar, {
        dispositivoId: "device-1",
        entidad: "ficha",
        operacion: "UPDATE",
        syncId: "sync-ficha-1",
        versionBase: 2,
        versionResultado: 3,
        payload: { titulo: "Ficha de prueba" }
    });

    assert.match(eventId, /^[0-9a-f-]{36}$/i);
    assert.match(llamada.sql, /INSERT INTO sync_eventos/);
    assert.match(llamada.sql, /evento_id, origen_device_id/);
    assert.doesNotMatch(llamada.sql, /aplicado/);
    assert.equal(llamada.valores.length, 8);
    assert.equal(llamada.valores[0], eventId);
    assert.equal(llamada.valores[1], "device-1");
    assert.equal(llamada.valores[2], "ficha");
    assert.equal(llamada.valores[3], "UPDATE");
    assert.equal(llamada.valores[4], "sync-ficha-1");
    assert.equal(llamada.valores[5], 2);
    assert.equal(llamada.valores[6], 3);
    assert.deepEqual(JSON.parse(llamada.valores[7]), { titulo: "Ficha de prueba" });
});

test("rechaza operaciones desconocidas antes de ejecutar SQL", async () => {
    let ejecutada = false;
    await assert.rejects(
        registrarEvento(async () => { ejecutada = true; }, {
            dispositivoId: "device-1",
            entidad: "ficha",
            operacion: "UPSERT",
            syncId: "sync-ficha-1"
        }),
        /Operación de sincronización no válida/
    );
    assert.equal(ejecutada, false);
});

test("propaga errores de escritura para que la transacción pueda revertirse", async () => {
    const fallo = new Error("fallo de base de datos");
    await assert.rejects(
        registrarEvento(async () => { throw fallo; }, {
            dispositivoId: "device-1",
            entidad: "ficha",
            operacion: "INSERT",
            syncId: "sync-ficha-1"
        }),
        (error) => error === fallo
    );
});
