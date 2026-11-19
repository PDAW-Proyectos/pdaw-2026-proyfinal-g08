const formularioPublicacion = document.querySelector("#form-publicacion");
const listaPublicaciones = document.querySelector("#lista-publicaciones");
const estadoForo = document.querySelector("#estado-foro");
const avisoInicioSesion = document.querySelector("#aviso-inicio-sesion");
const busquedaPublicaciones = document.querySelector("#busqueda-publicaciones");

let usuarioActual = null;
let cargaPublicacionesActual = 0;

async function solicitar(url, opciones = {}) {
  const respuesta = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...opciones,
  });

  if (respuesta.status === 204) return null;

  const resultado = await respuesta.json();
  if (!respuesta.ok) {
    const error = new Error(
      resultado.error || "No se pudo completar la solicitud.",
    );
    error.status = respuesta.status;
    throw error;
  }

  return resultado;
}

function crearEnlacePerfil(usuarioId, nombre) {
  const enlace = document.createElement("a");
  enlace.href = `perfil.html?id=${encodeURIComponent(usuarioId)}`;
  enlace.textContent = nombre || "Usuario";
  return enlace;
}

async function borrarComentario(comentarioId) {
  await solicitar(`/api/forum/comments/${comentarioId}`, {
    method: "DELETE",
  });
  estadoForo.textContent = "Comentario eliminado.";
  await cargarPublicaciones();
}

