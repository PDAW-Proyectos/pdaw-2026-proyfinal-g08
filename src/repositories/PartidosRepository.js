import { Partido } from "../models/Partido.js";
import { existeArchivo, leerJson, escribirJson } from "../utils/jsonFile.js";
import { compararFechaAsc, compararFechaDesc } from "../utils/fechas.js";
import { mapearPartidoAPI } from "../utils/apiMappers.js";
import { normalizarTexto } from "../utils/texto.js";
import { crearError } from "../utils/errores.js";

export class PartidosRepository {
  #partidos;
  #rutaProximos;
  #rutaJugados;

  constructor(rutas = {}) {
    this.#partidos = [];
    this.#rutaProximos = rutas.rutaProximos ?? "./data/proximos_partidos.json";
    this.#rutaJugados = rutas.rutaJugados ?? "./data/partidos_jugados.json";
  }

  get partidos() {
    return [...this.#partidos];
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

  cargarProximosLocal() {
    const raw = leerJson(this.#rutaProximos, []);
    return Array.isArray(raw) ? raw.map((p) => mapearPartidoAPI(p)) : [];
  }

  sobrescribirProximosLocal(partidos = []) {
    escribirJson(
      this.#rutaProximos,
      partidos.map((p) => new Partido(p).toJSON()),
    );
  }

  anexarProximosLocal(nuevosPartidos = [], fechaReferencia = new Date()) {
    if (!Array.isArray(nuevosPartidos) || nuevosPartidos.length === 0) return;
    const existentesRaw = leerJson(this.#rutaProximos, []);
    const existentes = Array.isArray(existentesRaw) ? [...existentesRaw] : [];
    const idsExistentes = new Set(
      existentes.map((p) => String(p.id ?? p.idEvent ?? "")).filter(Boolean),
    );

    let huboCambios = false;
    for (const partido of nuevosPartidos) {
      if (!partido) continue;
      const partidoObj = mapearPartidoAPI(partido);
      const idStr = String(partidoObj.id ?? "");
      if (!idStr || idsExistentes.has(idStr)) continue;
      if (partidoObj.esJugado || partidoObj.yaPasoFecha(fechaReferencia))
        continue;

      existentes.push(partidoObj.toJSON());
      idsExistentes.add(idStr);
      huboCambios = true;
    }

    if (huboCambios || !existeArchivo(this.#rutaProximos)) {
      existentes.sort(compararFechaAsc);
      escribirJson(this.#rutaProximos, existentes);
    }
  }

  cargarJugadosLocal() {
    const raw = leerJson(this.#rutaJugados, []);
    return Array.isArray(raw) ? raw.map((p) => mapearPartidoAPI(p)) : [];
  }

  anexarJugadosLocal(nuevosPartidos = []) {
    if (!Array.isArray(nuevosPartidos) || nuevosPartidos.length === 0) return;
    const existentesRaw = leerJson(this.#rutaJugados, []);
    const existentes = Array.isArray(existentesRaw) ? [...existentesRaw] : [];
    const idsExistentes = new Set(
      existentes.map((p) => String(p.id ?? p.idEvent ?? "")).filter(Boolean),
    );

    let huboCambios = false;
    for (const partido of nuevosPartidos) {
      if (!partido) continue;
      const serializado = mapearPartidoAPI(partido).toJSON();
      const idStr = String(serializado.id ?? "");
      if (idStr && !idsExistentes.has(idStr)) {
        existentes.push(serializado);
        idsExistentes.add(idStr);
        huboCambios = true;
      }
    }

    if (huboCambios || !existeArchivo(this.#rutaJugados)) {
      escribirJson(this.#rutaJugados, existentes);
    }
  }

  agregar(datos) {
    if (!datos || !datos.id) return null;
    const partidoObj = new Partido(datos);
    const idx = this.#partidos.findIndex(
      (p) => String(p.id) === String(partidoObj.id),
    );
    if (idx !== -1) {
      this.#partidos[idx] = partidoObj;
      return this.#partidos[idx];
    }
    this.#partidos.push(partidoObj);
    return partidoObj;
  }

  agregarVarios(lista = []) {
    if (!Array.isArray(lista)) return;
    lista.forEach((p) => this.agregar(p));
  }

  eliminar(id) {
    const idStr = String(id ?? "");
    const inicial = this.#partidos.length;
    this.#partidos = this.#partidos.filter((p) => String(p.id) !== idStr);
    return this.#partidos.length < inicial;
  }

  obtenerTodos() {
    return this.#partidos.map((p) => p.toJSON());
  }

  obtenerPorId(id) {
    const partido = this.#partidos.find((p) => String(p.id) === String(id));
    if (!partido)
      throw crearError(404, "match_not_found", `El partido '${id}' no existe.`);
    return partido.toJSON();
  }

  obtenerPorLiga(idLiga) {
    return this.#partidos
      .filter((p) => String(p.idLiga) === String(idLiga))
      .map((p) => p.toJSON());
  }

  obtenerPorEquipo(idEquipo, nombreNorm = "") {
    const idEq = String(idEquipo ?? "");
    return this.#partidos.filter((p) => {
      if (
        String(p.idEquipoLocal) === idEq ||
        String(p.idEquipoVisitante) === idEq
      ) {
        return true;
      }
      return Boolean(
        nombreNorm &&
        (normalizarTexto(p.nombreEquipoLocal) === nombreNorm ||
          normalizarTexto(p.nombreEquipoVisitante) === nombreNorm),
      );
    });
  }

  obtenerProximos(limite = 15, idLiga = null) {
    let lista = this.#partidos.filter((p) => p.esProximo);
    if (idLiga)
      lista = lista.filter((p) => String(p.idLiga) === String(idLiga));
    lista.sort(compararFechaAsc);
    if (limite && limite > 0) lista = lista.slice(0, limite);
    return lista.map((p) => p.toJSON());
  }

  obtenerJugados(limite = 10, idLiga = null) {
    let lista = this.#partidos.filter((p) => p.esJugado);
    if (idLiga)
      lista = lista.filter((p) => String(p.idLiga) === String(idLiga));
    lista.sort(compararFechaDesc);
    if (limite && limite > 0) lista = lista.slice(0, limite);
    return lista.map((p) => p.toJSON());
  }

  obtenerEventosDeLiga(idLiga) {
    return {
      proximos: this.obtenerProximos(15, idLiga),
      jugados: this.obtenerJugados(10, idLiga),
    };
  }
}

export default PartidosRepository;
