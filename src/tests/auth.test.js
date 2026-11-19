import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, test } from "@jest/globals";
import { createApp } from "../js/app.js";
import { createUserStore } from "../js/Usuarios/users.js";

let temporaryDirectory;
let server;
let baseUrl;

beforeAll(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "ofsai-auth-"));
  const users = await createUserStore(path.join(temporaryDirectory, "users.json"));
  server = createApp({ users }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
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

test("inicializa un administrador privado y deja un solo rol de administrador", async () => {
  const filePath = path.join(temporaryDirectory, "users-with-admin.json");
  await fs.writeFile(
    filePath,
    JSON.stringify([
      {
        id: "admin-anterior",
        name: "Admin anterior",
        email: "anterior@ejemplo.com",
        passwordHash: "hash",
        salt: "salt",
        role: "admin",
      },
    ]),
  );
  const initialAdmin = {
    name: "Administradora de prueba",
    email: "admin-prueba@ejemplo.com",
    password: "admin-password-test",
  };

  const users = await createUserStore(filePath, { initialAdmin });
  const savedUsers = JSON.parse(await fs.readFile(filePath, "utf8"));
  const admin = await users.verify(initialAdmin.email, initialAdmin.password);

  assert.equal(admin.name, initialAdmin.name);
  assert.equal(admin.role, "admin");
  assert.notEqual(admin.passwordHash, initialAdmin.password);
  assert.equal(
    savedUsers.filter((user) => user.role === "admin").length,
    1,
  );
  assert.equal(users.findById("admin-anterior").role, "user");
  await assert.rejects(users.setStatus(admin.id, "suspended"), {
    code: "protected_admin",
  });
  await assert.rejects(users.deleteAccount(admin.id), {
    code: "protected_admin",
  });

  const reloadedUsers = await createUserStore(filePath, { initialAdmin });
  assert.ok(await reloadedUsers.verify(initialAdmin.email, initialAdmin.password));
});

test("inicializa usuarios de demostración solo cuando el archivo aún no existe", async () => {
  const filePath = path.join(temporaryDirectory, "users-with-demo.json");
  const usuarioDemo = {
    id: "usuario-demo",
    name: "Aficionada de muestra",
    email: "demo@example.com",
    passwordHash: "hash-demo",
    salt: "salt-demo",
    role: "user",
    favoriteTeam: null,
    status: "active",
  };
  const usuarios = await createUserStore(filePath, {
    initialUsers: [usuarioDemo],
  });
  assert.equal(usuarios.findById(usuarioDemo.id).email, usuarioDemo.email);
  assert.deepEqual(JSON.parse(await fs.readFile(filePath, "utf8")), [
    usuarioDemo,
  ]);

  const recargados = await createUserStore(filePath, {
    initialUsers: [{ ...usuarioDemo, id: "otro-usuario" }],
  });
  assert.equal(recargados.list().length, 1);
  assert.equal(recargados.findById(usuarioDemo.id).email, usuarioDemo.email);
});

test("las cuentas de demostración permiten iniciar sesión con credenciales conocidas", async () => {
  const filePath = path.join(temporaryDirectory, "users-demo-accounts.json");
  const initialUsers = JSON.parse(
    await fs.readFile(new URL("../../data/demo-users.json", import.meta.url), "utf8"),
  );
  const usuarios = await createUserStore(filePath, { initialUsers });

  const administrador = await usuarios.verify(
    "admin@orsai.demo",
    "OrsaiExpo2026!",
  );
  expect(administrador.role).toBe("admin");
  expect(await usuarios.verify("lucia@orsai.demo", "OrsaiExpo2026!")).not.toBe(
    null,
  );
});

test("suspende, reactiva y elimina cuentas conservando evidencia sin credenciales", async () => {
  const filePath = path.join(temporaryDirectory, "users-with-status.json");
  const users = await createUserStore(filePath);
  const user = await users.register({
    name: "Usuario de prueba",
    email: "usuario-status@ejemplo.com",
    password: "clave-segura-de-prueba",
  });

  await users.setStatus(user.id, "suspended");
  assert.equal(await users.verify(user.email, "clave-segura-de-prueba"), null);

  const reloadedUsers = await createUserStore(filePath);
  await reloadedUsers.setStatus(user.id, "active");
  assert.ok(await reloadedUsers.verify(user.email, "clave-segura-de-prueba"));

  const deletedUser = await reloadedUsers.deleteAccount(user.id);
  assert.equal(deletedUser.name, "Cuenta borrada");
  assert.equal(deletedUser.email, user.email);
  assert.equal(deletedUser.status, "deleted");
  assert.equal("passwordHash" in deletedUser, false);
  assert.equal("salt" in deletedUser, false);
  assert.equal(
    (await reloadedUsers.list()).find((item) => item.id === user.id).email,
    user.email,
  );
  assert.equal(await reloadedUsers.verify(user.email, "clave-segura-de-prueba"), null);
  await assert.rejects(reloadedUsers.setStatus(user.id, "active"), {
    code: "deleted_account",
  });
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

test("el servidor entrega las páginas y los scripts de la aplicación", async () => {
  const page = await request("/");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /data-auth-open="register"/);

  const leaguesPage = await request("/ligas.html");
  assert.equal(leaguesPage.status, 200);
  const leagueHtml = await leaguesPage.text();
  assert.match(leagueHtml, /Tabla de posiciones/);
  assert.equal((leagueHtml.match(/data-liga-id=/g) || []).length, 6);
  assert.equal((leagueHtml.match(/data-liga-tabla/g) || []).length, 6);

  const script = await request("/auth.js");
  assert.equal(script.status, 200);
  assert.match(await script.text(), /\/api\/register/);

  const appScript = await request("/js/main.js");
  assert.equal(appScript.status, 200);
  const appScriptText = await appScript.text();
  assert.match(appScriptText, /inicializarAutenticacion/);
  assert.match(appScriptText, /DOMContentLoaded/);
});
