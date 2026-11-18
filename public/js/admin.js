const listaProductos = document.querySelector("#lista-productos-admin");
const listaPublicaciones = document.querySelector("#lista-publicaciones-admin");
const listaUsuarios = document.querySelector("#lista-usuarios-admin");
const formularioProducto = document.querySelector("#form-producto");
const estadoAdmin = document.querySelector("#estado-admin");

const formatoPuntos = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
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

function mostrarVacio(contenedor, mensaje) {
  const aviso = document.createElement("p");
  aviso.className = "mb-0 atenuado";
  aviso.textContent = mensaje;
  contenedor.replaceChildren(aviso);
}

async function cargarProductos() {
  const { productos } = await solicitar("/api/products");
  listaProductos.replaceChildren();

  if (productos.length === 0) {
    mostrarVacio(listaProductos, "Todavía no hay productos en el catálogo.");
    return;
  }

  for (const producto of productos) {
    const tarjeta = document.createElement("article");
    const encabezado = document.createElement("div");
    const nombre = document.createElement("h3");
    const detalle = document.createElement("p");
    const botonEliminar = document.createElement("button");

    tarjeta.className = "admin-item";
    encabezado.className = "admin-item-encabezado";
    nombre.className = "admin-item-titulo";
    nombre.textContent = producto.nombre;
    detalle.className = "admin-item-detalle";
    detalle.textContent =
      `${producto.categoria} · ${formatoPuntos.format(producto.precio)} puntos · ` +
      `${producto.stock} unidades en stock`;
    botonEliminar.type = "button";
    botonEliminar.className = "btn btn-sm boton-contorno-grada";
    botonEliminar.textContent = "Eliminar producto";
    botonEliminar.addEventListener("click", async () => {
      if (!window.confirm(`¿Eliminar ${producto.nombre} del catálogo?`)) return;
      try {
        await solicitar(`/api/products/${producto.id}`, { method: "DELETE" });
        estadoAdmin.textContent = "Producto eliminado.";
        await cargarProductos();
      } catch (error) {
        estadoAdmin.textContent = error.message;
      }
    });

    encabezado.append(nombre, botonEliminar);
    tarjeta.append(encabezado, detalle);
    listaProductos.append(tarjeta);
  }
}

async function cargarPublicaciones() {
  const { publicaciones } = await solicitar("/api/admin/posts");
  listaPublicaciones.replaceChildren();

  if (publicaciones.length === 0) {
    mostrarVacio(listaPublicaciones, "Todavía no hay publicaciones.");
    return;
  }

  for (const publicacion of publicaciones) {
    const tarjeta = document.createElement("article");
    const encabezado = document.createElement("div");
    const titulo = document.createElement("h3");
    const autor = document.createElement("p");
    const texto = document.createElement("p");
    const respuestas = document.createElement("p");
    const botonEliminar = document.createElement("button");

    tarjeta.className = "admin-item";
    encabezado.className = "admin-item-encabezado";
    titulo.className = "admin-item-titulo";
    titulo.textContent = publicacion.titulo;
    autor.className = "admin-item-detalle";
    autor.textContent =
      `Por ${publicacion.autorNombre} · ` +
      new Date(publicacion.creadaEn).toLocaleString("es-AR");
    texto.className = "admin-item-texto";
    texto.textContent = publicacion.texto;
    respuestas.className = "admin-item-detalle";
    respuestas.textContent = `${publicacion.comentarios.length} comentarios`;
    botonEliminar.type = "button";
    botonEliminar.className = "btn btn-sm boton-contorno-grada";
    botonEliminar.textContent = "Eliminar publicación";
    botonEliminar.addEventListener("click", async () => {
      if (!window.confirm(`¿Eliminar la publicación "${publicacion.titulo}"?`))
        return;
      try {
        await solicitar(`/api/forum/posts/${publicacion.id}`, {
          method: "DELETE",
        });
        estadoAdmin.textContent = "Publicación eliminada.";
        await cargarPublicaciones();
      } catch (error) {
        estadoAdmin.textContent = error.message;
      }
    });

    encabezado.append(titulo, botonEliminar);
    tarjeta.append(encabezado, autor, texto, respuestas);
    listaPublicaciones.append(tarjeta);
  }
}

