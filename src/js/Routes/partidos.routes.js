import { Router } from "express";

export function crearRouterPartidos(repositorioPartidos) {
  const router = Router();

  // Obtener partidos con filtros opcionales (tipo=proximos|jugados, limite=10|0, todos=true, liga=4328)
  router.get("/", (req, res) => {
    try {
      const { tipo, limite, todos, liga } = req.query;
      const sinLimite =
        todos === "true" || todos === "1" || String(limite) === "0";
      const numLimite = sinLimite
        ? 0
        : limite
          ? parseInt(limite, 10)
          : 10;

      if (tipo === "proximos") {
        return res.status(200).json(repositorioPartidos.obtenerProximos(numLimite, liga));
      }
      if (tipo === "jugados") {
        return res.status(200).json(repositorioPartidos.obtenerJugados(numLimite, liga));
      }
      if (liga) {
        return res.status(200).json(repositorioPartidos.obtenerPorLiga(liga));
      }

      res.status(200).json(repositorioPartidos.obtenerTodos());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ruta específica para próximos partidos destacados
  router.get("/proximos", (req, res) => {
    try {
      const { limite, todos, liga } = req.query;
      const sinLimite =
        todos === "true" || todos === "1" || String(limite) === "0";
      const numLimite = sinLimite
        ? 0
        : limite
          ? parseInt(limite, 10)
          : 10;
      res.status(200).json(repositorioPartidos.obtenerProximos(numLimite, liga));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ruta específica para partidos jugados (resultados recientes)
  router.get("/jugados", (req, res) => {
    try {
      const { limite, liga } = req.query;
      const numLimite = limite ? parseInt(limite, 10) : 10;
      res.status(200).json(repositorioPartidos.obtenerJugados(numLimite, liga));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ruta para obtener un partido por su ID
  router.get("/:id", (req, res) => {
    try {
      const { id } = req.params;
      const partido = repositorioPartidos.obtenerPorId(id);
      res.status(200).json(partido);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  return router;
}

export default crearRouterPartidos;
