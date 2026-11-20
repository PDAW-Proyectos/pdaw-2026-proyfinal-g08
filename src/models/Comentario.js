export class Comentario {
  #id;
  #publicacionId;
  #autorId;
  #autorNombre;
  #texto;
  #creadoEn;

  constructor(datos = {}) {
    this.#id = datos.id ?? "";
    this.#publicacionId = datos.publicacionId ?? "";
    this.#autorId = datos.autorId ?? "";
    this.#autorNombre = datos.autorNombre ?? "";
    this.#texto = datos.texto ?? "";
    this.#creadoEn = datos.creadoEn ?? new Date().toISOString();
  }

  get id() { return this.#id; }
  get publicacionId() { return this.#publicacionId; }
  get autorId() { return this.#autorId; }
  get autorNombre() { return this.#autorNombre; }
  get texto() { return this.#texto; }
  get creadoEn() { return this.#creadoEn; }

  toJSON() {
    return {
      id: this.#id,
      publicacionId: this.#publicacionId,
      autorId: this.#autorId,
      autorNombre: this.#autorNombre,
      texto: this.#texto,
      creadoEn: this.#creadoEn,
    };
  }
}

export default Comentario;
