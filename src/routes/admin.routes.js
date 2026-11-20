import { Router } from "express";
import { crearAdminController } from "../controllers/admin.controller.js";
import { requerirAdministrador } from "../middlewares/auth.middleware.js";

export function crearRouterAdmin(adminService) {
  const router = Router();
  const controller = crearAdminController(adminService);

  router.use(requerirAdministrador);
  router.get("/posts", controller.listarPublicaciones);
  router.get("/users", controller.listarUsuarios);
  router.get("/settings", controller.obtenerConfiguracion);
  router.patch("/settings/session-timeout", controller.actualizarTiempoSesion);
  router.patch("/users/:id/status", controller.cambiarEstadoUsuario);
  router.delete("/users/:id", controller.eliminarUsuario);

  return router;
}

export default crearRouterAdmin;
