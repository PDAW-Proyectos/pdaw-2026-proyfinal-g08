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
      const usuario = authService.obtenerUsuarioPorSesion(sessionId);
      if (usuario) {
        req.usuario = usuario;
        req.user = usuario.toPublicJSON();
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

export function requerirAdministrador(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({
      error: "Es necesario iniciar sesión.",
      status: 401,
      code: "unauthorized",
    });
  }
  try {
    req.usuario.verificarAccesoAdmin();
    return next();
  } catch (error) {
    return next(error);
  }
}
