export class Publicacion {
  #id;
  #autorId;
  #autorNombre;
  #titulo;
  #texto;
  #creadaEn;

  constructor(datos = {}) {
    this.#id = datos.id ?? "";
    this.#autorId = datos.autorId ?? "";
    this.#autorNombre = datos.autorNombre ?? "";
    this.#titulo = datos.titulo ?? "";
    this.#texto = datos.texto ?? "";
    this.#creadaEn = datos.creadaEn ?? new Date().toISOString();
  }

  get id() { return this.#id; }
  get autorId() { return this.#autorId; }
  get autorNombre() { return this.#autorNombre; }
  get titulo() { return this.#titulo; }
  get texto() { return this.#texto; }
  get creadaEn() { return this.#creadaEn; }

  toJSON() {
    return {
      id: this.#id,
      autorId: this.#autorId,
      autorNombre: this.#autorNombre,
      titulo: this.#titulo,
      texto: this.#texto,
      creadaEn: this.#creadaEn,
    };
  }
}

export default Publicacion;
