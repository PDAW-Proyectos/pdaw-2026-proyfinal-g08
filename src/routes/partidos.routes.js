import { Router } from "express";
import { crearPartidosController } from "../controllers/partidos.controller.js";

export function crearRouterPartidos(partidosService) {
  const router = Router();
  const controller = crearPartidosController(partidosService);

  router.get("/", controller.listar);
  router.get("/proximos", controller.obtenerProximos);
  router.get("/jugados", controller.obtenerJugados);
  router.get("/:id", controller.obtenerPorId);

  return router;
}

export default crearRouterPartidos;
