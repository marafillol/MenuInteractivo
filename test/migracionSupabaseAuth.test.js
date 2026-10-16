const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const raiz = path.resolve(__dirname, "..");
const leer = (relativa) => fs.readFileSync(path.join(raiz, relativa), "utf8");

test("las rutas administrativas ya usan el middleware de Supabase", () => {
    const carpeta = path.join(raiz, "src/rutas/admin");
    const rutas = fs.readdirSync(carpeta).filter((nombre) => nombre.endsWith(".js"));
    assert.ok(rutas.length > 0);

    for (const nombre of rutas) {
        const codigo = fs.readFileSync(path.join(carpeta, nombre), "utf8");
        assert.doesNotMatch(codigo, /autenticarFirebase|middleware\/autenticarFirebase/, nombre);
    }
});

test("el login y el panel cargan únicamente los módulos de Supabase Auth", () => {
    const loginHtml = leer("src/frontend-admin/index.html");
    const panelHtml = leer("src/frontend-admin/panel.html");
    const loginJs = leer("src/frontend-admin/js/login.js");
    const authJs = leer("src/frontend-admin/js/authSupabase.js");
    const apiJs = leer("src/frontend-admin/js/apiSupabase.js");

    assert.match(loginHtml, /js\/login\.js/);
    assert.match(panelHtml, /js\/authSupabase\.js/);
    assert.match(panelHtml, /js\/apiSupabase\.js/);
    for (const codigo of [loginHtml, panelHtml, loginJs, authJs, apiJs]) {
        assert.doesNotMatch(codigo, /firebase\.js|authFirebase|apiFirebase|firebase-admin/i);
    }
});

test("Firebase Admin ya no es una dependencia del proyecto", () => {
    const pkg = JSON.parse(leer("package.json"));
    const lock = JSON.parse(leer("package-lock.json"));

    assert.equal(pkg.dependencies?.["firebase-admin"], undefined);
    assert.equal(lock.packages?.["node_modules/firebase-admin"], undefined);
    assert.equal(lock.packages?.["node_modules/@supabase/supabase-js"] !== undefined, true);
});

test("las claves privadas de autenticación no se incluyen en archivos del navegador", () => {
    const cliente = leer("src/frontend-admin/js/supabaseClient.js");
    const config = leer("src/config/supabaseAuth.js");
    assert.doesNotMatch(cliente, /SERVICE_ROLE_KEY|SECRET_KEY/);
    assert.match(config, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(config, /SUPABASE_ANON_KEY|SUPABASE_PUBLISHABLE_KEY/);
});

test("la gestión de usuarios evita insertar datos de usuarios como HTML", () => {
    const usuariosJs = leer("src/frontend-admin/js/usuarios.js");

    assert.doesNotMatch(usuariosJs, /tabla\\.innerHTML|texto\\.innerHTML/);
    assert.match(usuariosJs, /celda\\.textContent\\s*=/);
    assert.match(usuariosJs, /boton\\.addEventListener\\("click",\\s*accion\\)/);
});
