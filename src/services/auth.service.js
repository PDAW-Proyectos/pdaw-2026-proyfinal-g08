import { promisify } from "node:util";
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { crearError } from "../utils/errores.js";

const deriveKey = promisify(scrypt);
const PASSWORD_KEY_LENGTH = 64;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const normalizeEmail = (email) => email.trim().toLowerCase();

function validateRegistration({ name, email, password, favoriteTeam }) {
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 80
  ) {
    return "Ingresá un nombre de entre 2 y 80 caracteres.";
  }
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return "Ingresá un correo electrónico válido.";
  }
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    return "La contraseña debe tener entre 8 y 128 caracteres.";
  }
  if (
    favoriteTeam !== undefined &&
    favoriteTeam !== null &&
    (typeof favoriteTeam !== "string" || favoriteTeam.length > 80)
  ) {
    return "El equipo seleccionado no es válido.";
  }
  return null;
}

export class AuthService {
  #usuariosRepo;
  #sessions;

  constructor(usuariosRepo) {
    this.#usuariosRepo = usuariosRepo;
    this.#sessions = new Map();
  }

  get sessionDurationMs() {
    return SESSION_DURATION_MS;
  }

  #crearSesion(userId) {
    const sessionId = randomBytes(32).toString("hex");
    this.#sessions.set(sessionId, {
      userId,
      expiresAt: Date.now() + SESSION_DURATION_MS,
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

    const salt = randomBytes(16);
    const passwordHash = await deriveKey(password, salt, PASSWORD_KEY_LENGTH);

    const usuario = await this.#usuariosRepo.create({
      id: randomUUID(),
      name: name.trim(),
      email: normalizeEmail(email),
      passwordHash: passwordHash.toString("hex"),
      salt: salt.toString("hex"),
      favoriteTeam: favoriteTeam?.trim() || null,
    });

    return {
      user: usuario.toPublicJSON(),
      sessionId: this.#crearSesion(usuario.id),
    };
  }

  async iniciarSesion(email, password) {
    if (typeof email !== "string" || typeof password !== "string") return null;
    const usuario = this.#usuariosRepo?.findByEmail(normalizeEmail(email));
    if (!usuario) return null;

    const candidate = await deriveKey(
      password,
      Buffer.from(usuario.salt, "hex"),
      PASSWORD_KEY_LENGTH,
    );
    const expected = Buffer.from(usuario.passwordHash, "hex");
    if (
      candidate.length !== expected.length ||
      !timingSafeEqual(candidate, expected)
    ) {
      return null;
    }

    return {
      user: usuario.toPublicJSON(),
      sessionId: this.#crearSesion(usuario.id),
    };
  }

  obtenerUsuarioPorSesion(sessionId) {
    if (!sessionId) return null;
    const session = this.#sessions.get(sessionId);
    if (!session || session.expiresAt <= Date.now()) {
      if (sessionId) this.#sessions.delete(sessionId);
      return null;
    }
    const usuario = this.#usuariosRepo?.findById(session.userId);
    return usuario ? usuario.toPublicJSON() : null;
  }

  cerrarSesion(sessionId) {
    if (sessionId) this.#sessions.delete(sessionId);
  }
}

export default AuthService;
