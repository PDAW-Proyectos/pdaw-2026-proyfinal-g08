import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { Usuario } from "../models/Usuario.js";
import { RepositorioJson } from "./RepositorioJson.js";
import { crearError } from "../utils/errores.js";
import { generarHashContrasena } from "../utils/criptografia.js";
import { esCorreoValido, normalizarCorreo } from "../utils/texto.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_USERS_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "users.json",
);

export class UsuariosRepository extends RepositorioJson {
  #users;

  constructor(filePath = DEFAULT_USERS_PATH, users = []) {
    super(filePath);
    this.#users = users.map((u) => Usuario.crear(u));
  }

  static async crear(
    filePath = DEFAULT_USERS_PATH,
    { initialAdmin, initialUsers = [] } = {},
  ) {
    let rawUsers;
    let usersFileMissing;
    try {
      const resultado = await RepositorioJson.leerArchivo(filePath, () =>
        initialUsers.map((user) => ({ ...user })),
      );
      rawUsers = resultado.datos;
      usersFileMissing = resultado.archivoFaltante;
    } catch (error) {
      throw new Error("No se pudo leer el archivo de usuarios", {
        cause: error,
      });
    }

    const repo = new UsuariosRepository(filePath, rawUsers);
    let persistedDuringInitialization = false;

    if (initialAdmin) {
      persistedDuringInitialization =
        await repo.#configurarAdminInicial(initialAdmin);
    }

    if (
      usersFileMissing &&
      repo.#users.length > 0 &&
      !persistedDuringInitialization
    ) {
      await repo.#persist();
    }

    return repo;
  }

  async #configurarAdminInicial(initialAdmin) {
    const { name, email, password } = initialAdmin;
    const nombreLimpio = name?.trim?.();
    if (
      !nombreLimpio ||
      nombreLimpio.length < 2 ||
      nombreLimpio.length > 80 ||
      !esCorreoValido(email) ||
      !password ||
      String(password) !== password ||
      password.length > 128
    ) {
      throw new Error(
        "La configuración privada del administrador no es válida.",
      );
    }

    const normalizedEmail = normalizarCorreo(email);
    const existingAdmin = this.findByEmail(normalizedEmail);
    if (existingAdmin && !existingAdmin.puedeAdministrar()) {
      throw new Error(
        "La cuenta configurada para administración ya existe con otro rol.",
      );
    }

    const instantanea = this.#users.map((u) => u.crearInstantanea());
    try {
      let admin = existingAdmin;
      if (!admin) {
        const { passwordHash, salt } = await generarHashContrasena(password);
        admin = Usuario.crear({
          id: randomUUID(),
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          salt,
          role: "admin",
          favoriteTeam: null,
        });
        this.#users.push(admin);
      }

      let changed = !existingAdmin;
      this.#users = this.#users.map((user) => {
        if (user !== admin && user.puedeAdministrar()) {
          changed = true;
          return user.comoUsuarioComun();
        }
        return user;
      });

      if (changed) {
        await this.#persist();
        return true;
      }
      return false;
    } catch (error) {
      this.#users = instantanea.map((u) => Usuario.crear(u));
      throw error;
    }
  }

  findById(id) {
    return this.#users.find((u) => u.id === id) || null;
  }

  findByEmail(email) {
    const normalized = normalizarCorreo(email);
    return this.#users.find((u) => u.email === normalized) || null;
  }

  autorVisiblePublicamente(id) {
    const usuario = this.findById(id);
    return usuario ? usuario.visibleEnComunidad() : true;
  }

  list() {
    return this.#users.map((u) => u.toAdminJSON());
  }

  async create(datosUsuario) {
    return this.ejecutarEnCola(async () => {
      if (this.findByEmail(datosUsuario.email)) {
        throw crearError(
          409,
          "email_exists",
          "Ya existe una cuenta con ese correo electrónico.",
        );
      }
      const nuevo = Usuario.crear(datosUsuario);
      this.#users.push(nuevo);
      try {
        await this.#persist();
      } catch (error) {
        this.#users.pop();
        throw error;
      }
      return nuevo;
    });
  }

  async actualizarEstado(id, status) {
    return this.ejecutarEnCola(async () => {
      const user = this.findById(id);
      if (!user) return null;

      const snapshot = user.crearInstantanea();
      if (!user.cambiarEstado(status)) return user;
      try {
        await this.#persist();
      } catch (error) {
        user.restaurarDesde(snapshot);
        throw error;
      }
      return user;
    });
  }

  async eliminarCuenta(id) {
    return this.ejecutarEnCola(async () => {
      const user = this.findById(id);
      if (!user) return null;

      const snapshot = user.crearInstantanea();
      if (!user.marcarEliminado()) return user;
      try {
        await this.#persist();
      } catch (error) {
        user.restaurarDesde(snapshot);
        throw error;
      }
      return user;
    });
  }

  async #persist() {
    await this.guardarDatos(this.#users.map((u) => u.toJSON()));
  }
}

export default UsuariosRepository;
