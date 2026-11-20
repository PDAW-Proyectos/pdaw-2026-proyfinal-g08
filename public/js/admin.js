import {
  cambiarEstadoUsuarioAdmin,
  darDeBajaUsuarioAdmin,
  editarPublicacionAdmin,
  eliminarPublicacionAdmin,
  listarPublicacionesAdmin,
  listarUsuariosAdmin,
} from "./admin-api.js";

const listaPublicaciones = document.querySelector("#lista-publicaciones-admin");
const listaUsuarios = document.querySelector("#lista-usuarios-admin");
const estadoAdmin = document.querySelector("#estado-admin");
let dialogoConfirmacion;
let resolverConfirmacion;

function crearElemento(etiqueta, clase, texto = "") {
  const elemento = document.createElement(etiqueta);
  elemento.className = clase;
  elemento.textContent = texto;
  return elemento;
}

function crearBoton(texto, clase, accion) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = clase;
  boton.textContent = texto;
  boton.addEventListener("click", accion);
  return boton;
}

function mostrarEstado(mensaje, esError = false) {
  if (!estadoAdmin) return;
  estadoAdmin.textContent = mensaje;
  estadoAdmin.classList.toggle("text-danger", esError);
}

function obtenerMensajeError(error) {
  return error instanceof Error ? error.message : "Error desconocido.";
}

function obtenerDialogoConfirmacion() {
  if (dialogoConfirmacion) return dialogoConfirmacion;

  const dialogo = document.createElement("dialog");
  const titulo = crearElemento("h2", "admin-confirmacion-titulo");
  const descripcion = crearElemento("p", "admin-confirmacion-descripcion");
  const acciones = crearElemento("div", "admin-confirmacion-acciones");
  const botonCancelar = crearBoton(
    "Cancelar",
    "btn btn-sm boton-contorno-grada",
    () => dialogo.close("cancel"),
  );
  const botonConfirmar = crearBoton(
    "Confirmar",
    "btn btn-sm boton-grada",
    () => dialogo.close("confirm"),
  );

  dialogo.className = "dialogo-admin-confirmacion";
  dialogo.setAttribute("aria-labelledby", "admin-confirmacion-titulo");
  dialogo.setAttribute("aria-describedby", "admin-confirmacion-descripcion");
  titulo.id = "admin-confirmacion-titulo";
  descripcion.id = "admin-confirmacion-descripcion";
  acciones.append(botonCancelar, botonConfirmar);
  dialogo.append(titulo, descripcion, acciones);
  dialogo.addEventListener("close", () => {
    const resolver = resolverConfirmacion;
    resolverConfirmacion = null;
    resolver?.(dialogo.returnValue === "confirm");
  });
  document.body.append(dialogo);

  dialogoConfirmacion = {
    dialogo,
    titulo,
    descripcion,
    botonCancelar,
    botonConfirmar,
  };
  return dialogoConfirmacion;
}

function confirmarAccion({
  titulo,
  mensaje,
  textoConfirmar = "Confirmar",
  destructiva = false,
}) {
  const modal = obtenerDialogoConfirmacion();
  modal.titulo.textContent = titulo;
  modal.descripcion.textContent = mensaje;
  modal.botonConfirmar.textContent = textoConfirmar;
  modal.botonConfirmar.className = destructiva
    ? "btn btn-sm btn-outline-danger"
    : "btn btn-sm boton-grada";

  return new Promise((resolve) => {
    resolverConfirmacion = resolve;
    modal.dialogo.returnValue = "";
    modal.dialogo.showModal();
    modal.botonCancelar.focus();
  });
}

function formatearFecha(valor) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? "Fecha desconocida"
    : fecha.toLocaleString("es-AR");
}

