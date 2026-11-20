import { randomBytes, randomUUID } from "node:crypto";
import { MINUTOS_SESION_PREDETERMINADOS } from "../models/Configuracion.js";
import { crearError } from "../utils/errores.js";
import {
  generarHashContrasena,
  verificarContrasena,
} from "../utils/criptografia.js";
import { esCorreoValido, normalizarCorreo } from "../utils/texto.js";

function validateRegistration({ name, email, password, favoriteTeam }) {
  const nombreLimpio = name?.trim?.();
  if (!nombreLimpio || nombreLimpio.length < 2 || nombreLimpio.length > 80) {
    return "Ingresá un nombre de entre 2 y 80 caracteres.";
  }
  if (!esCorreoValido(email)) {
    return "Ingresá un correo electrónico válido.";
  }
  if (
    !password ||
    String(password) !== password ||
    password.length < 8 ||
    password.length > 128
  ) {
    return "La contraseña debe tener entre 8 y 128 caracteres.";
  }
  if (
    favoriteTeam !== undefined &&
    favoriteTeam !== null &&
    (String(favoriteTeam) !== favoriteTeam || favoriteTeam.length > 80)
  ) {
    return "El equipo seleccionado no es válido.";
  }
  return null;
}

export class AuthService {
  #usuariosRepo;
  #configuracionRepo;
  #sessions;

  constructor(usuariosRepo, configuracionRepo = null) {
    this.#usuariosRepo = usuariosRepo;
    this.#configuracionRepo = configuracionRepo;
    this.#sessions = new Map();
  }

  get sessionDurationMs() {
    const minutos =
      this.#configuracionRepo?.obtenerMinutosTiempoSesion?.() ??
      MINUTOS_SESION_PREDETERMINADOS;
    return minutos * 60 * 1000;
  }

  #crearSesion(userId) {
    const sessionId = randomBytes(32).toString("hex");
    this.#sessions.set(sessionId, {
      userId,
      expiresAt: Date.now() + this.sessionDurationMs,
    });
    return sessionId;
  }

  async registrar({ name, email, password, favoriteTeam } = {}) {
    const validationError = validateRegistration({
      name,
      email,
      password,
      favoriteTeam,
    });
    if (validationError) {
      throw crearError(400, "invalid_registration", validationError);
    }

    const { passwordHash, salt } = await generarHashContrasena(password);

    const usuario = await this.#usuariosRepo.create({
      id: randomUUID(),
      name: name.trim(),
      email: normalizarCorreo(email),
      passwordHash,
      salt,
      role: "user",
      favoriteTeam: favoriteTeam?.trim() || null,
      status: "active",
      createdAt: new Date().toISOString(),
    });

    return {
      user: usuario.toPublicJSON(),
      sessionId: this.#crearSesion(usuario.id),
    };
  }

  async iniciarSesion(email, password) {
    if (
      !email ||
      !password ||
      String(email) !== email ||
      String(password) !== password
    )
      return null;
    const usuario = this.#usuariosRepo?.findByEmail(email);
    if (!usuario || !usuario.autenticable()) return null;

    const esValida = await verificarContrasena(
      password,
      usuario.salt,
      usuario.passwordHash,
    );
    if (!esValida) return null;

    return {
      user: usuario.toPublicJSON(),
      sessionId: this.#crearSesion(usuario.id),
    };
  }

  obtenerUsuarioPorSesion(sessionId) {
    if (!sessionId) return null;
    const session = this.#sessions.get(sessionId);
    if (!session || session.expiresAt <= Date.now()) {
      this.#sessions.delete(sessionId);
      return null;
    }
    const usuario = this.#usuariosRepo?.findById(session.userId);
    if (!usuario || !usuario.autenticable()) {
      this.#sessions.delete(sessionId);
      return null;
    }
    return usuario;
  }

  cerrarSesion(sessionId) {
    if (sessionId) this.#sessions.delete(sessionId);
  }
}

export default AuthService;
