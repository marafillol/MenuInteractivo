
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const Module = require("node:module");

const rutaPath = require.resolve("../src/rutas/admin/menus");
const authPath = require.resolve("../src/middleware/autenticarSupabase");
const rolesPath = require.resolve("../src/middleware/verificarRol");
const uploadPath = require.resolve("../src/config/multer");
const controllerPath = require.resolve("../src/controladores/menus");

const rutasEsperadas = [
    {
        metodo: "get",
        ruta: "/",
        roles: ["admin", "editor", "consulta"],
        controlador: "listarMenus",
        upload: false
    },
    {
        metodo: "post",
        ruta: "/",
        roles: ["admin", "editor"],
        controlador: "crearMenu",
        upload: true
    },
    {
        metodo: "get",
        ruta: "/:id",
        roles: ["admin", "editor", "consulta"],
        controlador: "obtenerMenu",
        upload: false
    },
    {
        metodo: "put",
        ruta: "/:id",
        roles: ["admin", "editor"],
        controlador: "actualizarMenu",
        upload: true
    },
    {
        metodo: "delete",
        ruta: "/:id",
        roles: ["admin", "editor"],
        controlador: "eliminarMenu",
        upload: false
    }
];

function cargarRouterConMocks() {
    const anteriores = new Map(
        [rutaPath, authPath, rolesPath, uploadPath, controllerPath]
            .map((path) => [path, require.cache[path]])
    );

    const rutasRegistradas = [];
    const llamadasControlador = [];

    const routerFalso = {
        get(ruta, ...middlewares) {
            rutasRegistradas.push({
                metodo: "get",
                ruta,
                middlewares
            });
            return this;
        },

        post(ruta, ...middlewares) {
            rutasRegistradas.push({
                metodo: "post",
                ruta,
                middlewares
            });
            return this;
        },

        put(ruta, ...middlewares) {
            rutasRegistradas.push({
                metodo: "put",
                ruta,
                middlewares
            });
            return this;
        },

        delete(ruta, ...middlewares) {
            rutasRegistradas.push({
                metodo: "delete",
                ruta,
                middlewares
            });
            return this;
        }
    };

    const controladorFalso = {};

    for (const nombre of [
        "listarMenus",
        "crearMenu",
        "obtenerMenu",
        "actualizarMenu",
        "eliminarMenu"
    ]) {
        controladorFalso[nombre] = (req, res) => {
            llamadasControlador.push(nombre);
            return res.json({ controlador: nombre });
        };
    }

    const authFalso = (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ error: "No autenticado" });
        }
        return next();
    };

    const verificarRolFalso = (...roles) => (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ error: "No autenticado" });
        }

        if (!roles.includes(req.usuario.rol)) {
            return res.status(403).json({ error: "No tiene permisos" });
        }

        return next();
    };

    const uploadFalso = {
        single(campo) {
            return (req, res, next) => {
                req.campoArchivo = campo;
                return next();
            };
        }
    };

    const originalLoad = Module._load;

    Module._load = function (request, parent, isMain) {
        if (parent?.filename === rutaPath) {
            if (request === "express") {
                return {
                    ...express,
                    Router: () => routerFalso
                };
            }

            if (request === "../../middleware/autenticarSupabase") {
                return authFalso;
            }

            if (request === "../../middleware/verificarRol") {
                return verificarRolFalso;
            }

            if (request === "../../config/multer") {
                return uploadFalso;
            }

            if (request === "../../controladores/menus") {
                return controladorFalso;
            }
        }

        return originalLoad.call(this, request, parent, isMain);
    };

    try {
        delete require.cache[rutaPath];
        require("../src/rutas/admin/menus");
    } finally {
        Module._load = originalLoad;

        for (const [path, modulo] of anteriores) {
            if (modulo) require.cache[path] = modulo;
            else delete require.cache[path];
        }
    }

    return { rutasRegistradas, llamadasControlador };
}

function crearRespuesta() {
    return {
        statusCode: 200,
        body: null,

        status(code) {
            this.statusCode = code;
            return this;
        },

        json(body) {
            this.body = body;
            return this;
        }
    };
}

