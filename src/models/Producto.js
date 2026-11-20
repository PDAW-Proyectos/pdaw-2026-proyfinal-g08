import { redondearPuntos } from "../utils/numeros.js";

export const CATEGORIAS_PRODUCTO = [
  "camisetas",
  "botas",
  "balones",
  "accesorios",
];

function inferirCategoria(nombre = "") {
  const texto = nombre.toLowerCase();
  if (texto.includes("camiseta")) return "camisetas";
  if (texto.includes("bot")) return "botas";
  if (texto.includes("bal")) return "balones";
  return "accesorios";
}

export class Producto {
  #id;
  #nombre;
  #descripcion;
  #categoria;
  #precio;
  #stock;
  #activo;

  constructor(datos = {}) {
    this.#id = datos.id ?? "";
    this.#nombre = datos.nombre ?? "";
    this.#descripcion = datos.descripcion ?? "";
    this.#categoria = datos.categoria || inferirCategoria(this.#nombre);
    this.#precio = redondearPuntos(Number(datos.precio ?? 0));
    const stock = Number(datos.stock ?? 0);
    this.#stock = stock >= 0 && stock % 1 === 0 ? stock : 0;
    this.#activo = datos.activo ?? true;
  }

  get id() { return this.#id; }
  get nombre() { return this.#nombre; }
  get descripcion() { return this.#descripcion; }
  get categoria() { return this.#categoria; }
  get precio() { return this.#precio; }
  get stock() { return this.#stock; }
  get activo() { return this.#activo; }

  descontarStock(cantidad) {
    this.#stock -= cantidad;
  }

  toJSON() {
    return {
      id: this.#id,
      nombre: this.#nombre,
      descripcion: this.#descripcion,
      categoria: this.#categoria,
      precio: this.#precio,
      stock: this.#stock,
      activo: this.#activo,
    };
  }
}

export default Producto;
