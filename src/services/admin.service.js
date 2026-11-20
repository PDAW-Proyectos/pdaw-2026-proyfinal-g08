import {
  MINUTOS_SESION_MAXIMOS,
  MINUTOS_SESION_MINIMOS,
  esTiempoSesionValido,
} from "../models/Configuracion.js";
import { crearError } from "../utils/errores.js";

export class AdminService {
  #usuariosRepo;
  #comunidadRepo;
  #configuracionRepo;

  constructor({ usuariosRepo, comunidadRepo, configuracionRepo }) {
    this.#usuariosRepo = usuariosRepo;
    this.#comunidadRepo = comunidadRepo;
    this.#configuracionRepo = configuracionRepo;
  }

  listarPublicaciones() {
    const publicaciones = this.#comunidadRepo
      .listarPublicaciones()
      .map((publicacion) => ({
        ...publicacion,
        comentarios: this.#comunidadRepo.listarComentarios(publicacion.id),
      }));

    return { publicaciones };
  }

  listarUsuarios() {
    return { usuarios: this.#usuariosRepo.list() };
  }

  obtenerConfiguracion() {
    return {
      sessionTimeoutMinutes:
        this.#configuracionRepo.obtenerMinutosTiempoSesion(),
    };
  }

  async actualizarTiempoSesion(minutos) {
    if (!esTiempoSesionValido(minutos)) {
      throw crearError(
        400,
        "invalid_session_timeout",
        `La duración de sesión debe ser un número entero entre ${MINUTOS_SESION_MINIMOS} y ${MINUTOS_SESION_MAXIMOS} minutos.`,
      );
    }

    const sessionTimeoutMinutes =
      await this.#configuracionRepo.establecerMinutosTiempoSesion(minutos);
    return { sessionTimeoutMinutes };
  }

  async cambiarEstadoUsuario(id, status) {
    if (!["active", "suspended"].includes(status)) {
      throw crearError(
        400,
        "invalid_status",
        "El estado solicitado no es válido.",
      );
    }

    const usuario = await this.#usuariosRepo.actualizarEstado(id, status);
    if (!usuario) {
      throw crearError(404, "user_not_found", "Usuario no encontrado.");
    }
    return { usuario: usuario.toAdminJSON() };
  }

  async eliminarUsuario(id) {
    const usuario = await this.#usuariosRepo.eliminarCuenta(id);
    if (!usuario) {
      throw crearError(404, "user_not_found", "Usuario no encontrado.");
    }
    return { usuario: usuario.toAdminJSON() };
  }
}

export default AdminService;
