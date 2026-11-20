import { crearError } from "../utils/errores.js";

export class ForoService {
  #comunidadRepo;
  #usuariosRepo;

  constructor({ comunidadRepo, usuariosRepo }) {
    this.#comunidadRepo = comunidadRepo;
    this.#usuariosRepo = usuariosRepo;
  }

  #obtenerPublicacionPublica(publicacionId) {
    const publicacion = this.#comunidadRepo.buscarPublicacion(publicacionId);
    if (
      !publicacion ||
      !this.#usuariosRepo.autorVisiblePublicamente(publicacion.autorId)
    ) {
      throw crearError(404, "post_not_found", "Publicación no encontrada.");
    }
    return publicacion;
  }

  listarPublicaciones() {
    return {
      publicaciones: this.#comunidadRepo
        .listarPublicaciones()
        .filter((publicacion) =>
          this.#usuariosRepo.autorVisiblePublicamente(publicacion.autorId),
        ),
    };
  }

  async crearPublicacion(usuario, { titulo, texto } = {}) {
    const tituloLimpio = titulo?.trim?.();
    const textoLimpio = texto?.trim?.();
    this.#validarContenidoPublicacion(tituloLimpio, textoLimpio);

    const publicacion = await this.#comunidadRepo.crearPublicacion({
      autorId: usuario.id,
      autorNombre: usuario.name,
      titulo: tituloLimpio,
      texto: textoLimpio,
    });

    return { publicacion };
  }

  async editarPublicacion(id, { titulo, texto } = {}) {
    const tituloLimpio = titulo?.trim?.();
    const textoLimpio = texto?.trim?.();
    this.#validarContenidoPublicacion(tituloLimpio, textoLimpio);

    const publicacion = await this.#comunidadRepo.actualizarPublicacion(id, {
      titulo: tituloLimpio,
      texto: textoLimpio,
    });
    if (!publicacion) {
      throw crearError(404, "post_not_found", "Publicación no encontrada.");
    }
    return { publicacion };
  }

  #validarContenidoPublicacion(titulo, texto) {
    if (
      !titulo ||
      titulo.length < 3 ||
      titulo.length > 120 ||
      !texto ||
      texto.length > 2000
    ) {
      throw crearError(
        400,
        "invalid_post",
        "El título debe tener 3-120 caracteres y el texto 1-2000.",
      );
    }
  }

  listarComentarios(publicacionId) {
    this.#obtenerPublicacionPublica(publicacionId);
    return {
      comentarios: this.#comunidadRepo
        .listarComentarios(publicacionId)
        .filter((comentario) =>
          this.#usuariosRepo.autorVisiblePublicamente(comentario.autorId),
        ),
    };
  }

  async crearComentario(usuario, publicacionId, { texto } = {}) {
    this.#obtenerPublicacionPublica(publicacionId);

    const textoLimpio = texto?.trim?.();
    if (!textoLimpio || textoLimpio.length < 1 || textoLimpio.length > 1000) {
      throw crearError(
        400,
        "invalid_comment",
        "El comentario debe tener entre 1 y 1000 caracteres.",
      );
    }

    const comentario = await this.#comunidadRepo.crearComentario({
      publicacionId,
      autorId: usuario.id,
      autorNombre: usuario.name,
      texto: textoLimpio,
    });

    return { comentario };
  }

  async borrarPublicacion(id) {
    if (!this.#comunidadRepo.buscarPublicacion(id)) {
      throw crearError(404, "post_not_found", "Publicación no encontrada.");
    }
    await this.#comunidadRepo.borrarPublicacion(id);
  }

  async borrarComentario(id) {
    if (!this.#comunidadRepo.buscarComentario(id)) {
      throw crearError(404, "comment_not_found", "Comentario no encontrado.");
    }
    await this.#comunidadRepo.borrarComentario(id);
  }
}

export default ForoService;