async function mostrarComentarios(publicacion, comentarios, articulo) {
  const seccion = document.createElement("section");
  const titulo = document.createElement("h4");
  const lista = document.createElement("ul");
  const formulario = document.createElement("form");
  const etiqueta = document.createElement("label");
  const campo = document.createElement("textarea");
  const boton = document.createElement("button");

  seccion.setAttribute("aria-label", `Comentarios de ${publicacion.titulo}`);
  seccion.className = "comentarios-publicacion";
  titulo.textContent = "Comentarios";
  titulo.className = "titulo-comentarios";
  lista.className = "lista-comentarios";
  etiqueta.htmlFor = `comentario-${publicacion.id}`;
  etiqueta.textContent = "Agregar un comentario";
  campo.id = etiqueta.htmlFor;
  campo.name = "texto";
  campo.rows = 2;
  campo.maxLength = 1000;
  campo.required = true;
  campo.className = "form-control mb-2";
  formulario.className = "formulario-comentario";
  boton.type = "submit";
  boton.className = "btn boton-contorno-grada";
  boton.textContent = "Comentar";
  formulario.append(etiqueta, campo, boton);

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    try {
      await solicitar(`/api/forum/posts/${publicacion.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ texto: campo.value }),
      });
      estadoForo.textContent = "Comentario publicado.";
      await cargarPublicaciones();
    } catch (error) {
      estadoForo.textContent = error.message;
    }
  });

  if (comentarios.length === 0) {
    const vacio = document.createElement("li");
    vacio.textContent = "Todavía no hay comentarios.";
    lista.append(vacio);
  }

  for (const comentario of comentarios) {
    const elemento = document.createElement("li");
    const autor = crearEnlacePerfil(
      comentario.autorId,
      comentario.autorNombre,
    );
    const texto = document.createElement("p");
    elemento.className = "comentario-foro";
    texto.className = "texto-comentario";
    texto.textContent = comentario.texto;
    elemento.append(autor, texto);

    if (usuarioActual?.role === "admin") {
      const botonBorrar = document.createElement("button");
      botonBorrar.type = "button";
      botonBorrar.className = "btn btn-sm boton-contorno-grada mb-2";
      botonBorrar.textContent = "Eliminar comentario";
      botonBorrar.addEventListener("click", async () => {
        try {
          await borrarComentario(comentario.id);
        } catch (error) {
          estadoForo.textContent = error.message;
        }
      });
      elemento.append(botonBorrar);
    }

    lista.append(elemento);
  }

  seccion.append(titulo, lista, formulario);
  articulo.append(seccion);
}

async function mostrarPublicacion(publicacion, comentarios, destino) {
  const articulo = document.createElement("article");
  const titulo = document.createElement("h2");
  const autor = document.createElement("p");
  const texto = document.createElement("p");
  const fecha = document.createElement("time");

  articulo.className = "publicacion-foro p-3";
  titulo.className = "titulo-publicacion";
  titulo.textContent = publicacion.titulo;
  autor.className = "meta-publicacion";
  autor.append(
    document.createTextNode("Por "),
    crearEnlacePerfil(publicacion.autorId, publicacion.autorNombre),
  );
  texto.className = "texto-publicacion";
  texto.textContent = publicacion.texto;
  fecha.dateTime = publicacion.creadaEn;
  fecha.className = "fecha-publicacion";
  fecha.textContent = new Date(publicacion.creadaEn).toLocaleString("es-AR");
  articulo.append(titulo, autor, texto, fecha);

  if (usuarioActual?.role === "admin") {
    const botonBorrar = document.createElement("button");
    botonBorrar.type = "button";
    botonBorrar.className = "btn btn-sm boton-contorno-grada ms-2";
    botonBorrar.textContent = "Eliminar publicación";
    botonBorrar.addEventListener("click", async () => {
      try {
        await solicitar(`/api/forum/posts/${publicacion.id}`, {
          method: "DELETE",
        });
        estadoForo.textContent = "Publicación eliminada.";
        await cargarPublicaciones();
      } catch (error) {
        estadoForo.textContent = error.message;
      }
    });
    articulo.append(botonBorrar);
  }

  await mostrarComentarios(publicacion, comentarios, articulo);
  destino.append(articulo);
}

async function cargarPublicaciones() {
  const cargaActual = ++cargaPublicacionesActual;
  listaPublicaciones.setAttribute("aria-busy", "true");

  try {
    const resultado = await solicitar("/api/forum/posts");
    const publicaciones = await Promise.all(
      resultado.publicaciones.map(async (publicacion) => ({
        publicacion,
        comentarios: (
          await solicitar(`/api/forum/posts/${publicacion.id}/comments`)
        ).comentarios,
      })),
    );
    if (cargaActual !== cargaPublicacionesActual) return;

    const comentarios = publicaciones.flatMap((item) => item.comentarios);
    const participantes = new Set(
      [
        ...resultado.publicaciones.map((publicacion) => publicacion.autorId),
        ...comentarios.map((comentario) => comentario.autorId),
      ].filter(Boolean),
    );

    const busqueda = busquedaPublicaciones.value.trim().toLocaleLowerCase();
    const filtradas = publicaciones.filter(({ publicacion }) =>
      [
        publicacion.titulo,
        publicacion.texto,
        publicacion.autorNombre,
      ].some((valor) => valor?.toLocaleLowerCase().includes(busqueda)),
    );
    const contenido = document.createDocumentFragment();

    document.querySelector("#conteo-publicaciones").textContent =
      String(resultado.publicaciones.length);
    document.querySelector("#conteo-comentarios").textContent =
      String(comentarios.length);
    document.querySelector("#conteo-participantes").textContent =
      String(participantes.size);

    if (filtradas.length === 0) {
      const vacio = document.createElement("p");
      vacio.className = "p-3";
      vacio.textContent = resultado.publicaciones.length
        ? "No hay publicaciones que coincidan con la búsqueda."
        : "Todavía no hay publicaciones. ¡Creá la primera!";
      contenido.append(vacio);
    }

    for (const item of filtradas) {
      await mostrarPublicacion(item.publicacion, item.comentarios, contenido);
      if (cargaActual !== cargaPublicacionesActual) return;
    }

    listaPublicaciones.replaceChildren(contenido);
  } finally {
    if (cargaActual === cargaPublicacionesActual) {
      listaPublicaciones.setAttribute("aria-busy", "false");
    }
  }
}

formularioPublicacion.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  estadoForo.textContent = "";
  avisoInicioSesion.hidden = true;
  const datos = new FormData(formularioPublicacion);

  try {
    await solicitar("/api/forum/posts", {
      method: "POST",
      body: JSON.stringify({
        titulo: datos.get("titulo"),
        texto: datos.get("texto"),
      }),
    });
    formularioPublicacion.reset();
    estadoForo.textContent = "Publicación creada.";
    await cargarPublicaciones();
  } catch (error) {
    if (error.status === 401) {
      avisoInicioSesion.hidden = false;
      return;
    }
    estadoForo.textContent = error.message;
  }
});

busquedaPublicaciones.addEventListener("input", () => {
  cargarPublicaciones().catch((error) => {
    estadoForo.textContent = error.message;
  });
});

window.addEventListener("auth:changed", (evento) => {
  usuarioActual = evento.detail.user;
  if (usuarioActual) {
    avisoInicioSesion.hidden = true;
  }
  cargarPublicaciones().catch((error) => {
    estadoForo.textContent = error.message;
  });
});

cargarPublicaciones().catch((error) => {
  estadoForo.textContent = error.message;
});
