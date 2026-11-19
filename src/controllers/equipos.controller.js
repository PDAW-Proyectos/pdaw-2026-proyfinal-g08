import { crearError } from "../utils/errores.js";

export function crearEquiposController(equiposService) {
  const validarId = (id) => {
    if (!id || !String(id).trim()) {
      throw crearError(
        400,
        "invalid_team_id",
        "Debés indicar un identificador de equipo válido.",
      );
    }
    return String(id).trim();
  };

  return {
    listar(req, res, next) {
      try {
        res.status(200).json(equiposService.listar(req.query));
      } catch (error) {
        next(error);
      }
    },

    async buscar(req, res, next) {
      try {
        const consulta = String(req.query.q ?? "").trim();
        if (!consulta) {
          throw crearError(
            400,
            "missing_query",
            "Ingresá un término de búsqueda en el parámetro 'q'.",
          );
        }
        const resultados = await equiposService.buscar(consulta);
        res.status(200).json(resultados);
      } catch (error) {
        next(error);
      }
    },

    async obtenerDetalle(req, res, next) {
      try {
        const detalle = await equiposService.obtenerDetalleCompleto(
          validarId(req.params.id),
        );
        res.status(200).json(detalle);
      } catch (error) {
        next(error);
      }
    },

    async obtenerPartidos(req, res, next) {
      try {
        const partidos = await equiposService.obtenerPartidosEquipo(
          validarId(req.params.id),
        );
        res.status(200).json(partidos);
      } catch (error) {
        next(error);
      }
    },
  };
}
