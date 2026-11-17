import { Router } from "express";
import { exponerLiga } from "../Futbol/formatos.js";

export function crearRouterLigas(
  repositorio,
  repositorioPartidos = null,
  servicioFutbol = null
) {
  const router = Router();

  router.get("/", (req, res) => {
    try {
      const ligas = repositorio.listarLigas();
      res.status(200).json(ligas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const liga = repositorio.buscarLiga(id);
      let errorTabla = null;

      if ((!Array.isArray(liga.tabla) || liga.tabla.length === 0) && servicioFutbol) {
        try {
          const tabla = await servicioFutbol.buscarTablaDeLiga(liga.id, {
            lanzarError: true,
            temporada: liga.temporada,
          });
          if (Array.isArray(tabla) && tabla.length > 0) {
            liga.tabla = tabla;
            servicioFutbol.guardarLigasLocal(repositorio.ligas);
          }
        } catch (errTabla) {
          errorTabla = errTabla.message;
        }
      }

      const respuesta = exponerLiga(liga);
      if (errorTabla && (!Array.isArray(respuesta.tabla) || respuesta.tabla.length === 0)) {
        respuesta.errorTabla = errorTabla;
      }
      res.status(200).json(respuesta);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  router.get("/:id/partidos", (req, res) => {
    try {
      const id = req.params.id;
      const liga = repositorio.buscarLiga(id);
      if (!repositorioPartidos) {
        return res.status(200).json({ proximos: [], jugados: [] });
      }
      const eventos = repositorioPartidos.obtenerEventosDeLiga(liga.id);
      res.status(200).json(eventos);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  return router;
}

export default crearRouterLigas;
