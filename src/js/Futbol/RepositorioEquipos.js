import { Equipo } from "./Equipo.js";
import { exponerEquipo } from "./formatos.js";

const normalizar = (texto) =>
  String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

export class RepositorioEquipos {
  #equipos;

  constructor() {
    this.#equipos = [];
  }

  get equipos() {
    return [...this.#equipos];
  }

  agregarEquipo(datos) {
    if (!datos) return null;
    const obj = datos instanceof Equipo ? datos : new Equipo(datos);
    if (!obj.id && !obj.nombre) return null;

    const idStr = String(obj.id);
    const nomNorm = normalizar(obj.nombre);

    const indice = this.#equipos.findIndex((e) => {
      if (idStr && String(e.id) === idStr) return true;
      if (nomNorm && normalizar(e.nombre) === nomNorm) return true;
      return false;
    });

    if (indice !== -1) {
      const actual = this.#equipos[indice];
      const fusionado = new Equipo({
        id: obj.id || actual.id,
        nombre: obj.nombre || actual.nombre,
        escudo: obj.escudo || actual.escudo,
        estadio: obj.estadio || actual.estadio,
        pais: obj.pais || actual.pais,
        fundacion: obj.fundacion || actual.fundacion,
        descripcion: obj.descripcion || actual.descripcion,
        sitioWeb: obj.sitioWeb || actual.sitioWeb,
        idLiga: obj.idLiga || actual.idLiga,
        nombreLiga: obj.nombreLiga || actual.nombreLiga,
        proximoPartido: obj.proximoPartido || actual.proximoPartido,
        ultimoPartido: obj.ultimoPartido || actual.ultimoPartido,
        posicion: obj.posicion || actual.posicion,
        liga: obj.liga || actual.liga,
      });
      this.#equipos[indice] = fusionado;
      return fusionado;
    }

