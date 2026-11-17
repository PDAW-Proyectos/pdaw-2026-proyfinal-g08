const listaProductos = document.querySelector("#lista-productos");
const contenidoCarrito = document.querySelector("#contenido-carrito");
const totalCarrito = document.querySelector("#total-carrito");
const estadoTienda = document.querySelector("#estado-tienda");
const formularioProducto = document.querySelector("#form-producto");
const seccionAdmin = document.querySelector("#seccion-admin-productos");
const historialPedidos = document.querySelector("#historial-pedidos");

let usuarioActual = null;
let categoriaActiva = "todos";

const formatoDolares = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

async function solicitar(url, opciones = {}) {
  const respuesta = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...opciones,
  });

  if (respuesta.status === 204) return null;

  const resultado = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(resultado.error || "No se pudo completar la solicitud.");
  }

  return resultado;
}

async function cargarProductos() {
  const resultado = await solicitar("/api/products");
  listaProductos.replaceChildren();

  const productos = resultado.productos.filter(
    (producto) =>
      categoriaActiva === "todos" || producto.categoria === categoriaActiva,
  );

  if (productos.length === 0) {
    const mensaje = document.createElement("p");
    mensaje.textContent = "No hay productos en esta categoría.";
    listaProductos.append(mensaje);
    return;
  }

  const orden = document.querySelector("#orden-productos")?.value;
  if (orden === "price-asc") {
    productos.sort((a, b) => a.precio - b.precio);
  } else if (orden === "price-desc") {
    productos.sort((a, b) => b.precio - a.precio);
  }

  for (const producto of productos) {
    const tarjeta = document.createElement("article");
    const detalle = document.createElement("div");
    const categoria = document.createElement("p");
    const titulo = document.createElement("h3");
    const descripcion = document.createElement("p");
    const filaPrecio = document.createElement("div");
    const precio = document.createElement("strong");
    const stock = document.createElement("p");
    const botonAgregar = document.createElement("button");

    tarjeta.className = "tarjeta-producto";
    detalle.className = "producto-detalle";
    categoria.className = "producto-categoria";
    categoria.textContent = producto.categoria;
    titulo.textContent = producto.nombre;
    titulo.className = "h3";
    descripcion.textContent = producto.descripcion;
    precio.textContent = formatoDolares.format(producto.precio);
    filaPrecio.className = "producto-precio-fila";
    filaPrecio.append(precio);
    stock.textContent = `Unidades disponibles: ${producto.stock}`;
    botonAgregar.type = "button";
    botonAgregar.className = "btn boton-grada";
    botonAgregar.textContent = "Agregar una unidad al carrito";
    botonAgregar.disabled = producto.stock === 0;
    botonAgregar.addEventListener("click", async () => {
      try {
        await solicitar("/api/cart/items", {
          method: "POST",
          body: JSON.stringify({
            productoId: producto.id,
            cantidad: 1,
          }),
        });
        estadoTienda.textContent = `${producto.nombre} agregado al carrito.`;
        await cargarCarrito();
      } catch (error) {
        estadoTienda.textContent = error.message;
      }
    });

    detalle.append(
      categoria,
      titulo,
      descripcion,
      filaPrecio,
      stock,
      botonAgregar,
    );
    tarjeta.append(detalle);

    if (usuarioActual?.role === "admin") {
      const botonEliminar = document.createElement("button");
      botonEliminar.type = "button";
      botonEliminar.className = "btn boton-contorno-grada mt-2";
      botonEliminar.textContent = `Eliminar ${producto.nombre}`;
      botonEliminar.addEventListener("click", async () => {
        try {
          await solicitar(`/api/products/${producto.id}`, {
            method: "DELETE",
          });
          estadoTienda.textContent = "Producto eliminado del catálogo.";
          await cargarProductos();
          await cargarCarrito();
        } catch (error) {
          estadoTienda.textContent = error.message;
        }
      });
      tarjeta.append(botonEliminar);
    }

    listaProductos.append(tarjeta);
  }
}

async function cargarCarrito() {
  contenidoCarrito.replaceChildren();
  totalCarrito.textContent = "";

  let resultado;
  try {
    resultado = await solicitar("/api/cart");
  } catch (error) {
    if (error.message.includes("iniciar sesión")) {
      contenidoCarrito.textContent =
        "Iniciá sesión para ver y usar tu carrito.";
      return;
    }
    throw error;
  }

  if (resultado.lineas.length === 0) {
    contenidoCarrito.textContent = "Tu carrito está vacío.";
    return;
  }

  let total = 0;
  for (const linea of resultado.lineas) {
    const grupo = document.createElement("div");
    const nombre = document.createElement("p");
    const cantidadLabel = document.createElement("label");
    const cantidad = document.createElement("input");
    const actualizar = document.createElement("button");
    const quitar = document.createElement("button");
    const subtotal = linea.producto.precio * linea.cantidad;

    total += subtotal;
    nombre.textContent =
      `${linea.producto.nombre} — ${formatoDolares.format(subtotal)}`;
    cantidadLabel.htmlFor = `cantidad-${linea.producto.id}`;
    cantidadLabel.textContent = `Cantidad de ${linea.producto.nombre}`;
    cantidad.id = cantidadLabel.htmlFor;
    cantidad.type = "number";
    cantidad.min = "1";
    cantidad.max = String(linea.producto.stock);
    cantidad.value = String(linea.cantidad);
    cantidad.className = "form-control mb-2";
    actualizar.type = "button";
    actualizar.className = "btn boton-contorno-grada me-2";
    actualizar.textContent = "Actualizar cantidad";
    quitar.type = "button";
    quitar.className = "btn boton-contorno-grada";
    quitar.textContent = `Quitar ${linea.producto.nombre}`;

    actualizar.addEventListener("click", async () => {
      try {
        await solicitar(`/api/cart/items/${linea.producto.id}`, {
          method: "PATCH",
          body: JSON.stringify({ cantidad: Number(cantidad.value) }),
        });
        estadoTienda.textContent = "Cantidad actualizada.";
        await cargarCarrito();
      } catch (error) {
        estadoTienda.textContent = error.message;
      }
    });

    quitar.addEventListener("click", async () => {
      try {
        await solicitar(`/api/cart/items/${linea.producto.id}`, {
          method: "DELETE",
        });
        estadoTienda.textContent = "Producto quitado del carrito.";
        await cargarCarrito();
      } catch (error) {
        estadoTienda.textContent = error.message;
      }
    });

    grupo.className = "mb-3";
    grupo.append(nombre, cantidadLabel, cantidad, actualizar, quitar);
    contenidoCarrito.append(grupo);
  }

  totalCarrito.textContent =
    `Total aproximado: ${formatoDolares.format(
      Math.round((total + Number.EPSILON) * 100) / 100,
    )}. El total definitivo lo calcula el servidor.`;
}

