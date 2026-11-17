const estado = document.querySelector("#estado-perfil");
const nombre = document.querySelector("#nombre-perfil");
const equipo = document.querySelector("#equipo-perfil");
const correo = document.querySelector("#correo-perfil");
const listaPublicaciones = document.querySelector("#publicaciones-perfil");
const listaComentarios = document.querySelector("#comentarios-perfil");
const seccionPedidos = document.querySelector("#seccion-pedidos-perfil");
const listaPedidos = document.querySelector("#pedidos-perfil");

const formatoDolares = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

async function solicitar(url) {
  const respuesta = await fetch(url);
  const resultado = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(resultado.error || "No se pudo cargar el perfil.");
  }
  return resultado;
}

function mostrarListaVacia(contenedor, texto) {
  const mensaje = document.createElement("p");
  mensaje.textContent = texto;
  contenedor.append(mensaje);
}

function renderizarPublicaciones(publicaciones) {
  listaPublicaciones.replaceChildren();
  if (publicaciones.length === 0) {
    mostrarListaVacia(listaPublicaciones, "Este usuario todavía no publicó.");
    return;
  }

  for (const publicacion of publicaciones) {
    const articulo = document.createElement("article");
    const titulo = document.createElement("h3");
    const texto = document.createElement("p");
    const fecha = document.createElement("time");

    titulo.textContent = publicacion.titulo;
    texto.textContent = publicacion.texto;
    fecha.dateTime = publicacion.creadaEn;
    fecha.textContent = new Date(publicacion.creadaEn).toLocaleString("es-AR");
    articulo.append(titulo, texto, fecha);
    listaPublicaciones.append(articulo);
  }
}

function renderizarComentarios(comentarios) {
  listaComentarios.replaceChildren();
  if (comentarios.length === 0) {
    mostrarListaVacia(listaComentarios, "Este usuario todavía no comentó.");
    return;
  }

  for (const comentario of comentarios) {
    const articulo = document.createElement("article");
    const titulo = document.createElement("h3");
    const texto = document.createElement("p");
    const enlace = document.createElement("a");

    titulo.textContent = comentario.tituloPublicacion;
    texto.textContent = comentario.texto;
    enlace.href = "foro.html";
    enlace.textContent = "Ir al foro";
    articulo.append(titulo, texto, enlace);
    listaComentarios.append(articulo);
  }
}

function renderizarPedidos(pedidos) {
  listaPedidos.replaceChildren();
  if (pedidos.length === 0) {
    mostrarListaVacia(listaPedidos, "Todavía no realizaste compras.");
    return;
  }

  for (const pedido of pedidos) {
    const articulo = document.createElement("article");
    const titulo = document.createElement("h3");
    const lista = document.createElement("ul");
    titulo.textContent =
      `Compra ${pedido.id.slice(0, 8)} — ${formatoDolares.format(pedido.total)}`;

    for (const linea of pedido.lineas) {
      const item = document.createElement("li");
      item.textContent =
        `${linea.nombre}: ${linea.cantidad} × ` +
        `${formatoDolares.format(linea.precio)}`;
      lista.append(item);
    }

    articulo.append(titulo, lista);
    listaPedidos.append(articulo);
  }
}

async function cargarPerfil() {
  const id = new URLSearchParams(window.location.search).get("id");
  const propio = !id;
  const resultado = await solicitar(
    propio ? "/api/me/profile" : `/api/users/${encodeURIComponent(id)}`,
  );

  nombre.textContent = resultado.perfil.name;
  equipo.textContent = resultado.perfil.favoriteTeam
    ? `Equipo favorito: ${resultado.perfil.favoriteTeam}`
    : "No indicó un equipo favorito.";
  correo.textContent = propio ? `Correo: ${resultado.perfil.email}` : "";
  correo.hidden = !propio;
  document.title = `Perfil de ${resultado.perfil.name} · Orsai.`;

  renderizarPublicaciones(resultado.publicaciones);
  renderizarComentarios(resultado.comentarios);

  if (propio) {
    seccionPedidos.hidden = false;
    renderizarPedidos(resultado.pedidos);
  }
}

cargarPerfil().catch((error) => {
  estado.textContent = error.message;
  nombre.textContent = "No se pudo cargar el perfil";
});
