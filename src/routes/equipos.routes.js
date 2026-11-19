import { Router } from "express";
import { crearEquiposController } from "../controllers/equipos.controller.js";

export function crearRouterEquipos(equiposService) {
  const router = Router();
  const controller = crearEquiposController(equiposService);

  router.get("/", controller.listar);
  router.get("/buscar", controller.buscar);
  router.get("/:id", controller.obtenerDetalle);
  router.get("/:id/partidos", controller.obtenerPartidos);

  return router;
}

export default crearRouterEquipos;
