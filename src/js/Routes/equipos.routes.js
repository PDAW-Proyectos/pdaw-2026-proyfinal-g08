import { Router } from "express";

export function crearRouterEquipos(
  repositorioEquipos,
  repositorioLigas = null,
  repositorioPartidos = null,
  servicioFutbol = null
) {
  const router = Router();

  // Listar equipos con filtro opcional por búsqueda o liga
  router.get("/", (req, res) => {
    try {
      const { q, liga } = req.query;
      let equipos = repositorioEquipos.listarEquipos();

      if (liga) {
        equipos = equipos.filter((e) => String(e.idLiga) === String(liga));
      }

      if (q) {
        const queryNorm = String(q).toLowerCase().trim();
        equipos = equipos.filter((e) =>
          String(e.nombre || "").toLowerCase().includes(queryNorm)
        );
      }

      res.status(200).json(equipos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Buscar equipos por nombre (solo equipos de fútbol: local primero, API bajo demanda)
  router.get("/buscar", async (req, res) => {
    try {
      const consulta = String(req.query.q ?? "").trim();
      if (!consulta) {
        return res.status(200).json([]);
      }

      // 1. Buscar en equipos ya almacenados en repositorio/equipos.json
      const resultados = repositorioEquipos.buscarCoincidencias(consulta, 10);
      const idsIncluidos = new Set(resultados.map((e) => String(e.id || "")).filter(Boolean));
      const nombresIncluidos = new Set(
        resultados.map((e) => String(e.nombre || "").toLowerCase().trim()).filter(Boolean)
      );

      // 2. Complementar con equipos de tablas de ligas ya cargadas en memoria
      if (repositorioLigas) {
        const qNorm = consulta
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");

        for (const liga of repositorioLigas.ligas || []) {
          for (const pos of liga.tabla || []) {
            const nom = String(pos.nombreEquipo || "");
            const nomNorm = nom
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "");
            if (!nomNorm || !nomNorm.includes(qNorm)) continue;

            const idStr = String(pos.idEquipo || "");
            const nomKey = nom.toLowerCase().trim();
            if ((idStr && idsIncluidos.has(idStr)) || nombresIncluidos.has(nomKey)) continue;

            const nuevo = repositorioEquipos.agregarEquipo({
              id: idStr,
              nombre: nom,
              escudo: pos.escudoEquipo,
              idLiga: liga.id,
              nombreLiga: liga.nombre,
              pais: liga.pais,
            });
            if (nuevo) {
              resultados.push(nuevo.toJSON ? nuevo.toJSON() : nuevo);
              if (idStr) idsIncluidos.add(idStr);
              nombresIncluidos.add(nomKey);
            }
          }
        }
      }

      // 3. Si no hay coincidencias locales suficientes y hay >= 3 caracteres, consultar searchteams.php
      if (resultados.length === 0 && consulta.length >= 3 && servicioFutbol) {
        const remotos = await servicioFutbol.buscarEquiposPorNombre(consulta);
        for (const eq of remotos) {
          const serializado = eq.toJSON ? eq.toJSON() : eq;
          const idStr = String(serializado.id || "");
          const nomKey = String(serializado.nombre || "").toLowerCase().trim();
          if ((idStr && idsIncluidos.has(idStr)) || (nomKey && nombresIncluidos.has(nomKey))) {
            continue;
          }
          repositorioEquipos.agregarEquipo(eq);
          resultados.push(serializado);
          if (idStr) idsIncluidos.add(idStr);
          if (nomKey) nombresIncluidos.add(nomKey);
        }
      }

      res.status(200).json(resultados.slice(0, 10));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Obtener detalle completo de un equipo (con posición, liga, último y próximo partido)
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const detalle = await repositorioEquipos.obtenerDetalleCompleto(id, {
        repositorioLigas,
        repositorioPartidos,
        servicioFutbol,
      });
      res.status(200).json(detalle);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  // Obtener próximos y jugados de un equipo específico
  router.get("/:id/partidos", async (req, res) => {
    try {
      const { id } = req.params;
      const idEq = String(id);

      if (!repositorioPartidos) {
        return res.status(200).json({ proximos: [], jugados: [] });
      }

      let partidos = repositorioPartidos.partidos.filter(
        (p) => String(p.idEquipoLocal) === idEq || String(p.idEquipoVisitante) === idEq
      );

      const faltanProximos = !partidos.some((p) => p.esProximo);
      const faltanJugados = !partidos.some((p) => p.esJugado);

      if ((faltanProximos || faltanJugados) && servicioFutbol && /^\d+$/.test(idEq)) {
        const completarEscudosLocales = (lista = []) => {
          if (typeof servicioFutbol.resolverEscudoEquipoLocal !== "function") return;
          for (const p of lista) {
            if (!p.escudoEquipoLocal) {
              const escL = servicioFutbol.resolverEscudoEquipoLocal(
                p.idEquipoLocal,
                p.nombreEquipoLocal,
                { repositorioEquipos, repositorioLigas }
              );
              if (escL) p.escudoEquipoLocal = escL;
            }
            if (!p.escudoEquipoVisitante) {
              const escV = servicioFutbol.resolverEscudoEquipoLocal(
                p.idEquipoVisitante,
                p.nombreEquipoVisitante,
                { repositorioEquipos, repositorioLigas }
              );
              if (escV) p.escudoEquipoVisitante = escV;
            }
          }
        };

        try {
          if (faltanProximos) {
            const prox = await servicioFutbol.buscarProximosEventosEquipo(idEq);
            if (Array.isArray(prox) && prox.length > 0) {
              completarEscudosLocales(prox);
              repositorioPartidos.agregarPartidos(prox);
              if (typeof servicioFutbol.anexarProximosPartidosLocal === "function") {
                servicioFutbol.anexarProximosPartidosLocal(prox);
              }
            }
          }
          if (faltanJugados) {
            const ult = await servicioFutbol.buscarUltimosEventosEquipo(idEq);
            if (Array.isArray(ult) && ult.length > 0) {
              completarEscudosLocales(ult);
              repositorioPartidos.agregarPartidos(ult);
              if (typeof servicioFutbol.anexarPartidosJugadosLocal === "function") {
                servicioFutbol.anexarPartidosJugadosLocal(ult);
              }
            }
          }
          partidos = repositorioPartidos.partidos.filter(
            (p) => String(p.idEquipoLocal) === idEq || String(p.idEquipoVisitante) === idEq
          );
        } catch (err) {
          console.warn(`Aviso al buscar partidos para equipo ${idEq}:`, err.message);
        }
      }

      const proximos = partidos
        .filter((p) => p.esProximo)
        .sort((a, b) => {
          const ta = new Date(a.timestamp || `${a.fecha}T${a.hora || "00:00:00"}`).getTime();
          const tb = new Date(b.timestamp || `${b.fecha}T${b.hora || "00:00:00"}`).getTime();
          return (isNaN(ta) ? 0 : ta) - (isNaN(tb) ? 0 : tb);
        });

      const jugados = partidos
        .filter((p) => p.esJugado)
        .sort((a, b) => {
          const ta = new Date(a.timestamp || `${a.fecha}T${a.hora || "00:00:00"}`).getTime();
          const tb = new Date(b.timestamp || `${b.fecha}T${b.hora || "00:00:00"}`).getTime();
          return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
        });

      res.status(200).json({
        proximos,
        jugados,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export default crearRouterEquipos;
