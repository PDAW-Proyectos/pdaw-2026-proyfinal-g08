import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { Usuario } from "../models/Usuario.js";
import { crearError } from "../utils/errores.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_USERS_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "users.json",
);

export class UsuariosRepository {
  #filePath;
  #users;
  #writeQueue;

  constructor(filePath = DEFAULT_USERS_PATH, users = []) {
    this.#filePath = filePath;
    this.#users = users.map((u) => new Usuario(u));
    this.#writeQueue = Promise.resolve();
  }

  static async crear(filePath = DEFAULT_USERS_PATH) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    let rawUsers;
    try {
      rawUsers = JSON.parse(await fs.readFile(filePath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw new Error(
          `No se pudo leer el archivo de usuarios: ${error.message}`,
          { cause: error },
        );
      }
      rawUsers = [];
    }
    if (!Array.isArray(rawUsers)) {
      throw new Error("El archivo de usuarios tiene un formato inválido.");
    }
    return new UsuariosRepository(filePath, rawUsers);
  }

  findById(id) {
    return this.#users.find((u) => u.id === id) || null;
  }

  findByEmail(email) {
    return this.#users.find((u) => u.email === email) || null;
  }

  async create(datosUsuario) {
    const operation = async () => {
      if (this.findByEmail(datosUsuario.email)) {
        throw crearError(
          409,
          "email_exists",
          "Ya existe una cuenta con ese correo electrónico.",
        );
      }
      const nuevo = new Usuario(datosUsuario);
      this.#users.push(nuevo);
      try {
        await this.#persist();
      } catch (error) {
        this.#users.pop();
        throw error;
      }
      return nuevo;
    };

    const result = this.#writeQueue.then(operation);
    this.#writeQueue = result.catch(() => {});
    return result;
  }

  async #persist() {
    const tempPath = `${this.#filePath}.${randomUUID()}.tmp`;
    await fs.writeFile(
      tempPath,
      JSON.stringify(
        this.#users.map((u) => u.toJSON()),
        null,
        2,
      ),
      { encoding: "utf8", mode: 0o600 },
    );
    try {
      await fs.rename(tempPath, this.#filePath);
    } catch (error) {
      await fs.unlink(tempPath).catch((cleanupError) => {
        if (cleanupError.code !== "ENOENT") throw cleanupError;
      });
      throw error;
    }
  }
}

export default UsuariosRepository;
