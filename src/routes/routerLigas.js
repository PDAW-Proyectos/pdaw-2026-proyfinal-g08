import { Router } from "express";

export default function crearRouterLigas(repositorio) {
  const router = Router();
  router.get("/", (req, res) => {
    res.status(200).json(repositorio.listar());
  });
  return router;
}