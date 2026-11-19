import { parsearFechaUTC } from "../utils/fechas.js";

export class Partido {
  #id;
  #idLiga;
  #nombreLiga;
  #escudoLiga;
  #temporada;
  #jornada;
  #idEquipoLocal;
  #nombreEquipoLocal;
  #escudoEquipoLocal;
  #idEquipoVisitante;
  #nombreEquipoVisitante;
  #escudoEquipoVisitante;
  #golesLocal;
  #golesVisitante;
  #fecha;
  #hora;
  #timestamp;
  #estado;
  #estadio;
  #descripcion;

  constructor(datos = {}) {
    this.#id = datos.id !== undefined && datos.id !== null ? String(datos.id) : "";
    this.#idLiga = datos.idLiga !== undefined && datos.idLiga !== null ? String(datos.idLiga) : "";
    this.#nombreLiga = datos.nombreLiga ?? "";
    this.#escudoLiga = datos.escudoLiga ?? "";
    this.#temporada = datos.temporada ?? "";
    this.#jornada = datos.jornada ?? "";
    this.#idEquipoLocal =
      datos.idEquipoLocal !== undefined && datos.idEquipoLocal !== null
        ? String(datos.idEquipoLocal)
        : "";
    this.#nombreEquipoLocal = datos.nombreEquipoLocal ?? "";
    this.#escudoEquipoLocal = datos.escudoEquipoLocal ?? "";
    this.#idEquipoVisitante =
      datos.idEquipoVisitante !== undefined && datos.idEquipoVisitante !== null
        ? String(datos.idEquipoVisitante)
        : "";
    this.#nombreEquipoVisitante = datos.nombreEquipoVisitante ?? "";
    this.#escudoEquipoVisitante = datos.escudoEquipoVisitante ?? "";
    this.#golesLocal = datos.golesLocal ?? null;
    this.#golesVisitante = datos.golesVisitante ?? null;
    this.#fecha = datos.fecha ?? "";
    this.#hora = datos.hora ?? "";
    this.#timestamp = datos.timestamp ?? "";
    this.#estado = datos.estado ?? "";
    this.#estadio = datos.estadio ?? "";
    this.#descripcion = datos.descripcion ?? "";
  }

  get id() { return this.#id; }
  get idLiga() { return this.#idLiga; }
  get nombreLiga() { return this.#nombreLiga; }
  get escudoLiga() { return this.#escudoLiga; }
  get temporada() { return this.#temporada; }
  get jornada() { return this.#jornada; }
  get idEquipoLocal() { return this.#idEquipoLocal; }
  get nombreEquipoLocal() { return this.#nombreEquipoLocal; }
  get escudoEquipoLocal() { return this.#escudoEquipoLocal; }
  get idEquipoVisitante() { return this.#idEquipoVisitante; }
  get nombreEquipoVisitante() { return this.#nombreEquipoVisitante; }
  get escudoEquipoVisitante() { return this.#escudoEquipoVisitante; }
  get golesLocal() { return this.#golesLocal; }
  get golesVisitante() { return this.#golesVisitante; }
  get fecha() { return this.#fecha; }
  get hora() { return this.#hora; }
  get timestamp() { return this.#timestamp; }
  get estado() { return this.#estado; }
  get estadio() { return this.#estadio; }
  get descripcion() { return this.#descripcion; }

  set escudoEquipoLocal(valor) { this.#escudoEquipoLocal = valor ?? ""; }
  set escudoEquipoVisitante(valor) { this.#escudoEquipoVisitante = valor ?? ""; }
  set golesLocal(valor) { this.#golesLocal = valor ?? null; }
  set golesVisitante(valor) { this.#golesVisitante = valor ?? null; }
  set estado(valor) { this.#estado = valor ?? ""; }
  set fecha(valor) { this.#fecha = valor ?? ""; }
  set hora(valor) { this.#hora = valor ?? ""; }
  set timestamp(valor) { this.#timestamp = valor ?? ""; }
  set estadio(valor) { this.#estadio = valor ?? ""; }
  set descripcion(valor) { this.#descripcion = valor ?? ""; }

  get esJugado() {
    return (
      this.#estado === "FT" ||
      (this.#golesLocal !== null &&
        this.#golesLocal !== undefined &&
        this.#golesVisitante !== null &&
        this.#golesVisitante !== undefined)
    );
  }

  get esProximo() {
    return !this.esJugado;
  }

  get fechaDate() {
    return parsearFechaUTC(this.#fecha, this.#hora, this.#timestamp);
  }

  yaPasoFecha(referencia = new Date()) {
    const fechaPartido = this.fechaDate;
    return fechaPartido ? fechaPartido.getTime() < referencia.getTime() : false;
  }

  toJSON() {
    return {
      id: this.#id,
      idLiga: this.#idLiga,
      nombreLiga: this.#nombreLiga,
      escudoLiga: this.#escudoLiga,
      temporada: this.#temporada,
      jornada: this.#jornada,
      idEquipoLocal: this.#idEquipoLocal,
      nombreEquipoLocal: this.#nombreEquipoLocal,
      escudoEquipoLocal: this.#escudoEquipoLocal,
      idEquipoVisitante: this.#idEquipoVisitante,
      nombreEquipoVisitante: this.#nombreEquipoVisitante,
      escudoEquipoVisitante: this.#escudoEquipoVisitante,
      golesLocal: this.#golesLocal,
      golesVisitante: this.#golesVisitante,
      fecha: this.#fecha,
      hora: this.#hora,
      timestamp: this.#timestamp,
      estado: this.#estado,
      estadio: this.#estadio,
      descripcion: this.#descripcion,
      esJugado: this.esJugado,
      esProximo: this.esProximo,
    };
  }
}

export default Partido;
