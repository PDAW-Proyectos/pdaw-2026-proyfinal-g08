import { normalizarTexto } from "./ClienteApiFutbol.js";
import { formatearEquipoAPI, exponerEquipo } from "./formatos.js";

export class ServicioEquipos {
  #clienteApi;
  #rutaEquipos;

  constructor(clienteApi, rutaEquipos = "./data/equipos.json") {
    this.#clienteApi = clienteApi;
    this.#rutaEquipos = rutaEquipos;
  }

  get rutaEquipos() {
    return this.#rutaEquipos;
  }
  set rutaEquipos(ruta) {
    this.#rutaEquipos = ruta;
  }

  cargarEquiposLocal() {
    const raw = this.#clienteApi.leerJson(this.#rutaEquipos, []);
    if (!Array.isArray(raw)) return [];
    return raw.map((e) => formatearEquipoAPI(e));
  }

  anexarEquipoLocal(equipo) {
    if (!equipo) return;
    this.anexarEquiposLocal([equipo]);
  }

  anexarEquiposLocal(equiposNuevos = []) {
    if (!Array.isArray(equiposNuevos) || equiposNuevos.length === 0) return;
    const existentesRaw = this.#clienteApi.leerJson(this.#rutaEquipos, []);
    const existentes = Array.isArray(existentesRaw) ? [...existentesRaw] : [];

    const idsExistentes = new Set(
      existentes.map((e) => String(e.id ?? e.idTeam ?? "")).filter(Boolean)
    );
    const nombresExistentes = new Set(
      existentes.map((e) => normalizarTexto(e.nombre ?? e.strTeam ?? "")).filter(Boolean)
    );

    let huboCambios = false;
    for (const eq of equiposNuevos) {
      if (!eq) continue;
      const serializado = exponerEquipo(formatearEquipoAPI(eq));
      const idStr = String(serializado?.id ?? "");
      const nomNorm = normalizarTexto(serializado?.nombre ?? "");

      if ((idStr && idsExistentes.has(idStr)) || (nomNorm && nombresExistentes.has(nomNorm))) {
        continue;
      }

      if (idStr || nomNorm) {
        const registroLimpio = {
          id: serializado.id,
          nombre: serializado.nombre,
          escudo: serializado.escudo,
          estadio: serializado.estadio,
          pais: serializado.pais,
          fundacion: serializado.fundacion,
          descripcion: serializado.descripcion,
          sitioWeb: serializado.sitioWeb,
          idLiga: serializado.idLiga,
          nombreLiga: serializado.nombreLiga,
        };
        existentes.push(registroLimpio);
        if (idStr) idsExistentes.add(idStr);
        if (nomNorm) nombresExistentes.add(nomNorm);
        huboCambios = true;
      }
    }

    if (huboCambios || !this.#clienteApi.existeArchivo(this.#rutaEquipos)) {
      this.#clienteApi.escribirJson(this.#rutaEquipos, existentes);
    }
  }

  buscarEquipoLocal(termino) {
    if (!termino) return null;
    const clave = String(termino).trim();
    const claveNorm = normalizarTexto(clave);
    const equipos = this.cargarEquiposLocal();
    return (
      equipos.find((e) => {
        if (String(e.id) === clave) return true;
        const eNorm = normalizarTexto(e.nombre);
        return Boolean(eNorm && eNorm === claveNorm);
      }) || null
    );
  }

  async buscarEquipoPorId(idEquipo) {
    if (!idEquipo) return null;
    const clave = String(idEquipo);
    const local = this.buscarEquipoLocal(clave);
    if (local) return local;

    try {
      const url = this.#clienteApi.construirUrl("lookupteam.php", { id: clave });
      const respuesta = await this.#clienteApi.fetchSeguro(url);
      const cuerpo = await respuesta.json();
      const equipos = Array.isArray(cuerpo?.teams) ? cuerpo.teams : [];
      if (equipos.length === 0) return null;
      const equipo = formatearEquipoAPI(equipos[0]);
      this.anexarEquipoLocal(equipo);
      return equipo;
    } catch (error) {
      console.warn(`Aviso al buscar equipo por ID ${idEquipo}:`, error.message);
      return null;
    }
  }

  async buscarEquiposPorNombre(nombreEquipo) {
    if (!nombreEquipo) return [];
    const termino = String(nombreEquipo).trim();
    if (!termino) return [];

    try {
      const url = this.#clienteApi.construirUrl("searchteams.php", { t: termino });
      const respuesta = await this.#clienteApi.fetchSeguro(url);
      const cuerpo = await respuesta.json();
      const equiposCrudos = Array.isArray(cuerpo?.teams) ? cuerpo.teams : [];
      const soloFutbol = equiposCrudos.filter(
        (t) => !t.strSport || String(t.strSport).toLowerCase() === "soccer"
      );
      const formateados = soloFutbol.map((t) => formatearEquipoAPI(t));
      if (formateados.length > 0) {
        this.anexarEquiposLocal(formateados);
      }
      return formateados;
    } catch (error) {
      console.warn(`Aviso al buscar equipos por nombre ${nombreEquipo}:`, error.message);
      return [];
    }
  }

  async buscarEquipoPorNombre(nombreEquipo) {
    if (!nombreEquipo) return null;
    const local = this.buscarEquipoLocal(nombreEquipo);
    if (local) return local;

    const encontrados = await this.buscarEquiposPorNombre(nombreEquipo);
    return encontrados[0] || null;
  }

  resolverEscudoEquipoLocal(
    idEquipo,
    nombreEquipo,
    { repositorioEquipos = null, repositorioLigas = null } = {}
  ) {
    const idStr = idEquipo ? String(idEquipo) : "";
    const nom = normalizarTexto(nombreEquipo);

    if (repositorioEquipos) {
      const eq = repositorioEquipos.obtenerEquipo(idStr || nombreEquipo);
      if (eq?.escudo) return eq.escudo;
    }

    const eqLocal = this.buscarEquipoLocal(idStr || nombreEquipo);
    if (eqLocal?.escudo) return eqLocal.escudo;

    if (repositorioLigas) {
      for (const liga of repositorioLigas.ligas) {
        for (const pos of liga.tabla) {
          if (idStr && String(pos.idEquipo) === idStr && pos.escudoEquipo) {
            return pos.escudoEquipo;
          }
          if (nom && normalizarTexto(pos.nombreEquipo) === nom && pos.escudoEquipo) {
            return pos.escudoEquipo;
          }
        }
      }
    }

    return "";
  }
}

export default ServicioEquipos;
