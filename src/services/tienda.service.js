import { CATEGORIAS_PRODUCTO } from "../models/Producto.js";
import { crearError } from "../utils/errores.js";
import { esPrecioValido, redondearPuntos } from "../utils/numeros.js";

export class TiendaService {
  #comunidadRepo;

  constructor({ comunidadRepo }) {
    this.#comunidadRepo = comunidadRepo;
  }

  listarProductos() {
    return { productos: this.#comunidadRepo.listarProductos() };
  }

  async agregarProducto({
    nombre,
    descripcion = "",
    categoria,
    precio,
    stock,
  } = {}) {
    const nombreLimpio = nombre?.trim?.();
    const descripcionLimpia = descripcion?.trim?.();
    if (
      !nombreLimpio ||
      nombreLimpio.length < 2 ||
      nombreLimpio.length > 80 ||
      descripcionLimpia === undefined ||
      descripcionLimpia.length > 300 ||
      !CATEGORIAS_PRODUCTO.includes(categoria) ||
      !esPrecioValido(precio) ||
      Number(stock) !== stock ||
      stock % 1 !== 0 ||
      stock < 0 ||
      stock > 100000
    ) {
      throw crearError(
        400,
        "invalid_product",
        "Revisá los datos: el precio debe estar en puntos con hasta dos decimales y el stock debe ser un entero no negativo.",
      );
    }

    const producto = await this.#comunidadRepo.agregarProducto({
      nombre: nombreLimpio,
      descripcion: descripcionLimpia,
      categoria,
      precio: redondearPuntos(precio),
      stock,
    });

    return { producto };
  }

  async borrarProducto(id) {
    const eliminado = await this.#comunidadRepo.borrarProducto(id);
    if (!eliminado) {
      throw crearError(404, "product_not_found", "Producto no encontrado.");
    }
  }

  obtenerCarrito(usuarioId) {
    const lineas = this.#comunidadRepo
      .obtenerCarrito(usuarioId)
      .map((item) => {
        const producto = this.#comunidadRepo.buscarProducto(item.productoId);
        return producto ? { producto, cantidad: item.cantidad } : null;
      })
      .filter(Boolean);

    return { lineas };
  }

  async agregarAlCarrito(usuarioId, { productoId, cantidad } = {}) {
    if (
      !productoId ||
      String(productoId) !== productoId ||
      Number(cantidad) !== cantidad ||
      cantidad % 1 !== 0 ||
      cantidad < 1 ||
      cantidad > 1000
    ) {
      throw crearError(
        400,
        "invalid_cart_item",
        "Producto o cantidad inválidos.",
      );
    }

    const producto = this.#comunidadRepo.buscarProducto(productoId);
    if (!producto) {
      throw crearError(400, "product_not_found", "Producto no encontrado.");
    }

    const carrito = this.#comunidadRepo.obtenerCarrito(usuarioId);
    const linea = carrito.find((item) => item.productoId === productoId);
    const nuevaCantidad = (linea?.cantidad || 0) + cantidad;

    if (nuevaCantidad > producto.stock) {
      throw crearError(
        400,
        "insufficient_stock",
        "No hay suficiente stock disponible.",
      );
    }

    if (linea) {
      linea.cantidad = nuevaCantidad;
    } else {
      carrito.push({ productoId, cantidad });
    }

    const carritoActualizado = await this.#comunidadRepo.guardarCarrito(
      usuarioId,
      carrito,
    );
    return { carrito: carritoActualizado };
  }

  async actualizarCantidadCarrito(usuarioId, productoId, { cantidad } = {}) {
    if (
      Number(cantidad) !== cantidad ||
      cantidad % 1 !== 0 ||
      cantidad < 1 ||
      cantidad > 1000
    ) {
      throw crearError(
        400,
        "invalid_quantity",
        "La cantidad no es válida.",
      );
    }

    const producto = this.#comunidadRepo.buscarProducto(productoId);
    if (!producto) {
      throw crearError(400, "product_not_found", "Producto no encontrado.");
    }
    if (cantidad > producto.stock) {
      throw crearError(
        400,
        "insufficient_stock",
        "No hay suficiente stock disponible.",
      );
    }

    const carrito = this.#comunidadRepo.obtenerCarrito(usuarioId);
    const linea = carrito.find((item) => item.productoId === productoId);
    if (!linea) {
      throw crearError(
        400,
        "cart_item_not_found",
        "El producto no está en el carrito.",
      );
    }

    linea.cantidad = cantidad;
    const carritoActualizado = await this.#comunidadRepo.guardarCarrito(
      usuarioId,
      carrito,
    );
    return { carrito: carritoActualizado };
  }

  async quitarDelCarrito(usuarioId, productoId) {
    const carrito = this.#comunidadRepo
      .obtenerCarrito(usuarioId)
      .filter((linea) => linea.productoId !== productoId);
    await this.#comunidadRepo.guardarCarrito(usuarioId, carrito);
  }

  async vaciarCarrito(usuarioId) {
    await this.#comunidadRepo.guardarCarrito(usuarioId, []);
  }

  async finalizarCompra(usuarioId) {
    const carrito = this.#comunidadRepo.obtenerCarrito(usuarioId);
    if (carrito.length === 0) {
      throw crearError(400, "empty_cart", "El carrito está vacío.");
    }

    const lineas = carrito.map((item) => {
      const producto = this.#comunidadRepo.buscarProducto(item.productoId);
      if (!producto || item.cantidad > producto.stock) {
        throw crearError(
          400,
          "insufficient_stock",
          "Un producto ya no tiene stock suficiente. Revisá el carrito.",
        );
      }

      return {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: item.cantidad,
      };
    });

    const total = redondearPuntos(
      lineas.reduce((suma, linea) => suma + linea.precio * linea.cantidad, 0),
    );

    const pedido = await this.#comunidadRepo.registrarPedido(
      usuarioId,
      { lineas, total, unidad: "puntos" },
      lineas.map((linea) => ({
        productoId: linea.productoId,
        cantidad: linea.cantidad,
      })),
    );

    return { pedido };
  }

  listarPedidos(usuarioId) {
    return { pedidos: this.#comunidadRepo.listarPedidosDeUsuario(usuarioId) };
  }
}

export default TiendaService;
