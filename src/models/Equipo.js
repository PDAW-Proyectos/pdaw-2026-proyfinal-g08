import { Partido } from "./Partido.js";

export class Equipo {
  #id;
  #nombre;
  #escudo;
  #estadio;
  #pais;
  #fundacion;
  #descripcion;
  #sitioWeb;
  #idLiga;
  #nombreLiga;
  #proximoPartido;
  #ultimoPartido;
  #posicion;
  #liga;

  constructor(datos = {}) {
    this.#id = datos.id !== undefined && datos.id !== null ? String(datos.id) : "";
    this.#nombre = datos.nombre ?? "";
    this.#escudo = datos.escudo ?? "";
    this.#estadio = datos.estadio ?? "";
    this.#pais = datos.pais ?? "";
    this.#fundacion = datos.fundacion ?? "";
    this.#descripcion = datos.descripcion ?? "";
    this.#sitioWeb = datos.sitioWeb ?? "";
    this.#idLiga = datos.idLiga !== undefined && datos.idLiga !== null ? String(datos.idLiga) : "";
    this.#nombreLiga = datos.nombreLiga ?? "";
    this.#proximoPartido = datos.proximoPartido ? new Partido(datos.proximoPartido) : null;
    this.#ultimoPartido = datos.ultimoPartido ? new Partido(datos.ultimoPartido) : null;
    this.#posicion = datos.posicion ?? null;
    this.#liga = datos.liga ?? null;
  }

  get id() { return this.#id; }
  get nombre() { return this.#nombre; }
  get escudo() { return this.#escudo; }
  get estadio() { return this.#estadio; }
  get pais() { return this.#pais; }
  get fundacion() { return this.#fundacion; }
  get descripcion() { return this.#descripcion; }
  get sitioWeb() { return this.#sitioWeb; }
  get idLiga() { return this.#idLiga; }
  get nombreLiga() { return this.#nombreLiga; }
  get proximoPartido() { return this.#proximoPartido; }
  get ultimoPartido() { return this.#ultimoPartido; }
  get posicion() { return this.#posicion; }
  get liga() { return this.#liga; }

  set nombre(valor) { this.#nombre = valor ?? ""; }
  set escudo(valor) { this.#escudo = valor ?? ""; }
  set estadio(valor) { this.#estadio = valor ?? ""; }
  set pais(valor) { this.#pais = valor ?? ""; }
  set fundacion(valor) { this.#fundacion = valor ?? ""; }
  set descripcion(valor) { this.#descripcion = valor ?? ""; }
  set sitioWeb(valor) { this.#sitioWeb = valor ?? ""; }
  set idLiga(valor) {
    this.#idLiga = valor !== undefined && valor !== null ? String(valor) : "";
  }
  set nombreLiga(valor) { this.#nombreLiga = valor ?? ""; }
  set proximoPartido(valor) { this.#proximoPartido = valor ? new Partido(valor) : null; }
  set ultimoPartido(valor) { this.#ultimoPartido = valor ? new Partido(valor) : null; }
  set posicion(valor) { this.#posicion = valor ?? null; }
  set liga(valor) { this.#liga = valor ?? null; }

  toJSON() {
    return {
      id: this.#id,
      nombre: this.#nombre,
      escudo: this.#escudo,
      estadio: this.#estadio,
      pais: this.#pais,
      fundacion: this.#fundacion,
      descripcion: this.#descripcion,
      sitioWeb: this.#sitioWeb,
      idLiga: this.#idLiga,
      nombreLiga: this.#nombreLiga,
      posicion: this.#posicion,
      liga: this.#liga,
      proximoPartido: this.#proximoPartido ? this.#proximoPartido.toJSON() : null,
      ultimoPartido: this.#ultimoPartido ? this.#ultimoPartido.toJSON() : null,
    };
  }
}

export default Equipo;