function crearFormularioEdicion(publicacion) {
  const formulario = crearElemento("form", "admin-item");
  const etiquetaTitulo = crearElemento("label", "form-label", "Título");
  const campoTitulo = document.createElement("input");
  const etiquetaTexto = crearElemento("label", "form-label", "Texto");
  const campoTexto = document.createElement("textarea");
  const acciones = crearElemento("div", "admin-acciones");
  const botonGuardar = crearElemento(
    "button",
    "btn btn-sm boton-grada",
    "Guardar cambios",
  );
  const botonCancelar = crearBoton(
    "Cancelar",
    "btn btn-sm boton-contorno-grada",
    () => formulario.replaceWith(crearTarjetaPublicacion(publicacion)),
  );
  const mensaje = crearElemento("p", "admin-item-detalle");

  campoTitulo.id = `titulo-${publicacion.id}`;
  campoTitulo.className = "form-control";
  campoTitulo.name = "titulo";
  campoTitulo.value = publicacion.titulo;
  campoTitulo.minLength = 3;
  campoTitulo.maxLength = 120;
  campoTitulo.required = true;
  etiquetaTitulo.htmlFor = campoTitulo.id;

  campoTexto.id = `texto-${publicacion.id}`;
  campoTexto.className = "form-control";
  campoTexto.name = "texto";
  campoTexto.value = publicacion.texto;
  campoTexto.maxLength = 2000;
  campoTexto.required = true;
  etiquetaTexto.htmlFor = campoTexto.id;

  botonGuardar.type = "submit";
  mensaje.setAttribute("role", "status");
  mensaje.setAttribute("aria-live", "polite");
  acciones.append(botonGuardar, botonCancelar);
  formulario.append(
    etiquetaTitulo,
    campoTitulo,
    etiquetaTexto,
    campoTexto,
    mensaje,
    acciones,
  );

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!formulario.reportValidity()) return;

    botonGuardar.disabled = true;
    botonCancelar.disabled = true;
    try {
      await editarPublicacionAdmin(publicacion.id, {
        titulo: campoTitulo.value.trim(),
        texto: campoTexto.value.trim(),
      });
      mostrarEstado("Publicación actualizada.");
      await cargarPublicaciones();
    } catch (error) {
      mensaje.textContent = obtenerMensajeError(error);
      botonGuardar.disabled = false;
      botonCancelar.disabled = false;
    }
  });

  return formulario;
}

function crearTarjetaPublicacion(publicacion) {
  const tarjeta = crearElemento("article", "admin-item");
  const encabezado = crearElemento("div", "admin-item-encabezado");
  const titulo = crearElemento(
    "h2",
    "admin-item-titulo",
    publicacion.titulo || "Publicación sin título",
  );
  const detalle = crearElemento(
    "p",
    "admin-item-detalle",
    `Por ${publicacion.autorNombre || "Usuario"} · ${formatearFecha(publicacion.creadaEn)} · ${(publicacion.comentarios || []).length} comentarios`,
  );
  const texto = crearElemento("p", "admin-item-texto", publicacion.texto || "");
  const acciones = crearElemento("div", "admin-acciones");
  const botonEditar = crearBoton(
    "Editar",
    "btn btn-sm boton-contorno-grada",
    () => tarjeta.replaceWith(crearFormularioEdicion(publicacion)),
  );
  const botonEliminar = crearBoton(
    "Eliminar publicación",
    "btn btn-sm btn-outline-danger",
    async () => {
      const confirmado = await confirmarAccion({
        titulo: "Eliminar publicación",
        mensaje:
          `Se eliminará «${publicacion.titulo}» y sus comentarios. ` +
          "Esta acción no se puede deshacer.",
        textoConfirmar: "Eliminar publicación",
        destructiva: true,
      });
      if (!confirmado) {
        return;
      }

      botonEliminar.disabled = true;
      try {
        await eliminarPublicacionAdmin(publicacion.id);
        mostrarEstado("Publicación eliminada.");
        await cargarPublicaciones();
      } catch (error) {
        mostrarEstado(obtenerMensajeError(error), true);
        botonEliminar.disabled = false;
      }
    },
  );

  encabezado.append(titulo);
  acciones.append(botonEditar, botonEliminar);
  tarjeta.append(encabezado, detalle, texto, acciones);
  return tarjeta;
}

