import { Posicion } from "./Posicion.js";

export class Liga {
  #id;
  #nombre;
  #pais;
  #escudo;
  #temporada;
  #tabla;

  constructor(datos = {}) {
    this.#id = datos.id !== undefined && datos.id !== null ? String(datos.id) : "";
    this.#nombre = datos.nombre ?? "";
    this.#pais = datos.pais ?? "";
    this.#escudo = datos.escudo ?? "";
    this.#temporada = datos.temporada ?? "";
    this.#tabla = [];
    this.tabla = datos.tabla ?? [];
  }

  get id() { return this.#id; }
  get nombre() { return this.#nombre; }
  get pais() { return this.#pais; }
  get escudo() { return this.#escudo; }
  get temporada() { return this.#temporada; }
  get tabla() { return [...this.#tabla]; }

  set nombre(valor) { this.#nombre = valor ?? ""; }
  set pais(valor) { this.#pais = valor ?? ""; }
  set escudo(valor) { this.#escudo = valor ?? ""; }
  set temporada(valor) { this.#temporada = valor ?? ""; }

  set tabla(nuevaTabla) {
    this.#tabla = Array.isArray(nuevaTabla)
      ? nuevaTabla.map((item) => new Posicion(item))
      : [];
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
