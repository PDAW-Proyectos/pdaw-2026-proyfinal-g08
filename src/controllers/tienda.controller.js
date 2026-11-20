export function crearTiendaController(tiendaService) {
  return {
    listarProductos(req, res, next) {
      try {
        res.status(200).json(tiendaService.listarProductos());
      } catch (error) {
        next(error);
      }
    },

    async agregarProducto(req, res, next) {
      try {
        const resultado = await tiendaService.agregarProducto(req.body || {});
        res.status(201).json(resultado);
      } catch (error) {
        next(error);
      }
    },

    async borrarProducto(req, res, next) {
      try {
        await tiendaService.borrarProducto(req.params.id);
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    },

    obtenerCarrito(req, res, next) {
      try {
        res.status(200).json(tiendaService.obtenerCarrito(req.user.id));
      } catch (error) {
        next(error);
      }
    },

    async agregarAlCarrito(req, res, next) {
      try {
        const resultado = await tiendaService.agregarAlCarrito(
          req.user.id,
          req.body || {},
        );
        res.status(201).json(resultado);
      } catch (error) {
        next(error);
      }
    },

    async actualizarCantidadCarrito(req, res, next) {
      try {
        const resultado = await tiendaService.actualizarCantidadCarrito(
          req.user.id,
          req.params.productId,
          req.body || {},
        );
        res.status(200).json(resultado);
      } catch (error) {
        next(error);
      }
    },

    async quitarDelCarrito(req, res, next) {
      try {
        await tiendaService.quitarDelCarrito(
          req.user.id,
          req.params.productId,
        );
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    },

    async vaciarCarrito(req, res, next) {
      try {
        await tiendaService.vaciarCarrito(req.user.id);
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    },

    async finalizarCompra(req, res, next) {
      try {
        const resultado = await tiendaService.finalizarCompra(req.user.id);
        res.status(201).json(resultado);
      } catch (error) {
        next(error);
      }
    },

    listarPedidos(req, res, next) {
      try {
        res.status(200).json(tiendaService.listarPedidos(req.user.id));
      } catch (error) {
        next(error);
      }
    },
  };
}

export default crearTiendaController;
