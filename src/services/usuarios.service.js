import { crearError } from "../utils/errores.js";

export class UsuariosService {
  #usuariosRepo;
  #comunidadRepo;

  constructor({ usuariosRepo, comunidadRepo }) {
    this.#usuariosRepo = usuariosRepo;
    this.#comunidadRepo = comunidadRepo;
  }

  obtenerPerfilPublico(id) {
    const usuario = this.#usuariosRepo.findById(id);
    if (!usuario || !usuario.visibleEnComunidad()) {
      throw crearError(404, "user_not_found", "Usuario no encontrado.");
    }

    const publicaciones = this.#comunidadRepo
      .listarPublicacionesDeUsuario(usuario.id)
      .filter((publicacion) =>
        this.#usuariosRepo.autorVisiblePublicamente(publicacion.autorId),
      );

    const comentarios = this.#comunidadRepo
      .listarComentariosDeUsuario(usuario.id)
      .filter((comentario) => {
        const publicacion = this.#comunidadRepo.buscarPublicacion(
          comentario.publicacionId,
        );
        return (
          publicacion &&
          this.#usuariosRepo.autorVisiblePublicamente(publicacion.autorId) &&
          this.#usuariosRepo.autorVisiblePublicamente(comentario.autorId)
        );
      });

    return {
      perfil: usuario.toPublicProfileJSON(),
      publicaciones,
      comentarios,
    };
  }

  obtenerPerfilPropio(usuarioActual) {
    const usuario = this.#usuariosRepo.findById(usuarioActual.id);
    if (!usuario || !usuario.autenticable()) {
      throw crearError(404, "user_not_found", "Usuario no encontrado.");
    }

    return {
      perfil: usuario.toProfileJSON(),
      publicaciones: this.#comunidadRepo.listarPublicacionesDeUsuario(
        usuario.id,
      ),
      comentarios: this.#comunidadRepo.listarComentariosDeUsuario(usuario.id),
      pedidos: this.#comunidadRepo.listarPedidosDeUsuario(usuario.id),
    };
  }
}

export default UsuariosService;
