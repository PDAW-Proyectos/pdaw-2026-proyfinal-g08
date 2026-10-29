const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { createApp } = require("../src/app");
const { createUserStore } = require("../src/users");

let temporaryDirectory;
let server;
let baseUrl;

before(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "ofsai-auth-"));
  const users = await createUserStore(path.join(temporaryDirectory, "users.json"));
  server = createApp({ users }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

const request = (route, options) => fetch(`${baseUrl}${route}`, options);
const jsonRequest = (route, body, cookie) =>
  request(route, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });

test("el registro persiste el usuario y abre una sesión sin exponer la contraseña", async () => {
  const response = await jsonRequest("/api/register", {
    name: "  Ana Pérez ",
    email: "ANA@ejemplo.com",
    password: "contraseña-segura",
    favoriteTeam: "River Plate",
  });
  assert.equal(response.status, 201);
  const { user } = await response.json();
  assert.deepEqual(
    { name: user.name, email: user.email, favoriteTeam: user.favoriteTeam },
    { name: "Ana Pérez", email: "ana@ejemplo.com", favoriteTeam: "River Plate" },
  );
  assert.equal("passwordHash" in user, false);

  const cookie = response.headers.get("set-cookie").split(";")[0];
  assert.match(response.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(response.headers.get("set-cookie"), /SameSite=Lax/i);
  const sessionResponse = await request("/api/me", { headers: { cookie } });
  assert.equal(sessionResponse.status, 200);
  assert.equal((await sessionResponse.json()).user.name, "Ana Pérez");

  const storedUsers = JSON.parse(
    await fs.readFile(path.join(temporaryDirectory, "users.json"), "utf8"),
  );
  assert.equal(storedUsers[0].email, "ana@ejemplo.com");
  assert.notEqual(storedUsers[0].passwordHash, "contraseña-segura");
});

test("el registro valida los datos y evita correos duplicados", async () => {
  const invalid = await jsonRequest("/api/register", {
    name: "A",
    email: "no-es-un-correo",
    password: "corta",
  });
  assert.equal(invalid.status, 400);

  const duplicate = await jsonRequest("/api/register", {
    name: "Otra Ana",
    email: "ana@ejemplo.com",
    password: "contraseña-segura",
  });
  assert.equal(duplicate.status, 409);
});

test("el inicio requiere únicamente correo y contraseña y permite cerrar sesión", async () => {
  const login = await jsonRequest("/api/login", {
    email: "ana@ejemplo.com",
    password: "contraseña-segura",
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];

  const logout = await jsonRequest("/api/logout", {}, cookie);
  assert.equal(logout.status, 204);
  const sessionResponse = await request("/api/me", { headers: { cookie } });
  assert.equal(sessionResponse.status, 401);

  const invalidLogin = await jsonRequest("/api/login", {
    email: "ana@ejemplo.com",
    password: "incorrecta",
  });
  assert.equal(invalidLogin.status, 401);
});

test("el equipo favorito es opcional y las cuentas siguen disponibles al recargar el almacén", async () => {
  const response = await jsonRequest("/api/register", {
    name: "Luis",
    email: "luis@ejemplo.com",
    password: "otra-clave-segura",
    favoriteTeam: "",
  });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).user.favoriteTeam, null);

  const users = await createUserStore(path.join(temporaryDirectory, "users.json"));
  const user = await users.verify("luis@ejemplo.com", "otra-clave-segura");
  assert.equal(user.name, "Luis");
  assert.equal(user.favoriteTeam, null);
});

test("el servidor entrega las páginas y el código de autenticación", async () => {
  const page = await request("/");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /data-auth-open="register"/);

  const script = await request("/auth.js");
  assert.equal(script.status, 200);
  assert.match(await script.text(), /\/api\/register/);
});
