const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const {
    CLAVE_DEVICE_ID,
    crearServicioDispositivo
} = require("../src/servicios/sincronizacion/dispositivo");

function crearDbFalso() {
    const configuracion = new Map();
    let cola = Promise.resolve();

    return {
        configuracion,
        async withTransaction(trabajo) {
            let liberar;
            const anterior = cola;
            cola = new Promise((resolve) => { liberar = resolve; });
            await anterior;

            try {
                const consultar = async (sql, valores = []) => {
                    if (/^SELECT valor FROM configuracion/i.test(sql.trim())) {
                        const valor = configuracion.get(valores[0]);
                        return { rows: valor === undefined ? [] : [{ valor }], rowCount: valor === undefined ? 0 : 1 };
                    }
                    if (/^INSERT INTO configuracion/i.test(sql.trim())) {
                        if (!configuracion.has(valores[0])) configuracion.set(valores[0], valores[1]);
                        return { rows: [], rowCount: 1 };
                    }
                    throw new Error("SQL inesperado en prueba: " + sql);
                };
                return await trabajo(consultar);
            } finally {
                liberar();
            }
        }
    };
}

test("crea y persiste un UUID de dispositivo en la configuración local", async () => {
    const db = crearDbFalso();
    const esperado = randomUUID();
    const servicio = crearServicioDispositivo({
        db,
        esModoLocal: true,
        generarUUID: () => esperado
    });

    const primero = await servicio.obtenerIdDispositivo();
    const segundo = await crearServicioDispositivo({ db, esModoLocal: true }).obtenerIdDispositivo();

    assert.equal(primero, esperado);
    assert.equal(segundo, esperado);
    assert.equal(db.configuracion.get(CLAVE_DEVICE_ID), esperado);
    assert.equal(db.configuracion.size, 1);
});

test("dos solicitudes simultáneas reciben la misma identidad y crean una sola fila", async () => {
    const db = crearDbFalso();
    let generaciones = 0;
    const servicio = crearServicioDispositivo({
        db,
        esModoLocal: true,
        generarUUID: () => {
            generaciones += 1;
            return randomUUID();
        }
    });

    const [primero, segundo, tercero] = await Promise.all([
        servicio.obtenerIdDispositivo(),
        servicio.obtenerIdDispositivo(),
        servicio.obtenerIdDispositivo()
    ]);

    assert.equal(primero, segundo);
    assert.equal(segundo, tercero);
    assert.equal(generaciones, 1);
    assert.equal(db.configuracion.size, 1);
});

test("genera una identidad propia y persistente para el nodo PostgreSQL", async () => {
    const db = crearDbFalso();
    const esperado = randomUUID();
    const servicio = crearServicioDispositivo({
        db,
        esModoLocal: false,
        generarUUID: () => esperado
    });

    assert.equal(await servicio.obtenerIdDispositivo(), esperado);
    assert.equal(await servicio.obtenerIdDispositivo(), esperado);
    assert.equal(db.configuracion.get(CLAVE_DEVICE_ID), esperado);
    assert.equal(db.configuracion.size, 1);
});

test("no reemplaza una identidad local existente si está dañada", async () => {
    const db = crearDbFalso();
    db.configuracion.set(CLAVE_DEVICE_ID, "identidad-invalida");
    const servicio = crearServicioDispositivo({ db, esModoLocal: true });

    await assert.rejects(servicio.obtenerIdDispositivo(), /no es un UUID válido/);
    assert.equal(db.configuracion.get(CLAVE_DEVICE_ID), "identidad-invalida");
});
