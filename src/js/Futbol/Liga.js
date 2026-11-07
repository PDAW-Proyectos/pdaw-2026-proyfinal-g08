export class Liga {
  constructor(id, nombre, pais, escudo, temporada, tabla) {
    if (!id || id.trim() === ""){
      throw new TypeError("El ID de la liga no puede estar vacio.");
    }
    if (!nombre || nombre.trim() === ""){
      throw new TypeError("El nombre de la Liga no puede estar vacio.");
    }
    if (tabla != null && !Array.isArray(tabla)){
      throw new TypeError("La tabla de la liga debe ser un arreglo.");
    }
    if (escudo != null && !escudo.startsWith("https://r2.thesportsdb.com/images/media/league/badge")){
      throw new TypeError("No se puede crear una liga con un escudo invalido.")
    }
    console.log(escudo);
    this.id = Number(id);
    this.nombre = nombre;
    this.pais = pais ?? "Pais desconocido";
    this.escudo = escudo;
    this.temporada = temporada ?? "Temporada desconocida";
    this.tabla = tabla ?? [];
  }

  get obtenerId() {
    return this.id;
  }

  get obtenerNombre() {
    return this.nombre;
  }

  get obtenerPais() {
    return this.pais;
  }

  get obtenerEscudo() {
    return this.escudo;
  }

  get obtenerTabla() {
    return this.tabla;
  }
}

export default Liga;