    this.#equipos.push(obj);
    return obj;
  }

  agregarEquipos(datos) {
    if (Array.isArray(datos)) {
      return datos.map((d) => this.agregarEquipo(d)).filter(Boolean);
    }
    return this.agregarEquipo(datos);
  }

  obtenerEquipo(id) {
    if (!id) return null;
    const termino = String(id).trim();
    const terminoNorm = normalizar(termino);

    return (
      this.#equipos.find((e) => {
        if (String(e.id) === termino) return true;
        const eNorm = normalizar(e.nombre);
        if (eNorm && eNorm === terminoNorm) return true;
        if (
          terminoNorm.length >= 4 &&
          (eNorm.includes(terminoNorm) || terminoNorm.includes(eNorm))
        ) {
          return true;
        }
        return false;
      }) || null
    );
  }

  buscarEquipo(id) {
    const equipo = this.obtenerEquipo(id);
    if (!equipo) {
      throw new Error("El equipo no existe");
    }
    return equipo;
  }

  buscarPorNombre(nombre) {
    return this.obtenerEquipo(nombre);
  }

  buscarCoincidencias(termino, limite = 10) {
    const q = normalizar(termino);
    if (!q) return [];

    const coincidencias = this.#equipos.filter((eq) => {
      const nomNorm = normalizar(eq.nombre);
      return Boolean(nomNorm && nomNorm.includes(q));
    });

    coincidencias.sort((a, b) => {
      const na = normalizar(a.nombre);
      const nb = normalizar(b.nombre);
      const aExacto = na === q ? 0 : na.startsWith(q) ? 1 : 2;
      const bExacto = nb === q ? 0 : nb.startsWith(q) ? 1 : 2;
      if (aExacto !== bExacto) return aExacto - bExacto;
      return a.nombre.localeCompare(b.nombre);
    });

    return coincidencias.slice(0, limite).map((e) => exponerEquipo(e));
  }

  listarEquipos() {
    return this.#equipos.map((e) => exponerEquipo(e));
  }

  async obtenerDetalleCompleto(
    id,
    { repositorioLigas = null, repositorioPartidos = null, servicioFutbol = null } = {}
  ) {
    let equipo = this.obtenerEquipo(id);

    // Si no está en el JSON/repositorio de equipos, lo solicitamos a la API y lo anexamos al JSON sin sobrescribir
    if (!equipo && servicioFutbol) {
      try {
        if (/^\d+$/.test(String(id))) {
          equipo = await servicioFutbol.buscarEquipoPorId(id);
        } else {
          equipo = await servicioFutbol.buscarEquipoPorNombre(id);
        }
        if (equipo) {
          this.agregarEquipo(equipo);
          if (typeof servicioFutbol.anexarEquipoLocal === "function") {
            servicioFutbol.anexarEquipoLocal(equipo);
          }
        }
      } catch (err) {
        console.warn(`Aviso al buscar equipo ${id} en API:`, err.message);
      }
    }

    if (!equipo) {
      throw new Error(`El equipo '${id}' no existe`);
    }

    const detalle = new Equipo(equipo.toJSON ? equipo.toJSON() : equipo);

    // 1. Vincular su posición y liga buscando en las tablas ya cargadas de las ligas
    if (repositorioLigas) {
      const ligas = repositorioLigas.ligas || [];

      for (const liga of ligas) {
        const tabla = Array.isArray(liga.tabla) ? liga.tabla : [];
        const pos = tabla.find((p) => {
          if (p.idEquipo && String(p.idEquipo) === String(equipo.id)) return true;
          if (normalizar(p.nombreEquipo) === normalizar(equipo.nombre)) return true;
          return false;
        });

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

      // Si conocemos su idLiga pero no tenía la liga vinculada desde la tabla
      if (!detalle.liga && detalle.idLiga) {
        try {
          const ligaObj = repositorioLigas.buscarLiga(detalle.idLiga);
          if (ligaObj) {
            detalle.liga = {
              id: ligaObj.id,
              nombre: ligaObj.nombre,
              pais: ligaObj.pais,
              escudo: ligaObj.escudo,
              temporada: ligaObj.temporada,
            };
          }
        } catch {
          // Liga no encontrada en repositorio
        }
      }
    }

    // 2. Vincular próximo y último partido desde RepositorioPartidos, consultando API bajo demanda si faltan
    if (repositorioPartidos) {
      const idEq = String(equipo.id);
      const nomNorm = normalizar(equipo.nombre);

      const coincideEquipo = (partido) => {
        if (String(partido.idEquipoLocal) === idEq || String(partido.idEquipoVisitante) === idEq) {
          return true;
        }
        if (
          nomNorm &&
          (normalizar(partido.nombreEquipoLocal) === nomNorm ||
            normalizar(partido.nombreEquipoVisitante) === nomNorm)
        ) {
          return true;
        }
        return false;
      };

      const completarEscudosLocales = (listaPartidos = []) => {
        for (const p of listaPartidos) {
          if (!p.escudoEquipoLocal && servicioFutbol?.resolverEscudoEquipoLocal) {
            const esc = servicioFutbol.resolverEscudoEquipoLocal(
              p.idEquipoLocal,
              p.nombreEquipoLocal,
              { repositorioEquipos: this, repositorioLigas }
            );
            if (esc) p.escudoEquipoLocal = esc;
          }
          if (!p.escudoEquipoVisitante && servicioFutbol?.resolverEscudoEquipoLocal) {
            const esc = servicioFutbol.resolverEscudoEquipoLocal(
              p.idEquipoVisitante,
              p.nombreEquipoVisitante,
              { repositorioEquipos: this, repositorioLigas }
            );
            if (esc) p.escudoEquipoVisitante = esc;
          }
        }
      };

      let partidosDelEquipo = repositorioPartidos.partidos.filter(coincideEquipo);
      let proximos = partidosDelEquipo.filter((p) => p.esProximo);
      let jugados = partidosDelEquipo.filter((p) => p.esJugado);

      if (proximos.length === 0 && servicioFutbol && /^\d+$/.test(idEq)) {
        try {
          const proxApi = await servicioFutbol.buscarProximosEventosEquipo(idEq);
          if (Array.isArray(proxApi) && proxApi.length > 0) {
            completarEscudosLocales(proxApi);
            repositorioPartidos.agregarPartidos(proxApi);
            if (typeof servicioFutbol.anexarProximosPartidosLocal === "function") {
              servicioFutbol.anexarProximosPartidosLocal(proxApi);
            }
          }
        } catch (err) {
          console.warn(`Aviso al buscar próximo partido del equipo ${idEq}:`, err.message);
        }
      }

      if (jugados.length === 0 && servicioFutbol && /^\d+$/.test(idEq)) {
        try {
          const ultApi = await servicioFutbol.buscarUltimosEventosEquipo(idEq);
          if (Array.isArray(ultApi) && ultApi.length > 0) {
            completarEscudosLocales(ultApi);
            repositorioPartidos.agregarPartidos(ultApi);
            if (typeof servicioFutbol.anexarPartidosJugadosLocal === "function") {
              servicioFutbol.anexarPartidosJugadosLocal(ultApi);
            }
          }
        } catch (err) {
          console.warn(`Aviso al buscar último partido del equipo ${idEq}:`, err.message);
        }
      }

      partidosDelEquipo = repositorioPartidos.partidos.filter(coincideEquipo);

      proximos = partidosDelEquipo
        .filter((p) => p.esProximo)
        .sort((a, b) => {
          const ta = a.fechaDate ? a.fechaDate.getTime() : 0;
          const tb = b.fechaDate ? b.fechaDate.getTime() : 0;
          return ta - tb;
        });

      jugados = partidosDelEquipo
        .filter((p) => p.esJugado)
        .sort((a, b) => {
          const ta = a.fechaDate ? a.fechaDate.getTime() : 0;
          const tb = b.fechaDate ? b.fechaDate.getTime() : 0;
          return tb - ta;
        });

      if (proximos.length > 0) detalle.proximoPartido = proximos[0];
      if (jugados.length > 0) detalle.ultimoPartido = jugados[0];
    }

    return exponerEquipo(detalle);
  }
}

export default RepositorioEquipos;
