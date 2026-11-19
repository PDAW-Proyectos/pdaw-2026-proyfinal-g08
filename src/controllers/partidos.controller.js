import { crearError } from "../utils/errores.js";

function validarQueryPartidos(query = {}) {
  if (
    query.limite !== undefined &&
    !/^\d+$/.test(String(query.limite).trim())
  ) {
    throw crearError(
      400,
      "invalid_limit",
      "El parámetro 'limite' debe ser un número entero no negativo.",
    );
  }
  if (
    query.tipo !== undefined &&
    !["proximos", "jugados"].includes(String(query.tipo))
  ) {
    throw crearError(
      400,
      "invalid_type",
      "El parámetro 'tipo' debe ser 'proximos' o 'jugados'.",
    );
  }
  return query;
}

export function crearPartidosController(partidosService) {
  return {
    listar(req, res, next) {
      try {
        res
          .status(200)
          .json(partidosService.listar(validarQueryPartidos(req.query)));
      } catch (error) {
        next(error);
      }
    },

    obtenerProximos(req, res, next) {
      try {
        res
          .status(200)
          .json(
            partidosService.obtenerProximos(validarQueryPartidos(req.query)),
          );
      } catch (error) {
        next(error);
      }
    },

    obtenerJugados(req, res, next) {
      try {
        res
          .status(200)
          .json(
            partidosService.obtenerJugados(validarQueryPartidos(req.query)),
          );
      } catch (error) {
        next(error);
      }
    },

    obtenerPorId(req, res, next) {
      try {
        if (!req.params.id || !String(req.params.id).trim()) {
          throw crearError(
            400,
            "invalid_match_id",
            "Debés indicar un ID de partido válido.",
          );
        }
        res.status(200).json(partidosService.obtenerPorId(req.params.id));
      } catch (error) {
        next(error);
      }
    },
  };
}
