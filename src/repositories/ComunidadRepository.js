import { randomUUID } from "node:crypto";
import { Publicacion } from "../models/Publicacion.js";
import { Comentario } from "../models/Comentario.js";
import { Producto } from "../models/Producto.js";
import { Pedido } from "../models/Pedido.js";
import { RepositorioJson } from "./RepositorioJson.js";

const crearProductosIniciales = () => [
  {
    id: randomUUID(),
    nombre: "Camiseta Orsai",
    descripcion: "Camiseta verde de la comunidad.",
    categoria: "camisetas",
    precio: 39.9,
    stock: 10,
    activo: true,
  },
  {
    id: randomUUID(),
    nombre: "Balón Match",
    descripcion: "Balón de fútbol talla 5.",
    categoria: "balones",
    precio: 24.9,
    stock: 8,
    activo: true,
  },
];

export class ComunidadRepository extends RepositorioJson {
  #publicaciones;
  #comentarios;
  #productos;
  #carritos;
  #pedidos;

  constructor(archivo, datos) {
    super(archivo);
    this.#cargarEstado(datos);
  }

  static async crear(archivo, datosIniciales) {
    let datos;
    let archivoFaltante;
    try {
      const resultado = await RepositorioJson.leerArchivo(archivo, () =>
        datosIniciales
          ? JSON.parse(JSON.stringify(datosIniciales))
          : {
              publicaciones: [],
              comentarios: [],
              productos: crearProductosIniciales(),
              carritos: {},
              pedidos: [],
            },
      );
      datos = resultado.datos;
      archivoFaltante = resultado.archivoFaltante;
    } catch (error) {
      throw new Error("No se pudo leer el archivo de la comunidad.", {
        cause: error,
      });
    }

    const repo = new ComunidadRepository(archivo, datos);
    if (archivoFaltante) {
      await repo.guardarDatos(repo.#serializarEstado());
    }
    return repo;
  }

  #cargarEstado(datos = {}) {
    this.#publicaciones = (datos.publicaciones ?? []).map(
      (p) => new Publicacion(p),
    );
    this.#comentarios = (datos.comentarios ?? []).map(
      (c) => new Comentario(c),
    );
    this.#productos = (datos.productos ?? []).map((p) => new Producto(p));
    this.#carritos = Object.fromEntries(
      Object.entries(datos.carritos ?? {}).map(([usuarioId, lineas]) => [
        usuarioId,
        (lineas ?? []).map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
        })),
      ]),
    );
    this.#pedidos = (datos.pedidos ?? []).map((p) => new Pedido(p));
  }

  #serializarEstado() {
    return {
      publicaciones: this.#publicaciones.map((p) => p.toJSON()),
      comentarios: this.#comentarios.map((c) => c.toJSON()),
      productos: this.#productos.map((p) => p.toJSON()),
      carritos: Object.fromEntries(
        Object.entries(this.#carritos).map(([usuarioId, lineas]) => [
          usuarioId,
          lineas.map((item) => ({ ...item })),
        ]),
      ),
      pedidos: this.#pedidos.map((p) => p.toJSON()),
    };
  }

  async #modificar(operacion) {
    return this.ejecutarEnCola(async () => {
      const instantanea = this.#serializarEstado();
      let resultado;
      try {
        resultado = await operacion();
        await this.guardarDatos(this.#serializarEstado());
      } catch (error) {
        this.#cargarEstado(instantanea);
        throw error;
      }
      return resultado;
    });
  }

  listarPublicaciones() {
    return [...this.#publicaciones]
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
      .map((p) => p.toJSON());
  }

  buscarPublicacion(id) {
    return this.#publicaciones.find((p) => p.id === id)?.toJSON() || null;
  }

  listarPublicacionesDeUsuario(usuarioId) {
    return this.listarPublicaciones().filter((p) => p.autorId === usuarioId);
  }

  async crearPublicacion(datos) {
    const publicacion = new Publicacion({ id: randomUUID(), ...datos });
    await this.#modificar(() => {
      this.#publicaciones.push(publicacion);
    });
    return publicacion.toJSON();
  }

  async actualizarPublicacion(id, datos) {
    let publicacionActualizada = null;
    await this.#modificar(() => {
      const indice = this.#publicaciones.findIndex(
        (publicacion) => publicacion.id === id,
      );
      if (indice === -1) return;

      publicacionActualizada = new Publicacion({
        ...this.#publicaciones[indice].toJSON(),
        ...datos,
      });
      this.#publicaciones[indice] = publicacionActualizada;
    });
    return publicacionActualizada?.toJSON() || null;
  }

  listarComentarios(publicacionId) {
    return this.#comentarios
      .filter((c) => c.publicacionId === publicacionId)
      .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
      .map((c) => c.toJSON());
  }

  listarComentariosDeUsuario(usuarioId) {
    return this.#comentarios
      .filter((c) => c.autorId === usuarioId)
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
      .map((c) => ({
        ...c.toJSON(),
        tituloPublicacion:
          this.buscarPublicacion(c.publicacionId)?.titulo ||
          "Publicación eliminada",
      }));
  }

  buscarComentario(id) {
    return this.#comentarios.find((c) => c.id === id)?.toJSON() || null;
  }

  async crearComentario(datos) {
    const comentario = new Comentario({ id: randomUUID(), ...datos });
    await this.#modificar(() => {
      this.#comentarios.push(comentario);
    });
    return comentario.toJSON();
  }

  async borrarPublicacion(id) {
    await this.#modificar(() => {
      this.#publicaciones = this.#publicaciones.filter((p) => p.id !== id);
      this.#comentarios = this.#comentarios.filter(
        (c) => c.publicacionId !== id,
      );
    });
  }

  async borrarComentario(id) {
    await this.#modificar(() => {
      this.#comentarios = this.#comentarios.filter((c) => c.id !== id);
    });
  }

  listarProductos() {
    return this.#productos.filter((p) => p.activo).map((p) => p.toJSON());
  }

  buscarProducto(id) {
    return (
      this.#productos.find((p) => p.id === id && p.activo)?.toJSON() || null
    );
  }

  async agregarProducto(datos) {
    const producto = new Producto({ id: randomUUID(), ...datos, activo: true });
    await this.#modificar(() => {
      this.#productos.push(producto);
    });
    return producto.toJSON();
  }

  async borrarProducto(id) {
    if (!this.buscarProducto(id)) return false;
    await this.#modificar(() => {
      this.#productos = this.#productos.filter((p) => p.id !== id);
      for (const [usuarioId, carrito] of Object.entries(this.#carritos)) {
        this.#carritos[usuarioId] = carrito.filter(
          (linea) => linea.productoId !== id,
        );
      }
    });
    return true;
  }

  obtenerCarrito(usuarioId) {
    return (this.#carritos[usuarioId] || []).map((linea) => ({ ...linea }));
  }

  async guardarCarrito(usuarioId, carrito) {
    await this.#modificar(() => {
      this.#carritos[usuarioId] = carrito.map((linea) => ({
        productoId: linea.productoId,
        cantidad: linea.cantidad,
      }));
    });
    return this.obtenerCarrito(usuarioId);
  }

  async registrarPedido(usuarioId, datosPedido, descuentosStock) {
    let pedido;
    await this.#modificar(() => {
      pedido = new Pedido({ id: randomUUID(), usuarioId, ...datosPedido });
      for (const { productoId, cantidad } of descuentosStock) {
        const producto = this.#productos.find((p) => p.id === productoId);
        if (producto) producto.descontarStock(cantidad);
      }
      this.#pedidos.push(pedido);
      this.#carritos[usuarioId] = [];
    });
    return pedido.toJSON();
  }

  listarPedidosDeUsuario(usuarioId) {
    return this.#pedidos
      .filter((p) => p.usuarioId === usuarioId)
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
      .map((p) => p.toJSON());
  }
}

export default ComunidadRepository;