function crearControlEstado(usuario) {
  const boton = document.createElement("button");
  const nuevoEstado = usuario.status === "suspended" ? "active" : "suspended";
  boton.type = "button";
  boton.className = "btn btn-sm boton-contorno-grada";
  boton.textContent =
    nuevoEstado === "active" ? "Quitar suspensión" : "Suspender cuenta";
  boton.addEventListener("click", async () => {
    const mensaje =
      nuevoEstado === "active"
        ? `¿Reactivar la cuenta de ${usuario.name}?`
        : `¿Suspender temporalmente la cuenta de ${usuario.name}?`;
    if (!window.confirm(mensaje)) return;

    try {
      await solicitar(`/api/admin/users/${usuario.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nuevoEstado }),
      });
      estadoAdmin.textContent =
        nuevoEstado === "active" ? "Cuenta reactivada." : "Cuenta suspendida.";
      await cargarUsuarios();
    } catch (error) {
      estadoAdmin.textContent = error.message;
    }
  });
  return boton;
}

function crearControlEliminacion(usuario) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "btn btn-sm btn-outline-danger";
  boton.textContent = "Eliminar cuenta";
  boton.addEventListener("click", async () => {
    if (
      !window.confirm(
        `¿Eliminar la cuenta de ${usuario.name}? Su nombre se reemplazará por ` +
          '"Cuenta borrada", se conservará su correo para administración y su ' +
          "contenido dejará de ser público.",
      )
    ) {
      return;
    }

    try {
      await solicitar(`/api/admin/users/${usuario.id}`, { method: "DELETE" });
      estadoAdmin.textContent = "Cuenta eliminada de la vista pública.";
      await cargarUsuarios();
    } catch (error) {
      estadoAdmin.textContent = error.message;
    }
  });
  return boton;
}

async function cargarUsuarios() {
  const { usuarios } = await solicitar("/api/admin/users");
  listaUsuarios.replaceChildren();

  if (usuarios.length === 0) {
    mostrarVacio(listaUsuarios, "Todavía no hay usuarios registrados.");
    return;
  }

  for (const usuario of usuarios) {
    const tarjeta = document.createElement("article");
    const encabezado = document.createElement("div");
    const nombre = document.createElement("h3");
    const estado = document.createElement("span");
    const correo = document.createElement("p");
    const equipo = document.createElement("p");
    const alta = document.createElement("p");
    const cambioEstado = document.createElement("p");
    const acciones = document.createElement("div");

    tarjeta.className = "admin-item";
    encabezado.className = "admin-item-encabezado";
    nombre.className = "admin-item-titulo";
    nombre.textContent = usuario.name;
    estado.className = `admin-estado admin-estado-${usuario.status}`;
    estado.textContent =
      usuario.status === "suspended"
        ? "Suspendida"
        : usuario.status === "deleted"
          ? "Eliminada"
          : usuario.role === "admin"
            ? "Administrador"
            : "Activa";
    correo.className = "admin-item-detalle";
    correo.textContent = `Correo: ${usuario.email}`;
    equipo.className = "admin-item-detalle";
    equipo.textContent = usuario.favoriteTeam
      ? `Equipo favorito: ${usuario.favoriteTeam}`
      : "Sin equipo favorito";
    alta.className = "admin-item-detalle";
    alta.textContent = usuario.createdAt
      ? `Alta: ${new Date(usuario.createdAt).toLocaleString("es-AR")}`
      : "Fecha de alta no disponible";
    cambioEstado.className = "admin-item-detalle";
    cambioEstado.textContent =
      usuario.status === "deleted" && usuario.deletedAt
        ? `Eliminada: ${new Date(usuario.deletedAt).toLocaleString("es-AR")}`
        : usuario.statusChangedAt
          ? `Estado actualizado: ${new Date(usuario.statusChangedAt).toLocaleString("es-AR")}`
          : "";
    acciones.className = "admin-acciones";

    encabezado.append(nombre, estado);
    tarjeta.append(encabezado, correo, equipo, alta);
    if (cambioEstado.textContent) tarjeta.append(cambioEstado);
    if (usuario.role !== "admin" && usuario.status !== "deleted") {
      acciones.append(
        crearControlEstado(usuario),
        crearControlEliminacion(usuario),
      );
      tarjeta.append(acciones);
    }
    listaUsuarios.append(tarjeta);
  }
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
    estadoAdmin.textContent = "Producto agregado al catálogo.";
    await cargarProductos();
  } catch (error) {
    estadoAdmin.textContent = error.message;
  }
});

Promise.all([cargarProductos(), cargarPublicaciones(), cargarUsuarios()]).catch(
  (error) => {
    estadoAdmin.textContent = error.message;
  },
);
