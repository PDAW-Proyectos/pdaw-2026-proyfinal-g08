import { randomBytes } from "node:crypto";
import express from "express";

const sessionCookieName = "ofsai.sid";
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

const publicUser = ({ id, name, email, favoriteTeam }) => ({
  id,
  name,
  email,
  favoriteTeam,
});

export function createUserRouter({ users, production = false }) {
  const router = express.Router();
  const sessions = new Map();

  router.use((req, res, next) => {
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

  router.post("/api/register", async (req, res) => {
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

  router.post("/api/login", async (req, res) => {
    const user = await users.verify(req.body?.email, req.body?.password);
    if (!user) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }
    startSession(res, user);
    res.json({ user: publicUser(user) });
  });

  router.get("/api/me", requireAuth, (req, res) =>
    res.json({ user: publicUser(req.user) }),
  );

  router.post("/api/logout", requireAuth, (req, res) => {
    sessions.delete(req.sessionId);
    res.clearCookie(sessionCookieName, {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      path: "/",
    });
    res.status(204).end();
  });

  return router;
}
