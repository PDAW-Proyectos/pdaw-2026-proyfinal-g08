import { Router } from "express";
import { exponerLiga } from "../Futbol/formatos.js";

export function crearRouterLigas(repositorio) {
  const router = Router();

  router.get("/", (req, res) => {
    try {
      const ligas = repositorio.listarLigas();
      res.status(200).json(ligas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/:id", (req, res) => {
    try {
      const id = req.params.id;
      const liga = repositorio.buscarLiga(id);
      res.status(200).json(exponerLiga(liga));
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  return router;
}

export default crearRouterLigas;
