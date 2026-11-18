import { Partido } from "./Partido.js";
import { exponerPartido } from "./formatos.js";

export class RepositorioPartidos {
  #partidos;

  constructor() {
    this.#partidos = [];
  }

  get partidos() {
    return [...this.#partidos];
  }

  agregarPartido(datos) {
    if (!datos || !datos.id) return null;
    const partidoObj = new Partido(datos);

    const indice = this.#partidos.findIndex((p) => String(p.id) === String(partidoObj.id));
    if (indice !== -1) {
      this.#partidos[indice] = partidoObj;
      return this.#partidos[indice];
    }
    this.#partidos.push(partidoObj);
    return partidoObj;
  }

  agregarPartidos(lista = []) {
    if (!Array.isArray(lista)) return;
    lista.forEach((p) => this.agregarPartido(p));
  }

  eliminarPartido(id) {
    const idStr = String(id ?? "");
    const longitudInicial = this.#partidos.length;
    this.#partidos = this.#partidos.filter((p) => String(p.id) !== idStr);
    return this.#partidos.length < longitudInicial;
  }

  obtenerTodos() {
    return this.#partidos.map((p) => exponerPartido(p));
  }

  obtenerPorId(id) {
    const partido = this.#partidos.find((p) => String(p.id) === String(id));
    if (!partido) throw new Error(`El partido '${id}' no existe`);
    return exponerPartido(partido);
  }

  obtenerPorLiga(idLiga) {
    return this.#partidos
      .filter((p) => String(p.idLiga) === String(idLiga))
      .map((p) => exponerPartido(p));
  }

  obtenerProximos(limite = 15, idLiga = null) {
    let filtrados = this.#partidos.filter((p) => p.esProximo);
    if (idLiga) {
      filtrados = filtrados.filter((p) => String(p.idLiga) === String(idLiga));
    }
    // Ordenar por fecha y hora ascendente (los más cercanos a jugarse primero)
    filtrados.sort((a, b) => {
      const tiempoA = a.fechaDate ? a.fechaDate.getTime() : 0;
      const tiempoB = b.fechaDate ? b.fechaDate.getTime() : 0;
      return tiempoA - tiempoB;
    });
    if (limite && limite > 0) {
      filtrados = filtrados.slice(0, limite);
    }
    return filtrados.map((p) => exponerPartido(p));
  }

  obtenerJugados(limite = 10, idLiga = null) {
    let filtrados = this.#partidos.filter((p) => p.esJugado);
    if (idLiga) {
      filtrados = filtrados.filter((p) => String(p.idLiga) === String(idLiga));
    }
    // Ordenar por fecha y hora descendente (los más recientes primero)
    filtrados.sort((a, b) => {
      const tiempoA = a.fechaDate ? a.fechaDate.getTime() : 0;
      const tiempoB = b.fechaDate ? b.fechaDate.getTime() : 0;
      return tiempoB - tiempoA;
    });
    if (limite && limite > 0) {
      filtrados = filtrados.slice(0, limite);
    }
    return filtrados.map((p) => exponerPartido(p));
  }

  obtenerEventosDeLiga(idLiga) {
    return {
      proximos: this.obtenerProximos(15, idLiga),
      jugados: this.obtenerJugados(10, idLiga),
    };
  }
}

export default RepositorioPartidos;
