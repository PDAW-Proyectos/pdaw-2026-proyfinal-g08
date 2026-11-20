export function crearAdminController(adminService) {
  return {
    listarPublicaciones(req, res, next) {
      try {
        res.status(200).json(adminService.listarPublicaciones());
      } catch (error) {
        next(error);
      }
    },

    listarUsuarios(req, res, next) {
      try {
        res.status(200).json(adminService.listarUsuarios());
      } catch (error) {
        next(error);
      }
    },

    obtenerConfiguracion(req, res, next) {
      try {
        res.status(200).json(adminService.obtenerConfiguracion());
      } catch (error) {
        next(error);
      }
    },

    async actualizarTiempoSesion(req, res, next) {
      try {
        const resultado = await adminService.actualizarTiempoSesion(
          req.body?.minutes,
        );
        res.status(200).json(resultado);
      } catch (error) {
        next(error);
      }
    },

    async cambiarEstadoUsuario(req, res, next) {
      try {
        const resultado = await adminService.cambiarEstadoUsuario(
          req.params.id,
          req.body?.status,
        );
        res.status(200).json(resultado);
      } catch (error) {
        next(error);
      }
    },

    async eliminarUsuario(req, res, next) {
      try {
        const resultado = await adminService.eliminarUsuario(req.params.id);
        res.status(200).json(resultado);
      } catch (error) {
        next(error);
      }
    },
  };
}

export default crearAdminController;
