import { Router } from "express";
import { crearLigasController } from "../controllers/ligas.controller.js";

export function crearRouterLigas(ligasService) {
  const router = Router();
  const controller = crearLigasController(ligasService);

  router.get("/", controller.listar);
  router.get("/:id", controller.obtenerDetalle);
  router.get("/:id/partidos", controller.obtenerPartidos);

  return router;
}

export default crearRouterLigas;
