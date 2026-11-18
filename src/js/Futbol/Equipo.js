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

  constructor(idOrData = {}, nombre, escudo, proximoPartido) {
    if (typeof idOrData === "object" && idOrData !== null) {
      this.#id =
        idOrData.id !== undefined && idOrData.id !== null
          ? String(idOrData.id)
          : "";
      this.#nombre = idOrData.nombre ?? "";
      this.#escudo = idOrData.escudo ?? "";
      this.#estadio = idOrData.estadio ?? "";
      this.#pais = idOrData.pais ?? "";
      this.#fundacion = idOrData.fundacion ?? "";
      this.#descripcion = idOrData.descripcion ?? "";
      this.#sitioWeb = idOrData.sitioWeb ?? "";
      this.#idLiga =
        idOrData.idLiga !== undefined && idOrData.idLiga !== null
          ? String(idOrData.idLiga)
          : "";
      this.#nombreLiga = idOrData.nombreLiga ?? "";
      this.#proximoPartido = idOrData.proximoPartido
        ? new Partido(idOrData.proximoPartido)
        : null;
      this.#ultimoPartido = idOrData.ultimoPartido
        ? new Partido(idOrData.ultimoPartido)
        : null;
      this.#posicion = idOrData.posicion ?? null;
      this.#liga = idOrData.liga ?? null;
    } else {
      this.#id =
        idOrData !== undefined && idOrData !== null ? String(idOrData) : "";
      this.#nombre = nombre ?? "";
      this.#escudo = escudo ?? "";
      this.#proximoPartido = proximoPartido
        ? new Partido(proximoPartido)
        : null;
      this.#estadio = "";
      this.#pais = "";
      this.#fundacion = "";
      this.#descripcion = "";
      this.#sitioWeb = "";
      this.#idLiga = "";
      this.#nombreLiga = "";
      this.#ultimoPartido = null;
      this.#posicion = null;
      this.#liga = null;
    }
  }

  get id() {
    return this.#id;
  }
  get nombre() {
    return this.#nombre;
  }
  get escudo() {
    return this.#escudo;
  }
  get estadio() {
    return this.#estadio;
  }
  get pais() {
    return this.#pais;
  }
  get fundacion() {
    return this.#fundacion;
  }
  get descripcion() {
    return this.#descripcion;
  }
  get sitioWeb() {
    return this.#sitioWeb;
  }
  get idLiga() {
    return this.#idLiga;
  }
  get nombreLiga() {
    return this.#nombreLiga;
  }
  get proximoPartido() {
    return this.#proximoPartido;
  }
  get ultimoPartido() {
    return this.#ultimoPartido;
  }
  get posicion() {
    return this.#posicion;
  }
  get liga() {
    return this.#liga;
  }

  get obtenerId() {
    return this.#id;
  }
  get obtenerNombre() {
    return this.#nombre;
  }
  get obtenerEscudo() {
    return this.#escudo;
  }
  get obtenerEstadio() {
    return this.#estadio;
  }

  set nombre(valor) {
    this.#nombre = valor ?? "";
  }
  set escudo(valor) {
    this.#escudo = valor ?? "";
  }
  set estadio(valor) {
    this.#estadio = valor ?? "";
  }
  set pais(valor) {
    this.#pais = valor ?? "";
  }
  set fundacion(valor) {
    this.#fundacion = valor ?? "";
  }
  set descripcion(valor) {
    this.#descripcion = valor ?? "";
  }
  set sitioWeb(valor) {
    this.#sitioWeb = valor ?? "";
  }
  set idLiga(valor) {
    this.#idLiga = valor !== undefined && valor !== null ? String(valor) : "";
  }
  set nombreLiga(valor) {
    this.#nombreLiga = valor ?? "";
  }
  set proximoPartido(valor) {
    this.#proximoPartido = valor ? new Partido(valor) : null;
  }
  set ultimoPartido(valor) {
    this.#ultimoPartido = valor ? new Partido(valor) : null;
  }
  set posicion(valor) {
    this.#posicion = valor ?? null;
  }
  set liga(valor) {
    this.#liga = valor ?? null;
  }

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
      proximoPartido: this.#proximoPartido
        ? this.#proximoPartido.toJSON()
        : null,
      ultimoPartido: this.#ultimoPartido ? this.#ultimoPartido.toJSON() : null,
    };
  }
}

export default Equipo;
