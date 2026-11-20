import { crearError } from "../utils/errores.js";

export function rutaApiNoEncontrada(req, res, next) {
  next(
    crearError(
      404,
      "route_not_found",
      `La ruta '${req.originalUrl}' no existe en la API.`,
    ),
  );
}

export function manejarErrores(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (
    error?.type === "entity.parse.failed" ||
    (error?.status === 400 && "body" in error)
  ) {
    return res.status(400).json({
      error: "El cuerpo de la solicitud no tiene un formato JSON válido.",
      status: 400,
      code: "invalid_json",
    });
  }

  if (error?.type === "entity.too.large" || error?.status === 413) {
    return res.status(413).json({
      error: "El cuerpo de la solicitud supera el tamaño máximo permitido.",
      status: 413,
      code: "payload_too_large",
    });
  }

  const codigoEstado = Number(error?.status);
  const status =
    codigoEstado >= 400 && codigoEstado < 600 && codigoEstado % 1 === 0
      ? codigoEstado
      : 500;

  if (status >= 500) {
    console.error(error);
  }

  return res.status(status).json({
    error:
      status === 500 && !error?.status
        ? "Ocurrió un error interno del servidor."
        : error?.message || "Ocurrió un error al procesar la solicitud.",
    status,
    code:
      error?.code || (status === 500 ? "internal_error" : "application_error"),
  });
}
