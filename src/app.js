const path = require("node:path");
const express = require("express");
const cookieParser = require("cookie-parser");
const { createAuthRouter } = require("./auth");
const { createUserRouter } = require("./users");

const regenerate = (req) =>
  new Promise((ok, fail) =>
    req.session.regenerate((e) => (e ? fail(e) : ok())),
  );
const destroy = (req) =>
  new Promise((ok, fail) => req.session.destroy((e) => (e ? fail(e) : ok())));

function createApp({
  users,
  secret = "secreto-desarrollador",
  production = false,
}) {
  const app = express();
  if (production) {
    app.set("trust proxy", 1);
  }
  app.use(express.json());
  app.use(
    session({
      name: "sid",
      secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: production,
      },
    }),
  );

  //Autenticacion: quien hace la solicitud
  app.use((req, res, next) => {
    req.user = req.session.userId ? users.findById(req.session.userId) : null;
    next();
  });
  const requireAuth = (req, res, next) =>
    req.user
      ? next()
      : res.status(401).json({ error: "Es necesario iniciar sesion" });

  //Autorizacion: que puede hacer el usuario
  const requireRole = (role) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Es necesario iniciar sesion" });
    }
    if (req.user.role !== role) {
      return res
        .status(403)
        .json({ error: "No tiene permisos para realizar esta accion" });
    }
    next();
  };
  app.post("/api/login", async (req, res) => {
    const user = await users.verify(req.body?.email, req.body?.password ?? "");
    if (!user) {
      return res.status(401).json({ error: "Credenciales invalidas" });
    }
    await regenerate(req); // nuevo id de sesion : previene la fijacion de sesion
    req.session.userId = user.id;
    res.json({ message: "Sesion iniciada correctamente" });
  });
  app.post("/api/logout", requireAuth, async (req, res) => {
    await destroy(req);
    res.clearCookie("clase08.sid").status(204).end();
  });

  app.get("/api/me", requireAuth, (req, res) => res.json(toPublic(req.user)));

  // Recurso para cualquier usuario autenticado.
  app.get("/api/prestamos", requireAuth, (req, res) =>
    res.json({ usuario: req.user.name, prestamos: [] }),
  );

  // Recurso solo para el rol bibliotecaria.
  app.get("/api/reportes/vencidos", requireRole("librarian"), (req, res) =>
    res.json({ vencidos: 3 }),
  );

  app.use(express.static(path.join(__dirname, "..", "public")));
  return app;
}

module.exports = { createApp };
