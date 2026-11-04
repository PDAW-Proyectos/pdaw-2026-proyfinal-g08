export class Equipo {
  constructor(id, nombre, escudo, proximoPartido) {
    this.id = id;
    this.nombre = nombre;
    this.escudo = escudo;
    this.proximoPartido = proximoPartido;
  }

  get obtenerId() {
    return this.id;
  }

  get obtenerNombre() {
    return this.nombre;
  }

  get obtenerEscudo() {
    return this.escudo;
  }
}

export default Equipo;