function crearTarjetaUsuario(usuario) {
  const tarjeta = crearElemento("article", "admin-item");
  const encabezado = crearElemento("div", "admin-item-encabezado");
  const titulo = crearElemento("h2", "admin-item-titulo", usuario.name);
  const estados = {
    active: ["Activa", ""],
    suspended: ["Suspendida", " admin-estado-suspended"],
    deleted: ["De baja", " admin-estado-deleted"],
  };
  const [textoEstado, claseEstado] = estados[usuario.status] || [
    "Estado desconocido",
    "",
  ];
  const etiquetaEstado = crearElemento(
    "span",
    `admin-estado${claseEstado}`,
    textoEstado,
  );
  const detalle = crearElemento(
    "p",
    "admin-item-detalle",
    `Correo: ${usuario.email}`,
  );
  const equipo = crearElemento(
    "p",
    "admin-item-detalle",
    usuario.favoriteTeam
      ? `Equipo favorito: ${usuario.favoriteTeam}`
      : "Sin equipo favorito",
  );
  const acciones = crearElemento("div", "admin-acciones");

  encabezado.append(titulo, etiquetaEstado);
  tarjeta.append(encabezado, detalle, equipo);

  if (usuario.createdAt) {
    tarjeta.append(
      crearElemento(
        "p",
        "admin-item-detalle",
        `Registrado: ${formatearFecha(usuario.createdAt)}`,
      ),
    );
  }

  if (usuario.role !== "admin" && usuario.status !== "deleted") {
    const nuevoEstado = usuario.status === "suspended" ? "active" : "suspended";
    const textoBoton =
      nuevoEstado === "active" ? "Reactivar cuenta" : "Suspender cuenta";
    const botonEstado = crearBoton(
      textoBoton,
      "btn btn-sm boton-contorno-grada",
      async () => {
        const confirmacion =
          nuevoEstado === "active"
            ? {
                titulo: "Reactivar cuenta",
                mensaje: `¿Querés reactivar la cuenta de ${usuario.name}?`,
                textoConfirmar: "Reactivar",
              }
            : {
                titulo: "Suspender cuenta",
                mensaje: `¿Querés suspender la cuenta de ${usuario.name}?`,
                textoConfirmar: "Suspender",
                destructiva: true,
              };
        if (!(await confirmarAccion(confirmacion))) return;

        botonEstado.disabled = true;
        try {
          await cambiarEstadoUsuarioAdmin(usuario.id, nuevoEstado);
          mostrarEstado(
            nuevoEstado === "active"
              ? "Cuenta reactivada."
              : "Cuenta suspendida.",
          );
          await cargarUsuarios();
        } catch (error) {
          mostrarEstado(obtenerMensajeError(error), true);
          botonEstado.disabled = false;
        }
      },
    );
    const botonBaja = crearBoton(
      "Dar de baja",
      "btn btn-sm btn-outline-danger",
      async () => {
        const confirmado = await confirmarAccion({
          titulo: "Dar de baja usuario",
          mensaje:
            `${usuario.name} dejará de estar visible, pero sus datos se ` +
            "conservarán.",
          textoConfirmar: "Dar de baja",
          destructiva: true,
        });
        if (!confirmado) {
          return;
        }

        botonBaja.disabled = true;
        try {
          await darDeBajaUsuarioAdmin(usuario.id);
          mostrarEstado("Cuenta dada de baja.");
          await cargarUsuarios();
        } catch (error) {
          mostrarEstado(obtenerMensajeError(error), true);
          botonBaja.disabled = false;
        }
      },
    );
    acciones.append(botonEstado, botonBaja);
    tarjeta.append(acciones);
  }

  return tarjeta;
}

async function cargarLista(contenedor, cargar, renderizar, mensajeVacio) {
  if (!contenedor) return;

  contenedor.setAttribute("aria-busy", "true");
  contenedor.replaceChildren(
    crearElemento("p", "admin-item-detalle", "Cargando..."),
  );
  try {
    const elementos = await cargar();
    if (!Array.isArray(elementos)) {
      throw new Error("El servidor devolvió datos con un formato inesperado.");
    }

    const contenido = document.createDocumentFragment();
    if (elementos.length === 0) {
      contenido.append(crearElemento("p", "admin-item-detalle", mensajeVacio));
    } else {
      elementos.forEach((elemento) => contenido.append(renderizar(elemento)));
    }
    contenedor.replaceChildren(contenido);
  } catch (error) {
    contenedor.replaceChildren(
      crearElemento(
        "p",
        "admin-item-detalle",
        `No se pudo cargar la lista: ${obtenerMensajeError(error)}`,
      ),
    );
  } finally {
    contenedor.setAttribute("aria-busy", "false");
  }
}

function cargarPublicaciones() {
  return cargarLista(
    listaPublicaciones,
    listarPublicacionesAdmin,
    crearTarjetaPublicacion,
    "Todavía no hay publicaciones.",
  );
}

function cargarUsuarios() {
  return cargarLista(
    listaUsuarios,
    listarUsuariosAdmin,
    crearTarjetaUsuario,
    "Todavía no hay usuarios registrados.",
  );
}

cargarPublicaciones();
cargarUsuarios();
