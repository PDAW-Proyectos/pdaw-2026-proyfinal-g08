import { Router } from "express";
import { crearAuthController } from "../controllers/auth.controller.js";
import { requerirAutenticacion } from "../middlewares/auth.middleware.js";

export function crearRouterAuth(authService, opciones = {}) {
  const router = Router();
  const controller = crearAuthController(authService, opciones);

  router.post("/register", controller.registrar);
  router.post("/login", controller.iniciarSesion);
  router.get("/me", requerirAutenticacion, controller.obtenerPerfil);
  router.post("/logout", requerirAutenticacion, controller.cerrarSesion);

  return router;
}

export default crearRouterAuth;
