import { crearError } from "../utils/errores.js";

export function crearLigasController(ligasService) {
  const validarId = (id) => {
    if (!id || !String(id).trim()) {
      throw crearError(
        400,
        "invalid_league_id",
        "Debés indicar un identificador de liga válido.",
      );
    }
    return String(id).trim();
  };

  return {
    listar(req, res, next) {
      try {
        res.status(200).json(ligasService.listar());
      } catch (error) {
        next(error);
      }
    },

    async obtenerDetalle(req, res, next) {
      try {
        const liga = await ligasService.obtenerDetalle(
          validarId(req.params.id),
        );
        res.status(200).json(liga);
      } catch (error) {
        next(error);
      }
    },

    obtenerPartidos(req, res, next) {
      try {
        const partidos = ligasService.obtenerPartidos(validarId(req.params.id));
        res.status(200).json(partidos);
      } catch (error) {
        next(error);
      }
    },
  };
}
