import { formatearPartidoAPI, exponerPartido } from "./formatos.js";

export class ServicioPartidos {
  #clienteApi;
  #rutaProximos;
  #rutaJugados;

  constructor(clienteApi, rutas = {}) {
    this.#clienteApi = clienteApi;
    this.#rutaProximos = rutas.rutaProximos ?? "./data/proximos_partidos.json";
    this.#rutaJugados = rutas.rutaJugados ?? "./data/partidos_jugados.json";
  }

  get rutaProximos() {
    return this.#rutaProximos;
  }
  set rutaProximos(ruta) {
    this.#rutaProximos = ruta;
  }

  get rutaJugados() {
    return this.#rutaJugados;
  }
  set rutaJugados(ruta) {
    this.#rutaJugados = ruta;
  }

  cargarProximosPartidosLocal() {
    const raw = this.#clienteApi.leerJson(this.#rutaProximos, []);
    if (!Array.isArray(raw)) return [];
    return raw.map((p) => formatearPartidoAPI(p));
  }

  sobrescribirProximosPartidosLocal(partidos = []) {
    const serializados = partidos.map((p) => exponerPartido(p));
    this.#clienteApi.escribirJson(this.#rutaProximos, serializados);
  }

  anexarProximosPartidosLocal(
    nuevosPartidos = [],
    fechaReferencia = new Date(),
  ) {
    if (!Array.isArray(nuevosPartidos) || nuevosPartidos.length === 0) return;
    const existentesRaw = this.#clienteApi.leerJson(this.#rutaProximos, []);
    const existentes = Array.isArray(existentesRaw) ? [...existentesRaw] : [];
    const idsExistentes = new Set(
      existentes.map((p) => String(p.id ?? p.idEvent ?? "")).filter(Boolean),
    );

    let huboCambios = false;
    for (const partido of nuevosPartidos) {
      if (!partido) continue;
      const partidoObj = formatearPartidoAPI(partido);
      const idStr = String(partidoObj.id ?? "");
      if (!idStr || idsExistentes.has(idStr)) continue;
      if (partidoObj.esJugado || partidoObj.yaPasoFecha(fechaReferencia))
        continue;

      existentes.push(exponerPartido(partidoObj));
      idsExistentes.add(idStr);
      huboCambios = true;
    }

    if (huboCambios || !this.#clienteApi.existeArchivo(this.#rutaProximos)) {
      existentes.sort((a, b) => {
        const ta = new Date(
          a.timestamp || `${a.fecha}T${a.hora || "00:00:00"}`,
        ).getTime();
        const tb = new Date(
          b.timestamp || `${b.fecha}T${b.hora || "00:00:00"}`,
        ).getTime();
        return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
      });
      this.#clienteApi.escribirJson(this.#rutaProximos, existentes);
    }
  }

  cargarPartidosJugadosLocal() {
    const raw = this.#clienteApi.leerJson(this.#rutaJugados, []);
    if (!Array.isArray(raw)) return [];
    return raw.map((p) => formatearPartidoAPI(p));
  }

  anexarPartidosJugadosLocal(nuevosPartidos = []) {
    if (!Array.isArray(nuevosPartidos) || nuevosPartidos.length === 0) return;
    const existentesRaw = this.#clienteApi.leerJson(this.#rutaJugados, []);
    const existentes = Array.isArray(existentesRaw) ? [...existentesRaw] : [];
    const idsExistentes = new Set(
      existentes.map((p) => String(p.id ?? p.idEvent ?? "")).filter(Boolean),
    );

    let huboCambios = false;
    for (const partido of nuevosPartidos) {
      if (!partido) continue;
      const serializado = exponerPartido(formatearPartidoAPI(partido));
      const idStr = String(serializado?.id ?? "");
      if (idStr && !idsExistentes.has(idStr)) {
        existentes.push(serializado);
        idsExistentes.add(idStr);
        huboCambios = true;
      }
    }

    if (huboCambios || !this.#clienteApi.existeArchivo(this.#rutaJugados)) {
      this.#clienteApi.escribirJson(this.#rutaJugados, existentes);
    }
  }

