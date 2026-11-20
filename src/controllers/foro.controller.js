export function crearForoController(foroService) {
  return {
    listarPublicaciones(req, res, next) {
      try {
        res.status(200).json(foroService.listarPublicaciones());
      } catch (error) {
        next(error);
      }
    },

    async crearPublicacion(req, res, next) {
      try {
        const resultado = await foroService.crearPublicacion(
          req.user,
          req.body || {},
        );
        res.status(201).json(resultado);
      } catch (error) {
        next(error);
      }
    },

    async editarPublicacion(req, res, next) {
      try {
        const resultado = await foroService.editarPublicacion(
          req.params.id,
          req.body || {},
        );
        res.status(200).json(resultado);
      } catch (error) {
        next(error);
      }
    },

    listarComentarios(req, res, next) {
      try {
        res
          .status(200)
          .json(foroService.listarComentarios(req.params.id));
      } catch (error) {
        next(error);
      }
    },

    async crearComentario(req, res, next) {
      try {
        const resultado = await foroService.crearComentario(
          req.user,
          req.params.id,
          req.body || {},
        );
        res.status(201).json(resultado);
      } catch (error) {
        next(error);
      }
    },

    async borrarPublicacion(req, res, next) {
      try {
        await foroService.borrarPublicacion(req.params.id);
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    },

    async borrarComentario(req, res, next) {
      try {
        await foroService.borrarComentario(req.params.id);
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  };
}

export default crearForoController;
