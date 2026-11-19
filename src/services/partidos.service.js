import { mapearPartidoAPI } from "../utils/apiMappers.js";

export class PartidosService {
  #partidosRepo;
  #apiFutbol;

  constructor({ partidosRepo, apiFutbol = null }) {
    this.#partidosRepo = partidosRepo;
    this.#apiFutbol = apiFutbol;
  }

  #resolverLimite(limite, todos, defecto = 10) {
    if (todos === "true" || todos === "1" || String(limite) === "0") return 0;
    return limite ? parseInt(limite, 10) : defecto;
  }

  listar({ tipo, limite, todos, liga } = {}) {
    const numLimite = this.#resolverLimite(limite, todos, 10);
    if (tipo === "proximos")
      return this.#partidosRepo.obtenerProximos(numLimite, liga);
    if (tipo === "jugados")
      return this.#partidosRepo.obtenerJugados(numLimite, liga);
    if (liga) return this.#partidosRepo.obtenerPorLiga(liga);
    return this.#partidosRepo.obtenerTodos();
  }

  obtenerProximos({ limite, todos, liga } = {}) {
    return this.#partidosRepo.obtenerProximos(
      this.#resolverLimite(limite, todos, 10),
      liga,
    );
  }

  obtenerJugados({ limite, todos, liga } = {}) {
    return this.#partidosRepo.obtenerJugados(
      this.#resolverLimite(limite, todos, 10),
      liga,
    );
  }

  obtenerPorId(id) {
    return this.#partidosRepo.obtenerPorId(id);
  }

  async buscarProximosEventosLiga(
    idLiga,
    {
      idsExistentes = new Set(),
      cantidadNuevaObjetivo = 1,
      fechaReferencia = new Date(),
    } = {},
  ) {
    if (!idLiga || !this.#apiFutbol) return [];

    const esNuevoValido = (p) =>
      Boolean(p?.id) &&
      !p.esJugado &&
      !p.yaPasoFecha(fechaReferencia) &&
      !idsExistentes.has(String(p.id));

    try {
      const cuerpo = await this.#apiFutbol.fetchJson("eventsnextleague.php", {
        id: String(idLiga),
      });
      const eventosCrudos = Array.isArray(cuerpo?.events) ? cuerpo.events : [];
      const partidos = eventosCrudos.map((e) => mapearPartidoAPI(e));

      const nuevosEncontrados = () => partidos.filter(esNuevoValido).length;

      if (partidos.length > 0 && nuevosEncontrados() < cantidadNuevaObjetivo) {
        const ref = partidos[0];
        if (ref.jornada && ref.temporada) {
          const ids = new Set(partidos.map((p) => String(p.id)));
          const numRonda = parseInt(ref.jornada, 10);
          const rondasAProbar = Number.isNaN(numRonda)
            ? [String(ref.jornada)]
            : [0, 1, 2, 3].map((offset) => String(numRonda + offset));

          let rondasVaciasSeguidas = 0;
          for (const ronda of rondasAProbar) {
            if (
              nuevosEncontrados() >= cantidadNuevaObjetivo ||
              rondasVaciasSeguidas >= 2
            )
              break;
            try {
              const cuerpoRonda = await this.#apiFutbol.fetchJson(
                "eventsround.php",
                {
                  id: String(idLiga),
                  r: ronda,
                  s: String(ref.temporada),
                },
              );
              const crudosRonda = Array.isArray(cuerpoRonda?.events)
                ? cuerpoRonda.events
                : [];
              if (crudosRonda.length === 0) {
                rondasVaciasSeguidas += 1;
                continue;
              }
              rondasVaciasSeguidas = 0;
              for (const ev of crudosRonda) {
                const p = mapearPartidoAPI(ev);
                if (p.id && !ids.has(String(p.id))) {
                  partidos.push(p);
                  ids.add(String(p.id));
                }
              }
            } catch (errRonda) {
              console.warn(
                `Aviso al consultar ronda ${ronda} de liga ${idLiga}:`,
                errRonda.message,
              );
            }
          }
        }
      }

      return partidos;
    } catch (error) {
      console.warn(
        `Aviso al buscar próximos eventos de liga ${idLiga}:`,
        error.message,
      );
      return [];
    }
  }

  async buscarEventoPorId(idEvento) {
    if (!idEvento || !this.#apiFutbol) return null;
    try {
      const cuerpo = await this.#apiFutbol.fetchJson("lookupevent.php", {
        id: String(idEvento),
      });
      const lista = Array.isArray(cuerpo?.events)
        ? cuerpo.events
        : Array.isArray(cuerpo?.results)
          ? cuerpo.results
          : [];
      return lista.length > 0 ? mapearPartidoAPI(lista[0]) : null;
    } catch (error) {
      console.warn(
        `Aviso al consultar evento ${idEvento} en API:`,
        error.message,
      );
      return null;
    }
  }

  async buscarProximosEventosEquipo(idEquipo) {
    if (!idEquipo || !this.#apiFutbol) return [];
    try {
      const cuerpo = await this.#apiFutbol.fetchJson("eventsnext.php", {
        id: String(idEquipo),
      });
      const lista = Array.isArray(cuerpo?.events) ? cuerpo.events : [];
      return lista.map((e) => mapearPartidoAPI(e));
    } catch (error) {
      console.warn(
        `Aviso al buscar próximos eventos para equipo ${idEquipo}:`,
        error.message,
      );
      return [];
    }
  }

  async buscarUltimosEventosEquipo(idEquipo) {
    if (!idEquipo || !this.#apiFutbol) return [];
    try {
      const cuerpo = await this.#apiFutbol.fetchJson("eventslast.php", {
        id: String(idEquipo),
      });
      const lista = Array.isArray(cuerpo?.results) ? cuerpo.results : [];
      return lista.map((e) => mapearPartidoAPI(e));
    } catch (error) {
      console.warn(
        `Aviso al buscar últimos eventos para equipo ${idEquipo}:`,
        error.message,
      );
      return [];
    }
  }
}

export default PartidosService;
