
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const Module = require("node:module");

test("un error fatal de compresiÃ³n interrumpe la descarga", async () => {
    const controladorPath = require.resolve(
        "../src/controladores/respaldo"
    );
    const originalLoad = Module._load;
    let zipSimulado;


    class ZipSimulado extends EventEmitter {
        pipe(respuesta) {
    this.respuesta = respuesta;
    respuesta.headersSent = true;
    return this;
}

        append(contenido, opciones = {}) {
            setImmediate(() => {
                this.emit("entry", {
                    name: opciones.name
                });
            });

            return this;
        }

        directory() {
            return this;
        }

        abort() {
            this.abortado = true;
        }

        async finalize() {
    const error = new Error("Error simulado de compresion");
    this.emit("error", error);
    throw error;
}
    }


    try {
        Module._load = function (solicitud, padre, esPrincipal) {
            if (
                padre?.filename === controladorPath &&
                solicitud === "../database"
            ) {
                return {
                    all(_sql, _parametros, callback) {
                        callback(null, []);
                    }
                };
            }

            if (
                padre?.filename === controladorPath &&
                solicitud === "@supabase/supabase-js"
            ) {
                return {
                    createClient() {
                        throw new Error(
                            "La prueba no debe conectarse a Supabase."
                        );
                    }
                };
            }

            if (
                padre?.filename === controladorPath &&
                solicitud === "archiver"
            ) {
                return () => {
                    zipSimulado = new ZipSimulado();
                    return zipSimulado;
                };
            }

            return originalLoad.call(this, solicitud, padre, esPrincipal);
        };

        delete require.cache[controladorPath];

        const { descargarCopiaSeguridad } = require(
            "../src/controladores/respaldo"
        );

        const eventos = new EventEmitter();
        const respuesta = Object.assign(eventos, {
            headersSent: false,
            writableEnded: false,
            destroyed: false,
            statusCode: 200,
            cabeceras: {},
            setHeader(nombre, valor) {
                this.cabeceras[nombre] = valor;
            },
            status(codigo) {
                this.statusCode = codigo;
                return this;
            },
            json(cuerpo) {
                this.cuerpo = cuerpo;
                this.headersSent = true;
                return this;
            },
            destroy(error) {
                this.destroyed = true;
                this.errorDestruccion = error;
                return this;
            }
        });

        await descargarCopiaSeguridad({}, respuesta);

        assert.ok(zipSimulado, "Debe haberse creado el ZIP simulado");
        assert.equal(
            zipSimulado.abortado,
            true,
            "El controlador debe abortar el ZIP fallido"
        );
        assert.equal(
            respuesta.destroyed,
            true,
            "Debe interrumpirse la respuesta HTTP"
        );
        assert.match(
    respuesta.errorDestruccion?.message || "",
    /Error simulado de compresion/
);
    } finally {
        Module._load = originalLoad;
        delete require.cache[controladorPath];
    }
});