  async buscarProximosEventosLiga(idLiga, opciones = {}) {
    if (!idLiga) return [];
    const {
      idsExistentes = new Set(),
      cantidadNuevaObjetivo = 1,
      fechaReferencia = new Date(),
    } = opciones;

    const esNuevoValido = (p) =>
      Boolean(p?.id) &&
      !p.esJugado &&
      !p.yaPasoFecha(fechaReferencia) &&
      !idsExistentes.has(String(p.id));

    try {
      const url = this.#clienteApi.construirUrl("eventsnextleague.php", {
        id: String(idLiga),
      });
      const respuesta = await this.#clienteApi.fetchSeguro(url);
      const cuerpo = await respuesta.json();
      const eventosCrudos = Array.isArray(cuerpo?.events) ? cuerpo.events : [];
      const partidos = eventosCrudos.map((e) => formatearPartidoAPI(e));

      const nuevosEncontrados = () => partidos.filter(esNuevoValido).length;

      if (partidos.length > 0 && nuevosEncontrados() < cantidadNuevaObjetivo) {
        const ref = partidos[0];
        if (ref.jornada && ref.temporada) {
          const ids = new Set(partidos.map((p) => String(p.id)));
          const rondasAProbar = [];
          const numRonda = parseInt(ref.jornada, 10);
          if (!Number.isNaN(numRonda)) {
            for (let offset = 0; offset < 3; offset++) {
              rondasAProbar.push(String(numRonda + offset));
            }
          } else {
            rondasAProbar.push(String(ref.jornada));
          }

          let rondasVaciasSeguidas = 0;
          for (const ronda of rondasAProbar) {
            if (nuevosEncontrados() >= cantidadNuevaObjetivo) break;
            if (rondasVaciasSeguidas >= 2) break;
            try {
              const urlRonda = this.#clienteApi.construirUrl(
                "eventsround.php",
                {
                  id: String(idLiga),
                  r: ronda,
                  s: String(ref.temporada),
                },
              );
              const resRonda = await this.#clienteApi.fetchSeguro(urlRonda);
              const cuerpoRonda = await resRonda.json();
              const crudosRonda = Array.isArray(cuerpoRonda?.events)
                ? cuerpoRonda.events
                : [];
              if (crudosRonda.length === 0) {
                rondasVaciasSeguidas += 1;
                continue;
              }
              rondasVaciasSeguidas = 0;
              for (const ev of crudosRonda) {
                const p = formatearPartidoAPI(ev);
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
    if (!idEvento) return null;
    try {
      const url = this.#clienteApi.construirUrl("lookupevent.php", {
        id: String(idEvento),
      });
      const respuesta = await this.#clienteApi.fetchSeguro(url);
      const cuerpo = await respuesta.json();
      const lista = Array.isArray(cuerpo?.events)
        ? cuerpo.events
        : Array.isArray(cuerpo?.results)
          ? cuerpo.results
          : [];
      if (lista.length === 0) return null;
      return formatearPartidoAPI(lista[0]);
    } catch (error) {
      console.warn(
        `Aviso al consultar evento ${idEvento} en API:`,
        error.message,
      );
      return null;
    }
  }

  async buscarProximosEventosEquipo(idEquipo) {
    if (!idEquipo) return [];
    try {
      const url = this.#clienteApi.construirUrl("eventsnext.php", {
        id: String(idEquipo),
      });
      const respuesta = await this.#clienteApi.fetchSeguro(url);
      const cuerpo = await respuesta.json();
      const eventosCrudos = Array.isArray(cuerpo?.events) ? cuerpo.events : [];
      return eventosCrudos.map((e) => formatearPartidoAPI(e));
    } catch (error) {
      console.warn(
        `Aviso al buscar próximos eventos para equipo ${idEquipo}:`,
        error.message,
      );
      return [];
    }
  }

  async buscarUltimosEventosEquipo(idEquipo) {
    if (!idEquipo) return [];
    try {
      const url = this.#clienteApi.construirUrl("eventslast.php", {
        id: String(idEquipo),
      });
      const respuesta = await this.#clienteApi.fetchSeguro(url);
      const cuerpo = await respuesta.json();
      const eventosCrudos = Array.isArray(cuerpo?.results)
        ? cuerpo.results
        : [];
      return eventosCrudos.map((e) => formatearPartidoAPI(e));
    } catch (error) {
      console.warn(
        `Aviso al buscar últimos eventos para equipo ${idEquipo}:`,
        error.message,
      );
      return [];
    }
  }
}

export default ServicioPartidos;
