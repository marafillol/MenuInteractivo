const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("SQLite prepara integridad referencial, WAL, busy_timeout y migraciones", () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "museo-sqlite-"));
    const archivoDb = path.join(directorio, "prueba.db");
    const codigo = `
        const db = require("./src/database");
        const consultar = (sql) => new Promise((resolve, reject) => {
            db.get(sql, [], (error, fila) => error ? reject(error) : resolve(fila));
        });
        const ejecutar = (sql, valores = []) => new Promise((resolve, reject) => {
            db.run(sql, valores, function(error) {
                if (error) reject(error);
                else resolve({ changes: this.changes });
            });
        });
        (async () => {
            await db.preparar();
            const fk = await consultar("PRAGMA foreign_keys");
            const wal = await consultar("PRAGMA journal_mode");
            const timeout = await consultar("PRAGMA busy_timeout");
            if (fk.foreign_keys !== 1) throw new Error("foreign_keys no está activo");
            if (String(wal.journal_mode).toLowerCase() !== "wal") throw new Error("WAL no está activo");
            if (timeout.timeout !== 5000) throw new Error("busy_timeout incorrecto");
            const columnas = await consultar("SELECT COUNT(*) AS cantidad FROM pragma_table_info('usuario') WHERE name = 'password_hash'");
            if (columnas.cantidad !== 1) throw new Error("No se aplicó la migración password_hash");
            let rechazoReferencial = false;
            try {
                await ejecutar("INSERT INTO menu (nombre, id_plantilla) VALUES (?, ?)", ["invalido", 987654321]);
            } catch (error) {
                rechazoReferencial = error.code === "SQLITE_CONSTRAINT";
            }
            if (!rechazoReferencial) throw new Error("SQLite aceptó una referencia inexistente");

            const ejecutarTx = (sql, valores = []) => db.withTransaction((consultarTx) =>
                consultarTx(sql, valores)
            );

            await ejecutar("INSERT INTO plantilla (nombre, plantilla_json) VALUES (?, ?)", ["Plantilla tx", "{}"]);
            await ejecutar("INSERT INTO menu (nombre, id_plantilla) VALUES (?, ?)", ["Menu tx", 1]);
            await ejecutar("INSERT INTO ficha (id_menu, titulo) VALUES (?, ?)", [1, "Ficha tx"]);
            await ejecutar("INSERT INTO etiqueta (nombre) VALUES (?)", ["Etiqueta tx"]);
            await ejecutar("INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES (?, ?)", [1, 1]);

            let rollbackCorrecto = false;
            try {
                await db.withTransaction(async (tx) => {
                    await tx("DELETE FROM ficha_etiqueta WHERE id_ficha = ?", [1]);
                    throw new Error("forzar rollback");
                });
            } catch (error) {
                rollbackCorrecto = error.message === "forzar rollback";
            }
            if (!rollbackCorrecto) throw new Error("No se propagó el error de la transacción");
            const relacion = await consultar("SELECT COUNT(*) AS cantidad FROM ficha_etiqueta WHERE id_ficha = 1");
            if (relacion.cantidad !== 1) throw new Error("El rollback no restauró la relación");

            await ejecutar("INSERT INTO configuracion (clave, valor) VALUES (?, ?)", ["contador_tx", "0"]);
            const incrementar = () => db.withTransaction(async (tx) => {
                const actual = await tx("SELECT valor FROM configuracion WHERE clave = ?", ["contador_tx"]);
                const siguiente = Number(actual.rows[0].valor) + 1;
                await tx("UPDATE configuracion SET valor = ? WHERE clave = ?", [String(siguiente), "contador_tx"]);
            });
            await Promise.all([incrementar(), incrementar()]);
            const contador = await consultar("SELECT valor FROM configuracion WHERE clave = ?", ["contador_tx"]);
            if (contador.valor !== "2") throw new Error("Las transacciones concurrentes perdieron una actualización");


            const Ficha = require("./src/modelos/ficha");
            const Menu = require("./src/modelos/menu");
            const Plantilla = require("./src/modelos/plantilla");
            const Etiqueta = require("./src/modelos/etiquetaModelo");

            await ejecutar(
                "INSERT INTO multimedia (id_ficha, ruta_archivo) VALUES (?, ?)",
                [1, "prueba/archivo.png"]
            );
            const fichaConMultimedia = await Ficha.eliminarCompleta(1);
            if (fichaConMultimedia.eliminada || fichaConMultimedia.multimedia !== 1) {
                throw new Error("Se permitió eliminar una ficha con multimedia");
            }
            const fichaConservada = await consultar("SELECT COUNT(*) AS cantidad FROM ficha WHERE id_ficha = 1");
            if (fichaConservada.cantidad !== 1) throw new Error("La ficha con multimedia fue eliminada");
            await ejecutar("DELETE FROM multimedia WHERE id_ficha = ?", [1]);

            const menuConFichas = await Menu.eliminarSiVacio(1);
            if (!menuConFichas.encontrado || menuConFichas.cantidad !== 1 || menuConFichas.eliminado) {
                throw new Error("Se permitió eliminar un menú que todavía tiene fichas");
            }
            const menuConservado = await consultar("SELECT COUNT(*) AS cantidad FROM menu WHERE id_menu = 1");
            if (menuConservado.cantidad !== 1) throw new Error("El menú con fichas fue eliminado");

            const plantillaEnUso = await Plantilla.eliminarSiNoUtilizada(1);
            if (!plantillaEnUso.encontrada || plantillaEnUso.cantidad !== 1 || plantillaEnUso.eliminada) {
                throw new Error("Se permitió eliminar una plantilla que todavía utiliza un menú");
            }
            const plantillaConservada = await consultar("SELECT COUNT(*) AS cantidad FROM plantilla WHERE id_plantilla = 1");
            if (plantillaConservada.cantidad !== 1) throw new Error("La plantilla en uso fue eliminada");

            const fichaEliminada = await Ficha.eliminarCompleta(1);
            if (!fichaEliminada.eliminada) throw new Error("No se eliminó la ficha de prueba");
            const menuEliminado = await Menu.eliminarSiVacio(1);
            if (!menuEliminado.eliminado) throw new Error("No se eliminó el menú vacío");
            const plantillaEliminada = await Plantilla.eliminarSiNoUtilizada(1);
            if (!plantillaEliminada.eliminada) throw new Error("No se eliminó la plantilla sin uso");

            await ejecutar("INSERT INTO plantilla (nombre, plantilla_json) VALUES (?, ?)", ["Plantilla etiqueta", "{}"]);
            await ejecutar("INSERT INTO menu (nombre, id_plantilla) VALUES (?, ?)", ["Menu etiqueta", 2]);
            await ejecutar("INSERT INTO ficha (id_menu, titulo) VALUES (?, ?)", [2, "Ficha etiqueta"]);
            await ejecutar("INSERT INTO etiqueta (nombre) VALUES (?)", ["Etiqueta para borrar"]);
            await ejecutar("INSERT INTO ficha_etiqueta (id_ficha, id_etiqueta) VALUES (?, ?)", [2, 2]);
            const etiquetaEliminada = await Etiqueta.eliminarConRelaciones(2);
            if (!etiquetaEliminada.eliminado) throw new Error("No se eliminó la etiqueta");
            const relacionesRestantes = await consultar("SELECT COUNT(*) AS cantidad FROM ficha_etiqueta WHERE id_etiqueta = 2");
            if (relacionesRestantes.cantidad !== 0) throw new Error("Quedaron relaciones de la etiqueta eliminada");

            await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
        })().catch(error => {
            console.error(error);
            process.exitCode = 1;
        });
    `;

    try {
        execFileSync(process.execPath, ["-e", codigo], {
            cwd: path.resolve(__dirname, ".."),
            env: {
                ...process.env,
                MODO_SERVIDOR: "local",
                LOCAL_AUTH_SECRET: "test-secret-0123456789-0123456789",
                DATABASE_SQLITE_PATH: archivoDb
            },
            stdio: "pipe"
        });
    } finally {
        fs.rmSync(directorio, { recursive: true, force: true });
    }

    assert.ok(true);
});
