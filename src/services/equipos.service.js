import { Equipo } from "../models/Equipo.js";
import { normalizarTexto } from "../utils/texto.js";
import { compararFechaAsc, compararFechaDesc } from "../utils/fechas.js";
import { mapearEquipoAPI } from "../utils/apiMappers.js";
import { crearError } from "../utils/errores.js";

export class EquiposService {
  #equiposRepo;
  #ligasRepo;
  #partidosRepo;
  #partidosService;
  #apiFutbol;

  constructor({
    equiposRepo,
    ligasRepo = null,
    partidosRepo = null,
    partidosService = null,
    apiFutbol = null,
  }) {
    this.#equiposRepo = equiposRepo;
    this.#ligasRepo = ligasRepo;
    this.#partidosRepo = partidosRepo;
    this.#partidosService = partidosService;
    this.#apiFutbol = apiFutbol;
  }

  listar({ q, liga } = {}) {
    let equipos = this.#equiposRepo.listar();
    if (liga) {
      equipos = equipos.filter((e) => String(e.idLiga) === String(liga));
    }
    if (q) {
      const qNorm = String(q).toLowerCase().trim();
      equipos = equipos.filter((e) =>
        String(e.nombre || "")
          .toLowerCase()
          .includes(qNorm),
      );
    }
    return equipos;
  }

