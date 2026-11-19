export const SESSION_COOKIE_NAME = "ofsai.sid";

export function cargarSesion(authService) {
  return (req, res, next) => {
    const cookieHeader = req.headers.cookie || "";
    const sessionCookie = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));

    const sessionId = sessionCookie?.slice(SESSION_COOKIE_NAME.length + 1);
    if (sessionId && authService) {
      const user = authService.obtenerUsuarioPorSesion(sessionId);
      if (user) {
        req.user = user;
        req.sessionId = sessionId;
      }
    }
    next();
  };
}

export function requerirAutenticacion(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Es necesario iniciar sesión.",
      status: 401,
      code: "unauthorized",
    });
  }
  return next();
}