async function cargarPedidos() {
  historialPedidos.replaceChildren();
  try {
    const resultado = await solicitar("/api/orders");
    if (resultado.pedidos.length === 0) {
      historialPedidos.textContent = "Todavía no realizaste compras.";
      return;
    }

    for (const pedido of resultado.pedidos) {
      const articulo = document.createElement("article");
      const titulo = document.createElement("h3");
      const fecha = document.createElement("time");
      const lineas = document.createElement("ul");

      articulo.className = "mb-3";
      titulo.textContent =
        `Compra ${pedido.id.slice(0, 8)} — ${formatoDolares.format(pedido.total)}`;
      fecha.dateTime = pedido.creadoEn;
      fecha.textContent = new Date(pedido.creadoEn).toLocaleString("es-AR");

      for (const linea of pedido.lineas) {
        const elemento = document.createElement("li");
        elemento.textContent =
          `${linea.nombre}: ${linea.cantidad} × ` +
          `${formatoDolares.format(linea.precio)}`;
        lineas.append(elemento);
      }

      articulo.append(titulo, fecha, lineas);
      historialPedidos.append(articulo);
    }
  } catch (error) {
    if (error.message.includes("iniciar sesión")) {
      historialPedidos.textContent =
        "Iniciá sesión para consultar tus compras.";
      return;
    }
    throw error;
  }
}

async function actualizarVista() {
  seccionAdmin.hidden = usuarioActual?.role !== "admin";
  await Promise.all([cargarProductos(), cargarCarrito(), cargarPedidos()]);
}

formularioProducto.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = new FormData(formularioProducto);

  try {
    await solicitar("/api/products", {
      method: "POST",
      body: JSON.stringify({
        nombre: datos.get("nombre"),
        descripcion: datos.get("descripcion"),
        categoria: datos.get("categoria"),
        precio: Number(datos.get("precio")),
        stock: Number(datos.get("stock")),
      }),
    });

    formularioProducto.reset();
    estadoTienda.textContent = "Producto agregado al catálogo.";
    await cargarProductos();
  } catch (error) {
    estadoTienda.textContent = error.message;
  }
});

document
  .querySelector("#boton-vaciar-carrito")
  .addEventListener("click", async () => {
    try {
      await solicitar("/api/cart", { method: "DELETE" });
      estadoTienda.textContent = "Carrito vacío.";
      await cargarCarrito();
    } catch (error) {
      estadoTienda.textContent = error.message;
    }
  });

document
  .querySelector("#boton-finalizar-compra")
  .addEventListener("click", async () => {
    try {
      const resultado = await solicitar("/api/cart/checkout", {
        method: "POST",
      });
      estadoTienda.textContent =
        `Compra de prueba registrada por ${formatoDolares.format(
          resultado.pedido.total,
        )}.`;
      await actualizarVista();
    } catch (error) {
      estadoTienda.textContent = error.message;
    }
  });

document.querySelectorAll("[data-categoria]").forEach((boton) => {
  boton.addEventListener("click", () => {
    categoriaActiva = boton.dataset.categoria;
    document.querySelectorAll("[data-categoria]").forEach((opcion) => {
      const seleccionado = opcion === boton;
      opcion.classList.toggle("activa", seleccionado);
      opcion.setAttribute("aria-pressed", String(seleccionado));
    });
    cargarProductos().catch((error) => {
      estadoTienda.textContent = error.message;
    });
  });
});

document.querySelector("#orden-productos")?.addEventListener("change", () => {
  cargarProductos().catch((error) => {
    estadoTienda.textContent = error.message;
  });
});

window.addEventListener("auth:changed", (evento) => {
  usuarioActual = evento.detail.user;
  actualizarVista().catch((error) => {
    estadoTienda.textContent = error.message;
  });
});

solicitar("/api/me")
  .then((resultado) => {
    usuarioActual = resultado.user;
  })
  .catch((error) => {
    if (!error.message.includes("iniciar sesión")) {
      estadoTienda.textContent = error.message;
    }
  })
  .finally(() => {
    actualizarVista().catch((error) => {
      estadoTienda.textContent = error.message;
    });
  });