test("registra exactamente las cinco rutas de Menús", () => {
    const { rutasRegistradas } = cargarRouterConMocks();

    assert.equal(rutasRegistradas.length, 5);

    for (const esperada of rutasEsperadas) {
        assert.ok(
            rutasRegistradas.some(
                (r) => r.metodo === esperada.metodo && r.ruta === esperada.ruta
            ),
            `Falta la ruta ${esperada.metodo.toUpperCase()} ${esperada.ruta}`
        );
    }
});

test("cada ruta tiene autenticación y verificación de rol antes del controlador", () => {
    const { rutasRegistradas } = cargarRouterConMocks();

    for (const esperada of rutasEsperadas) {
        const ruta = rutasRegistradas.find(
            (r) => r.metodo === esperada.metodo && r.ruta === esperada.ruta
        );

        assert.equal(typeof ruta.middlewares[0], "function");
        assert.equal(typeof ruta.middlewares[1], "function");

        const controlador = ruta.middlewares.at(-1);
        assert.equal(typeof controlador, "function");
    }
});

test("las rutas de lectura admiten admin, editor y consulta", () => {
    const { rutasRegistradas } = cargarRouterConMocks();

    for (const esperada of rutasEsperadas.filter((r) => r.metodo === "get")) {
        const ruta = rutasRegistradas.find(
            (r) => r.metodo === esperada.metodo && r.ruta === esperada.ruta
        );

        for (const rol of ["admin", "editor", "consulta"]) {
            const req = { usuario: { rol } };
            const res = crearRespuesta();
            let siguiente = false;

            ruta.middlewares[1](req, res, () => {
                siguiente = true;
            });

            assert.equal(
                res.statusCode,
                200,
                `${rol} debería poder acceder a ${esperada.ruta}`
            );
            assert.equal(siguiente, true);
        }
    }
});

test("las rutas de escritura admiten admin y editor, pero rechazan consulta", () => {
    const { rutasRegistradas } = cargarRouterConMocks();

    for (const esperada of rutasEsperadas.filter((r) => r.metodo !== "get")) {
        const ruta = rutasRegistradas.find(
            (r) => r.metodo === esperada.metodo && r.ruta === esperada.ruta
        );

        for (const rol of ["admin", "editor"]) {
            const req = { usuario: { rol } };
            const res = crearRespuesta();
            let siguiente = false;

            ruta.middlewares[1](req, res, () => {
                siguiente = true;
            });

            assert.equal(res.statusCode, 200);
            assert.equal(siguiente, true);
        }

        const reqConsulta = { usuario: { rol: "consulta" } };
        const resConsulta = crearRespuesta();
        let siguienteConsulta = false;

        ruta.middlewares[1](reqConsulta, resConsulta, () => {
            siguienteConsulta = true;
        });

        assert.equal(resConsulta.statusCode, 403);
        assert.equal(siguienteConsulta, false);
    }
});

test("todas las rutas rechazan peticiones sin usuario autenticado", () => {
    const { rutasRegistradas } = cargarRouterConMocks();

    for (const ruta of rutasRegistradas) {
        const req = {};
        const res = crearRespuesta();
        let siguiente = false;

        ruta.middlewares[0](req, res, () => {
            siguiente = true;
        });

        assert.equal(res.statusCode, 401);
        assert.equal(siguiente, false);
    }
});

test("crear y actualizar usan upload.single con el campo imagen", () => {
    const { rutasRegistradas } = cargarRouterConMocks();

    for (const esperada of rutasEsperadas.filter((r) => r.upload)) {
        const ruta = rutasRegistradas.find(
            (r) => r.metodo === esperada.metodo && r.ruta === esperada.ruta
        );

        assert.equal(ruta.middlewares.length, 4);

        const req = { usuario: { rol: "admin" } };
        const res = crearRespuesta();
        let siguiente = false;

        ruta.middlewares[2](req, res, () => {
            siguiente = true;
        });

        assert.equal(req.campoArchivo, "imagen");
        assert.equal(siguiente, true);
    }
});

test("lectura y eliminación no incluyen middleware de subida de archivos", () => {
    const { rutasRegistradas } = cargarRouterConMocks();

    for (const esperada of rutasEsperadas.filter((r) => !r.upload)) {
        const ruta = rutasRegistradas.find(
            (r) => r.metodo === esperada.metodo && r.ruta === esperada.ruta
        );

        assert.equal(ruta.middlewares.length, 3);
    }
});
