export function crearUsuariosController(usuariosService) {
  return {
    obtenerPerfilPublico(req, res, next) {
      try {
        const resultado = usuariosService.obtenerPerfilPublico(req.params.id);
        res.status(200).json(resultado);
      } catch (error) {
        next(error);
      }
    },

    obtenerPerfilPropio(req, res, next) {
      try {
        const resultado = usuariosService.obtenerPerfilPropio(req.user);
        res.status(200).json(resultado);
      } catch (error) {
        next(error);
      }
    },
  };
}

export default crearUsuariosController;
