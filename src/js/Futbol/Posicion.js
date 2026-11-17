export class Posicion {
  #idEquipo;
  #nombreEquipo;
  #escudoEquipo;
  #idLiga;
  #posicion;
  #partidosJugados;
  #victorias;
  #derrotas;
  #empates;
  #golesFavor;
  #golesContra;
  #diferenciaGol;
  #puntos;
  #racha;

  constructor(datos = {}) {
    this.#idEquipo = datos.idEquipo ? String(datos.idEquipo) : "";
    this.#nombreEquipo = datos.nombreEquipo ?? "";
    this.#escudoEquipo = datos.escudoEquipo ?? "";
    this.#idLiga = datos.idLiga ? String(datos.idLiga) : "";
    this.#posicion = datos.posicion ?? "";
    this.#partidosJugados = datos.partidosJugados ?? "0";
    this.#victorias = datos.victorias ?? "0";
    this.#derrotas = datos.derrotas ?? "0";
    this.#empates = datos.empates ?? "0";
    this.#golesFavor = datos.golesFavor ?? "0";
    this.#golesContra = datos.golesContra ?? "0";
    this.#diferenciaGol = datos.diferenciaGol ?? "0";
    this.#puntos = datos.puntos ?? "0";
    this.#racha = datos.racha ?? "";
  }

  get idEquipo() { return this.#idEquipo; }
  get nombreEquipo() { return this.#nombreEquipo; }
  get escudoEquipo() { return this.#escudoEquipo; }
  get idLiga() { return this.#idLiga; }
  get posicion() { return this.#posicion; }
  get partidosJugados() { return this.#partidosJugados; }
  get victorias() { return this.#victorias; }
  get derrotas() { return this.#derrotas; }
  get empates() { return this.#empates; }
  get golesFavor() { return this.#golesFavor; }
  get golesContra() { return this.#golesContra; }
  get diferenciaGol() { return this.#diferenciaGol; }
  get puntos() { return this.#puntos; }
  get racha() { return this.#racha; }

  set escudoEquipo(valor) { this.#escudoEquipo = valor ?? ""; }
  set posicion(valor) { this.#posicion = valor ?? ""; }
  set partidosJugados(valor) { this.#partidosJugados = valor ?? "0"; }
  set victorias(valor) { this.#victorias = valor ?? "0"; }
  set derrotas(valor) { this.#derrotas = valor ?? "0"; }
  set empates(valor) { this.#empates = valor ?? "0"; }
  set golesFavor(valor) { this.#golesFavor = valor ?? "0"; }
  set golesContra(valor) { this.#golesContra = valor ?? "0"; }
  set diferenciaGol(valor) { this.#diferenciaGol = valor ?? "0"; }
  set puntos(valor) { this.#puntos = valor ?? "0"; }
  set racha(valor) { this.#racha = valor ?? ""; }

  toJSON() {
    return {
      idEquipo: this.#idEquipo,
      nombreEquipo: this.#nombreEquipo,
      escudoEquipo: this.#escudoEquipo,
      idLiga: this.#idLiga,
      posicion: this.#posicion,
      partidosJugados: this.#partidosJugados,
      victorias: this.#victorias,
      derrotas: this.#derrotas,
      empates: this.#empates,
      golesFavor: this.#golesFavor,
      golesContra: this.#golesContra,
      diferenciaGol: this.#diferenciaGol,
      puntos: this.#puntos,
      racha: this.#racha,
    };
  }
}

export default Posicion;
