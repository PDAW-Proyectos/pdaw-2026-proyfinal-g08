import { Router } from "express";
import { crearTiendaController } from "../controllers/tienda.controller.js";
import {
  requerirAdministrador,
  requerirAutenticacion,
} from "../middlewares/auth.middleware.js";

export function crearRouterTienda(tiendaService) {
  const router = Router();
  const controller = crearTiendaController(tiendaService);

  router.get("/products", controller.listarProductos);
  router.post("/products", requerirAdministrador, controller.agregarProducto);
  router.delete("/products/:id", requerirAdministrador, controller.borrarProducto);

  router.get("/cart", requerirAutenticacion, controller.obtenerCarrito);
  router.post("/cart/items", requerirAutenticacion, controller.agregarAlCarrito);
  router.patch(
    "/cart/items/:productId",
    requerirAutenticacion,
    controller.actualizarCantidadCarrito,
  );
  router.delete(
    "/cart/items/:productId",
    requerirAutenticacion,
    controller.quitarDelCarrito,
  );
  router.delete("/cart", requerirAutenticacion, controller.vaciarCarrito);
  router.post(
    "/cart/checkout",
    requerirAutenticacion,
    controller.finalizarCompra,
  );
  router.get("/orders", requerirAutenticacion, controller.listarPedidos);

  return router;
}

export default crearRouterTienda;
