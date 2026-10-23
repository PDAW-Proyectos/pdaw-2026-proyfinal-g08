const request = require("supertest");
const { createApp } = require("../src/app");
const { createUserStore } = require("../src/users");

let app;
beforeAll(async () => {
  app = createApp({ users: await createUserStore("clave-de-prueba") });
});

const loginAs = async (email) => {
  const agent = request.agent(app); // conserva la cookie entre solicitudes
  await agent
    .post("/api/login")
    .send({ email, password: "clave-de-prueba" })
    .expect(200);
  return agent;
};

test("sin sesión, un recurso protegido responde 401", async () => {
  await request(app).get("/api/me").expect(401);
});

test("credenciales inválidas responden 401 con mensaje genérico", async () => {
  const res = await request(app)
    .post("/api/login")
    .send({ email: "tomas@ejemplo.test", password: "x" })
    .expect(401);
  expect(res.body.error).toBe("Correo o contraseña incorrectos");
});

test("el login envía una cookie HttpOnly y SameSite=Lax", async () => {
  const res = await request(app)
    .post("/api/login")
    .send({ email: "tomas@ejemplo.test", password: "clave-de-prueba" });
  const cookie = res.headers["set-cookie"][0];
  expect(cookie).toMatch(/HttpOnly/);
  expect(cookie).toMatch(/SameSite=Lax/);
});

test("la respuesta nunca incluye el hash de la contraseña", async () => {
  const agent = await loginAs("tomas@ejemplo.test");
  const res = await agent.get("/api/me").expect(200);
  expect(res.body).not.toHaveProperty("passwordHash");
});

test("un socio autenticado no accede a reportes: 403", async () => {
  const agent = await loginAs("tomas@ejemplo.test");
  await agent.get("/api/reportes/vencidos").expect(403);
});

test("la bibliotecaria sí accede a reportes", async () => {
  const agent = await loginAs("lucia@ejemplo.test");
  await agent.get("/api/reportes/vencidos").expect(200);
});

test("tras el logout la sesión deja de ser válida", async () => {
  const agent = await loginAs("tomas@ejemplo.test");
  await agent.post("/api/logout").expect(204);
  await agent.get("/api/me").expect(401);
});
