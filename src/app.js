const path = require("node:path");
const { randomBytes } = require("node:crypto");
const express = require("express");

const sessionCookieName = "ofsai.sid";
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

const publicUser = ({ id, name, email, favoriteTeam }) => ({
  id,
  name,
  email,
  favoriteTeam,
});

function createApp({ users, production = false }) {
  const app = express();
  const sessions = new Map();
  if (production) app.set("trust proxy", 1);

  app.use(express.json({ limit: "16kb" }));
  app.use((req, res, next) => {
    const cookieHeader = req.headers.cookie || "";
    const sessionCookie = cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${sessionCookieName}=`));
    const sessionId = sessionCookie?.slice(sessionCookieName.length + 1);
    const session = sessionId ? sessions.get(sessionId) : null;

    if (session && session.expiresAt > Date.now()) {
      req.user = users.findById(session.userId);
      req.sessionId = sessionId;
    } else if (sessionId) {
      sessions.delete(sessionId);
    }

    next();
  });

  const requireAuth = (req, res, next) =>
    req.user
      ? next()
      : res.status(401).json({ error: "Es necesario iniciar sesión." });

  const startSession = (res, user) => {
    const sessionId = randomBytes(32).toString("hex");
    sessions.set(sessionId, {
      userId: user.id,
      expiresAt: Date.now() + sessionDurationMs,
    });
    res.cookie(sessionCookieName, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      maxAge: sessionDurationMs,
      path: "/",
    });
  };

  app.post("/api/register", async (req, res) => {
    try {
      const user = await users.register(req.body || {});
      startSession(res, user);
      res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      if (error.code === "invalid_registration") {
        return res.status(400).json({ error: error.message });
      }
      if (error.code === "email_exists") {
        return res.status(409).json({ error: error.message });
      }
      throw error;
    }
  });

  app.post("/api/login", async (req, res) => {
    const user = await users.verify(req.body?.email, req.body?.password);
    if (!user) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }
    startSession(res, user);
    res.json({ user: publicUser(user) });
  });

  app.get("/api/me", requireAuth, (req, res) =>
    res.json({ user: publicUser(req.user) }),
  );

  app.post("/api/logout", requireAuth, (req, res) => {
    sessions.delete(req.sessionId);
    res.clearCookie(sessionCookieName, {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      path: "/",
    });
    res.status(204).end();
  });

  app.get("/auth.js", (req, res) =>
    res.sendFile(path.join(__dirname, "auth.js")),
  );

  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    res.status(500).json({ error: "Ocurrió un error interno. Intentá nuevamente." });
  });

  return app;
}

module.exports = { createApp };
