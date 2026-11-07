export class Equipo {
  constructor(id, nombre, escudo, proximoPartido) {
    if (!id || id.trim() === ""){
      throw new TypeError("El ID del Equipo no puede estar vacio.");
    }
    if (!nombre || nombre.trim() === ""){
      throw new TypeError("El nombre del Equipo no puede estar vacio.");
    }
    if (escudo != null && !escudo.startsWith("https://r2.thesportsdb.com/images/media/team/badge")){
      throw new TypeError("No se puede crear un Equipo con un escudo invalido.")
    }
    this.id = Number(id);
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
