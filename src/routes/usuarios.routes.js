import { Router } from "express";
import { crearUsuariosController } from "../controllers/usuarios.controller.js";
import { requerirAutenticacion } from "../middlewares/auth.middleware.js";

export function crearRouterUsuarios(usuariosService) {
  const router = Router();
  const controller = crearUsuariosController(usuariosService);

  router.get("/users/:id", controller.obtenerPerfilPublico);
  router.get("/me/profile", requerirAutenticacion, controller.obtenerPerfilPropio);

  return router;
}

export default crearRouterUsuarios;
