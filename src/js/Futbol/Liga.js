import { Posicion } from "./Posicion.js";

export class Liga {
  #id;
  #nombre;
  #pais;
  #escudo;
  #temporada;
  #tabla;

  constructor(id, nombre, pais, escudo, temporada, tabla) {
    this.#id = id !== undefined && id !== null ? String(id) : "";
    this.#nombre = nombre ?? "";
    this.#pais = pais ?? "";
    this.#escudo = escudo ?? "";
    this.#temporada = temporada ?? "";
    this.#tabla = [];
    this.tabla = tabla ?? [];
  }

  get id() {
    return this.#id;
  }
  get nombre() {
    return this.#nombre;
  }
  get pais() {
    return this.#pais;
  }
  get escudo() {
    return this.#escudo;
  }
  get temporada() {
    return this.#temporada;
  }
  get tabla() {
    return [...this.#tabla];
  }

  get obtenerId() {
    return this.#id;
  }
  get obtenerNombre() {
    return this.#nombre;
  }
  get obtenerPais() {
    return this.#pais;
  }
  get obtenerEscudo() {
    return this.#escudo;
  }
  get obtenerTabla() {
    return [...this.#tabla];
  }

  set nombre(valor) {
    this.#nombre = valor ?? "";
  }
  set pais(valor) {
    this.#pais = valor ?? "";
  }
  set escudo(valor) {
    this.#escudo = valor ?? "";
  }
  set temporada(valor) {
    this.#temporada = valor ?? "";
  }

  set tabla(nuevaTabla) {
    if (!Array.isArray(nuevaTabla)) {
      this.#tabla = [];
      return;
    }
    this.#tabla = nuevaTabla.map((item) => new Posicion(item));
  }

  toJSON() {
    return {
      id: this.#id,
      nombre: this.#nombre,
      pais: this.#pais,
      escudo: this.#escudo,
      temporada: this.#temporada,
      tabla: this.#tabla.map((pos) => pos.toJSON()),
    };
  }
}

export default Liga;
