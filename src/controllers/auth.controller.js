import { SESSION_COOKIE_NAME } from "../middlewares/auth.middleware.js";
import { crearError } from "../utils/errores.js";

export function crearAuthController(authService, { production = false } = {}) {
  const opcionesCookie = {
    httpOnly: true,
    sameSite: "lax",
    secure: production,
    path: "/",
  };

  return {
    async registrar(req, res, next) {
      try {
        const { user, sessionId } = await authService.registrar(req.body || {});
        res.cookie(SESSION_COOKIE_NAME, sessionId, {
          ...opcionesCookie,
          maxAge: authService.sessionDurationMs,
        });
        res.status(201).json({ user });
      } catch (error) {
        next(error);
      }
    },

    async iniciarSesion(req, res, next) {
      try {
        const email = req.body?.email;
        const password = req.body?.password;
        if (
          typeof email !== "string" ||
          !email.trim() ||
          typeof password !== "string" ||
          !password
        ) {
          return next(
            crearError(
              400,
              "invalid_login",
              "Ingresá tu correo electrónico y contraseña.",
            ),
          );
        }

        const resultado = await authService.iniciarSesion(email, password);
        if (!resultado) {
          return next(
            crearError(
              401,
              "invalid_credentials",
              "Correo o contraseña incorrectos.",
            ),
          );
        }

        res.cookie(SESSION_COOKIE_NAME, resultado.sessionId, {
          ...opcionesCookie,
          maxAge: authService.sessionDurationMs,
        });
        return res.status(200).json({ user: resultado.user });
      } catch (error) {
        return next(error);
      }
    },

    obtenerPerfil(req, res) {
      return res.status(200).json({ user: req.user });
    },

    cerrarSesion(req, res) {
      authService?.cerrarSesion(req.sessionId);
      res.clearCookie(SESSION_COOKIE_NAME, opcionesCookie);
      return res.status(204).end();
    },
  };
}
