import { redondearPuntos } from "../utils/numeros.js";

export class Pedido {
  #id;
  #usuarioId;
  #lineas;
  #total;
  #unidad;
  #creadoEn;

  constructor(datos = {}) {
    this.#id = datos.id ?? "";
    this.#usuarioId = datos.usuarioId ?? "";
    this.#lineas = (datos.lineas ?? []).map((linea) => ({
      productoId: linea.productoId,
      nombre: linea.nombre,
      precio: redondearPuntos(Number(linea.precio ?? 0)),
      cantidad: linea.cantidad,
    }));
    this.#total = redondearPuntos(Number(datos.total ?? 0));
    this.#unidad = datos.unidad || "puntos";
    this.#creadoEn = datos.creadoEn ?? new Date().toISOString();
  }

  get id() { return this.#id; }
  get usuarioId() { return this.#usuarioId; }
  get lineas() { return this.#lineas.map((l) => ({ ...l })); }
  get total() { return this.#total; }
  get unidad() { return this.#unidad; }
  get creadoEn() { return this.#creadoEn; }

  toJSON() {
    return {
      id: this.#id,
      usuarioId: this.#usuarioId,
      lineas: this.lineas,
      total: this.#total,
      unidad: this.#unidad,
      creadoEn: this.#creadoEn,
    };
  }
}

export default Pedido;
