import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const productosIniciales = [
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

const redondearDolares = (valor) =>
  Math.round((valor + Number.EPSILON) * 100) / 100;

const errorDeRegla = (mensaje) => {
  const error = new Error(mensaje);
  error.code = "community_rule";
  return error;
};

export async function crearRepositorioComunidad(archivo) {
  await fs.mkdir(path.dirname(archivo), { recursive: true });

  let datos;

  try {
    datos = JSON.parse(await fs.readFile(archivo, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new Error("No se pudo leer el archivo de la comunidad.", {
        cause: error,
      });
    }

    datos = {
      publicaciones: [],
      comentarios: [],
      productos: productosIniciales,
      carritos: {},
      pedidos: [],
    };
    await fs.writeFile(archivo, JSON.stringify(datos, null, 2), "utf8");
  }

  if (
    !Array.isArray(datos.publicaciones) ||
    !Array.isArray(datos.comentarios) ||
    !Array.isArray(datos.productos) ||
    !datos.carritos ||
    typeof datos.carritos !== "object" ||
    Array.isArray(datos.carritos) ||
    !Array.isArray(datos.pedidos)
  ) {
    throw new Error("El archivo de la comunidad tiene un formato inválido.");
  }

  for (const producto of datos.productos) {
    if (!producto.categoria) {
      const nombre = producto.nombre?.toLowerCase() || "";
      producto.categoria = nombre.includes("camiseta")
        ? "camisetas"
        : nombre.includes("bot")
          ? "botas"
          : nombre.includes("bal")
            ? "balones"
            : "accesorios";
    }
  }

  let colaEscrituras = Promise.resolve();

  async function modificar(operacion) {
    const siguiente = colaEscrituras.then(async () => {
      const borrador = JSON.parse(JSON.stringify(datos));
      const resultado = await operacion(borrador);
      const archivoTemporal = `${archivo}.${randomUUID()}.tmp`;

      try {
        await fs.writeFile(archivoTemporal, JSON.stringify(borrador, null, 2), {
          encoding: "utf8",
          mode: 0o600,
        });
        await fs.rename(archivoTemporal, archivo);
      } catch (error) {
        await fs.unlink(archivoTemporal).catch((errorLimpieza) => {
          if (errorLimpieza.code !== "ENOENT") throw errorLimpieza;
        });
        throw error;
      }

      datos = borrador;
      return resultado;
    });

    colaEscrituras = siguiente.catch(() => {});
    return siguiente;
  }

  return {
    listarPublicaciones() {
      return [...datos.publicaciones].sort((a, b) =>
        b.creadaEn.localeCompare(a.creadaEn),
      );
    },

    buscarPublicacion(id) {
      return datos.publicaciones.find((publicacion) => publicacion.id === id) || null;
    },

    listarPublicacionesDeUsuario(usuarioId) {
      return this.listarPublicaciones().filter(
        (publicacion) => publicacion.autorId === usuarioId,
      );
    },

    async crearPublicacion(usuario, titulo, texto) {
      const publicacion = {
        id: randomUUID(),
        autorId: usuario.id,
        autorNombre: usuario.name,
        titulo,
        texto,
        creadaEn: new Date().toISOString(),
      };

      await modificar((borrador) => {
        borrador.publicaciones.push(publicacion);
      });

      return publicacion;
    },

    listarComentarios(publicacionId) {
      return datos.comentarios
        .filter((comentario) => comentario.publicacionId === publicacionId)
        .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
    },

    listarComentariosDeUsuario(usuarioId) {
      return datos.comentarios
        .filter((comentario) => comentario.autorId === usuarioId)
        .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
        .map((comentario) => ({
          ...comentario,
          tituloPublicacion:
            this.buscarPublicacion(comentario.publicacionId)?.titulo ||
            "Publicación eliminada",
        }));
    },

    buscarComentario(id) {
      return datos.comentarios.find((comentario) => comentario.id === id) || null;
    },

    async crearComentario(usuario, publicacionId, texto) {
      const comentario = {
        id: randomUUID(),
        publicacionId,
        autorId: usuario.id,
        autorNombre: usuario.name,
        texto,
        creadoEn: new Date().toISOString(),
      };

      await modificar((borrador) => {
        borrador.comentarios.push(comentario);
      });

      return comentario;
    },

    async borrarPublicacion(id) {
      await modificar((borrador) => {
        borrador.publicaciones = borrador.publicaciones.filter(
          (publicacion) => publicacion.id !== id,
        );
        borrador.comentarios = borrador.comentarios.filter(
          (comentario) => comentario.publicacionId !== id,
        );
      });
    },

    async borrarComentario(id) {
      await modificar((borrador) => {
        borrador.comentarios = borrador.comentarios.filter(
          (comentario) => comentario.id !== id,
        );
      });
    },

    listarProductos() {
      return datos.productos.filter((producto) => producto.activo);
    },

    buscarProducto(id) {
      return datos.productos.find(
        (producto) => producto.id === id && producto.activo,
      ) || null;
    },

    async agregarProducto(nombre, descripcion, categoria, precio, stock) {
      const producto = {
        id: randomUUID(),
        nombre,
        descripcion,
        categoria,
        precio: redondearDolares(precio),
        stock,
        activo: true,
      };

      await modificar((borrador) => {
        borrador.productos.push(producto);
      });

      return producto;
    },

    async borrarProducto(id) {
      const existe = this.buscarProducto(id);
      if (!existe) return false;

      await modificar((borrador) => {
        borrador.productos = borrador.productos.filter(
          (producto) => producto.id !== id,
        );

        for (const [usuarioId, carrito] of Object.entries(borrador.carritos)) {
          borrador.carritos[usuarioId] = carrito.filter(
            (linea) => linea.productoId !== id,
          );
        }
      });

      return true;
    },

    obtenerCarrito(usuarioId) {
      return datos.carritos[usuarioId] || [];
    },

    async agregarAlCarrito(usuarioId, productoId, cantidad) {
      await modificar((borrador) => {
        const producto = borrador.productos.find(
          (candidato) => candidato.id === productoId && candidato.activo,
        );
        if (!producto) {
          throw errorDeRegla("Producto no encontrado.");
        }

        const carrito = borrador.carritos[usuarioId] || [];
        const linea = carrito.find((item) => item.productoId === productoId);
        const nuevaCantidad = (linea?.cantidad || 0) + cantidad;

        if (nuevaCantidad > producto.stock) {
          throw errorDeRegla("No hay suficiente stock disponible.");
        }

        if (linea) {
          linea.cantidad = nuevaCantidad;
        } else {
          carrito.push({ productoId, cantidad });
        }

        borrador.carritos[usuarioId] = carrito;
      });

      return this.obtenerCarrito(usuarioId);
    },

    async actualizarCantidadCarrito(usuarioId, productoId, cantidad) {
      await modificar((borrador) => {
        const producto = borrador.productos.find(
          (candidato) => candidato.id === productoId && candidato.activo,
        );
        if (!producto) {
          throw errorDeRegla("Producto no encontrado.");
        }
        if (cantidad > producto.stock) {
          throw errorDeRegla("No hay suficiente stock disponible.");
        }

        const carrito = borrador.carritos[usuarioId] || [];
        const linea = carrito.find((item) => item.productoId === productoId);

        if (!linea) {
          throw errorDeRegla("El producto no está en el carrito.");
        }

        linea.cantidad = cantidad;
      });

      return this.obtenerCarrito(usuarioId);
    },

    async quitarDelCarrito(usuarioId, productoId) {
      await modificar((borrador) => {
        borrador.carritos[usuarioId] = (
          borrador.carritos[usuarioId] || []
        ).filter((linea) => linea.productoId !== productoId);
      });
    },

    async vaciarCarrito(usuarioId) {
      await modificar((borrador) => {
        borrador.carritos[usuarioId] = [];
      });
    },

    async finalizarCompra(usuarioId) {
      let pedidoCreado;

      await modificar((borrador) => {
        const carrito = borrador.carritos[usuarioId] || [];

        if (carrito.length === 0) {
          throw errorDeRegla("El carrito está vacío.");
        }

        const lineasPedido = carrito.map((item) => {
          const producto = borrador.productos.find(
            (candidato) =>
              candidato.id === item.productoId && candidato.activo,
          );

          if (!producto || item.cantidad > producto.stock) {
            throw errorDeRegla(
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

        const total = redondearDolares(
          lineasPedido.reduce(
            (suma, linea) => suma + linea.precio * linea.cantidad,
            0,
          ),
        );

        pedidoCreado = {
          id: randomUUID(),
          usuarioId,
          lineas: lineasPedido,
          total,
          moneda: "USD",
          creadoEn: new Date().toISOString(),
        };

        for (const linea of lineasPedido) {
          const producto = borrador.productos.find(
            (candidato) => candidato.id === linea.productoId,
          );
          producto.stock -= linea.cantidad;
        }

        borrador.pedidos.push(pedidoCreado);
        borrador.carritos[usuarioId] = [];
      });

      return pedidoCreado;
    },

    listarPedidosDeUsuario(usuarioId) {
      return datos.pedidos
        .filter((pedido) => pedido.usuarioId === usuarioId)
        .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
    },
  };
}
