import { Router } from "express";
import { crearForoController } from "../controllers/foro.controller.js";
import {
  requerirAdministrador,
  requerirAutenticacion,
} from "../middlewares/auth.middleware.js";

export function crearRouterForo(foroService) {
  const router = Router();
  const controller = crearForoController(foroService);

  router.get("/posts", controller.listarPublicaciones);
  router.post("/posts", requerirAutenticacion, controller.crearPublicacion);
  router.patch(
    "/posts/:id",
    requerirAdministrador,
    controller.editarPublicacion,
  );
  router.get("/posts/:id/comments", controller.listarComentarios);
  router.post(
    "/posts/:id/comments",
    requerirAutenticacion,
    controller.crearComentario,
  );
  router.delete("/posts/:id", requerirAdministrador, controller.borrarPublicacion);
  router.delete(
    "/comments/:id",
    requerirAdministrador,
    controller.borrarComentario,
  );

  return router;
}

export default crearRouterForo;