  async buscar(consultaTexto) {
    const consulta = String(consultaTexto ?? "").trim();
    if (!consulta) return [];

    // 1. Caché local de equipos
    const resultados = this.#equiposRepo.buscarCoincidencias(consulta, 10);
    const ids = new Set(
      resultados.map((e) => String(e.id || "")).filter(Boolean),
    );
    const nombres = new Set(
      resultados
        .map((e) =>
          String(e.nombre || "")
            .toLowerCase()
            .trim(),
        )
        .filter(Boolean),
    );

    const registrar = (eq) => {
      const json = new Equipo(eq).toJSON();
      const idStr = String(json.id || "");
      const nomKey = String(json.nombre || "")
        .toLowerCase()
        .trim();
      if ((idStr && ids.has(idStr)) || (nomKey && nombres.has(nomKey))) return;
      resultados.push(json);
      if (idStr) ids.add(idStr);
      if (nomKey) nombres.add(nomKey);
    };

    // 2. Tablas de ligas cargadas en memoria
    if (this.#ligasRepo) {
      const qNorm = normalizarTexto(consulta);
      for (const liga of this.#ligasRepo.ligas) {
        for (const pos of liga.tabla) {
          if (!normalizarTexto(pos.nombreEquipo).includes(qNorm)) continue;
          const nuevo = this.#equiposRepo.agregar({
            id: pos.idEquipo,
            nombre: pos.nombreEquipo,
            escudo: pos.escudoEquipo,
            idLiga: liga.id,
            nombreLiga: liga.nombre,
            pais: liga.pais,
          });
          if (nuevo) registrar(nuevo);
        }
      }
    }

    // 3. Búsqueda remota bajo demanda solo para fútbol (>= 3 caracteres)
    if (resultados.length === 0 && consulta.length >= 3 && this.#apiFutbol) {
      const remotos = await this.buscarEquiposPorNombre(consulta, {
        propagarError: true,
      });
      remotos.forEach(registrar);
    }

    return resultados.slice(0, 10);
  }

  async buscarEquipoPorId(idEquipo, { propagarError = false } = {}) {
    if (!idEquipo) return null;
    const clave = String(idEquipo);
    const local = this.#equiposRepo.obtener(clave);
    if (local) return local;
    if (!this.#apiFutbol) return null;

    try {
      const cuerpo = await this.#apiFutbol.fetchJson("lookupteam.php", {
        id: clave,
      });
      const equipos = Array.isArray(cuerpo?.teams) ? cuerpo.teams : [];
      if (equipos.length === 0) return null;
      const equipo = mapearEquipoAPI(equipos[0]);
      this.#equiposRepo.agregar(equipo);
      this.#equiposRepo.anexarLocal(equipo);
      return equipo;
    } catch (error) {
      if (propagarError) throw error;
      console.warn(`Aviso al buscar equipo por ID ${idEquipo}:`, error.message);
      return null;
    }
  }

  async buscarEquiposPorNombre(nombreEquipo, { propagarError = false } = {}) {
    const termino = String(nombreEquipo ?? "").trim();
    if (!termino || !this.#apiFutbol) return [];

    try {
      const cuerpo = await this.#apiFutbol.fetchJson("searchteams.php", {
        t: termino,
      });
      const crudos = Array.isArray(cuerpo?.teams) ? cuerpo.teams : [];
      const formateados = crudos
        .filter(
          (t) => !t.strSport || String(t.strSport).toLowerCase() === "soccer",
        )
        .map((t) => mapearEquipoAPI(t));

      if (formateados.length > 0) {
        this.#equiposRepo.agregarVarios(formateados);
        this.#equiposRepo.anexarLocal(formateados);
      }
      return formateados;
    } catch (error) {
      if (propagarError) throw error;
      console.warn(
        `Aviso al buscar equipos por nombre ${nombreEquipo}:`,
        error.message,
      );
      return [];
    }
  }

  async buscarEquipoPorNombre(nombreEquipo) {
    if (!nombreEquipo) return null;
    const local = this.#equiposRepo.obtener(nombreEquipo);
    if (local) return local;
    const encontrados = await this.buscarEquiposPorNombre(nombreEquipo);
    return encontrados[0] || null;
  }

  resolverEscudoLocal(idEquipo, nombreEquipo) {
    const idStr = idEquipo ? String(idEquipo) : "";
    const nom = normalizarTexto(nombreEquipo);

    const eq = this.#equiposRepo.obtener(idStr || nombreEquipo);
    if (eq?.escudo) return eq.escudo;

    if (this.#ligasRepo) {
      for (const liga of this.#ligasRepo.ligas) {
        for (const pos of liga.tabla) {
          if (idStr && String(pos.idEquipo) === idStr && pos.escudoEquipo) {
            return pos.escudoEquipo;
          }
          if (
            nom &&
            normalizarTexto(pos.nombreEquipo) === nom &&
            pos.escudoEquipo
          ) {
            return pos.escudoEquipo;
          }
        }
      }
    }
    return "";
  }

  completarEscudosPartidos(partidos = []) {
    for (const p of partidos) {
      if (!p.escudoEquipoLocal) {
        const esc = this.resolverEscudoLocal(
          p.idEquipoLocal,
          p.nombreEquipoLocal,
        );
        if (esc) p.escudoEquipoLocal = esc;
      }
      if (!p.escudoEquipoVisitante) {
        const esc = this.resolverEscudoLocal(
          p.idEquipoVisitante,
          p.nombreEquipoVisitante,
        );
        if (esc) p.escudoEquipoVisitante = esc;
      }
    }
  }

  async #cargarPartidosFaltantes(idEq, { faltanProximos, faltanJugados }) {
    if (!this.#partidosService || !/^\d+$/.test(idEq)) return;

    if (faltanProximos) {
      const prox =
        await this.#partidosService.buscarProximosEventosEquipo(idEq);
      if (prox.length > 0) {
        this.completarEscudosPartidos(prox);
        this.#partidosRepo.agregarVarios(prox);
        this.#partidosRepo.anexarProximosLocal(prox);
      }
    }
    if (faltanJugados) {
      const ult = await this.#partidosService.buscarUltimosEventosEquipo(idEq);
      if (ult.length > 0) {
        this.completarEscudosPartidos(ult);
        this.#partidosRepo.agregarVarios(ult);
        this.#partidosRepo.anexarJugadosLocal(ult);
      }
    }
  }

  async obtenerDetalleCompleto(id) {
    let equipo = this.#equiposRepo.obtener(id);
    if (!equipo) {
      equipo = /^\d+$/.test(String(id))
        ? await this.buscarEquipoPorId(id, { propagarError: true })
        : await this.buscarEquipoPorNombre(id);
    }
    if (!equipo) {
      throw crearError(404, "team_not_found", `El equipo '${id}' no existe.`);
    }

    const detalle = new Equipo(equipo);

    if (this.#ligasRepo) {
      const nomNorm = normalizarTexto(equipo.nombre);
      for (const liga of this.#ligasRepo.ligas) {
        const pos = liga.tabla.find(
          (p) =>
            (p.idEquipo && String(p.idEquipo) === String(equipo.id)) ||
            normalizarTexto(p.nombreEquipo) === nomNorm,
        );
        if (pos) {
          detalle.liga = {
            id: liga.id,
            nombre: liga.nombre,
            pais: liga.pais,
            escudo: liga.escudo,
            temporada: liga.temporada,
          };
          detalle.idLiga = liga.id;
          detalle.nombreLiga = liga.nombre;
          detalle.posicion = {
            posicion: pos.posicion,
            puntos: pos.puntos,
            partidosJugados: pos.partidosJugados,
            victorias: pos.victorias,
            empates: pos.empates,
            derrotas: pos.derrotas,
            golesFavor: pos.golesFavor,
            golesContra: pos.golesContra,
            diferenciaGol: pos.diferenciaGol,
            racha: pos.racha,
          };
          if (!detalle.escudo && pos.escudoEquipo) {
            detalle.escudo = pos.escudoEquipo;
            equipo.escudo = pos.escudoEquipo;
          }
          break;
        }
      }

      if (!detalle.liga && detalle.idLiga) {
        try {
          const ligaObj = this.#ligasRepo.buscar(detalle.idLiga);
          detalle.liga = {
            id: ligaObj.id,
            nombre: ligaObj.nombre,
            pais: ligaObj.pais,
            escudo: ligaObj.escudo,
            temporada: ligaObj.temporada,
          };
        } catch {
          // Liga fuera de las 5 monitoreadas
        }
      }
    }

    if (this.#partidosRepo) {
      const { proximos, jugados } = await this.#resolverPartidosEquipo(
        String(equipo.id),
        normalizarTexto(equipo.nombre),
      );
      if (proximos.length > 0) detalle.proximoPartido = proximos[0];
      if (jugados.length > 0) detalle.ultimoPartido = jugados[0];
    }

    return detalle.toJSON();
  }

  async obtenerPartidosEquipo(id) {
    if (!this.#partidosRepo) return { proximos: [], jugados: [] };
    const equipo = this.#equiposRepo.obtener(id);
    const partidosLocales = this.#partidosRepo.obtenerPorEquipo(String(id));
    if (!equipo && partidosLocales.length === 0) {
      const remoto = /^\d+$/.test(String(id))
        ? await this.buscarEquipoPorId(id, { propagarError: true })
        : null;
      if (!remoto) {
        throw crearError(404, "team_not_found", `El equipo '${id}' no existe.`);
      }
    }
    const { proximos, jugados } = await this.#resolverPartidosEquipo(
      String(id),
    );
    return {
      proximos: proximos.map((p) => p.toJSON()),
      jugados: jugados.map((p) => p.toJSON()),
    };
  }

  async #resolverPartidosEquipo(idEq, nombreNorm = "") {
    let partidos = this.#partidosRepo.obtenerPorEquipo(idEq, nombreNorm);
    const faltanProximos = !partidos.some((p) => p.esProximo);
    const faltanJugados = !partidos.some((p) => p.esJugado);

    if (faltanProximos || faltanJugados) {
      await this.#cargarPartidosFaltantes(idEq, {
        faltanProximos,
        faltanJugados,
      });
      partidos = this.#partidosRepo.obtenerPorEquipo(idEq, nombreNorm);
    }

    return {
      proximos: partidos.filter((p) => p.esProximo).sort(compararFechaAsc),
      jugados: partidos.filter((p) => p.esJugado).sort(compararFechaDesc),
    };
  }
}

export default EquiposService;
