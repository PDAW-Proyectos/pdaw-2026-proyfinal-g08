import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";

const deriveKey = promisify(scrypt);
const passwordKeyLength = 64;
const normalizeEmail = (email) => email.trim().toLowerCase();
const restoreUser = (user, snapshot) => {
  for (const key of Object.keys(user)) {
    if (!(key in snapshot)) delete user[key];
  }
  Object.assign(user, snapshot);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export async function createUserStore(
  filePath = path.join(__dirname, "..", "..", "..", "data", "users.json"),
  { initialAdmin } = {},
) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  let users;
  try {
    users = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new Error(`No se pudo leer el archivo de usuarios`, {
        cause: error,
      });
    }
    users = [];
  }
  if (!Array.isArray(users)) {
    throw new Error("El archivo de usuarios tiene un formato inválido.");
  }

  let writeQueue = Promise.resolve();
  const serializeWrite = (operation) => {
    const result = writeQueue.then(operation);
    writeQueue = result.catch(() => {});
    return result;
  };

  const persist = async () => {
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(users, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
    try {
      await fs.rename(temporaryPath, filePath);
    } catch (error) {
      await fs.unlink(temporaryPath).catch((cleanupError) => {
        if (cleanupError.code !== "ENOENT") throw cleanupError;
      });
      throw error;
    }
  };

  if (initialAdmin) {
    const { name, email, password } = initialAdmin;
    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 80 ||
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" ||
      password.length === 0 ||
      password.length > 128
    ) {
      throw new Error("La configuración privada del administrador no es válida.");
    }

    const normalizedEmail = normalizeEmail(email);
    const existingAdmin = users.find(
      (user) => user.email === normalizedEmail,
    );
    if (existingAdmin && existingAdmin.role !== "admin") {
      throw new Error(
        "La cuenta configurada para administración ya existe con otro rol.",
      );
    }

    const originalUsers = users.map((user) => ({ ...user }));
    try {
      let admin = existingAdmin;
      if (!admin) {
        const salt = randomBytes(16);
        const passwordHash = await deriveKey(
          password,
          salt,
          passwordKeyLength,
        );
        admin = {
          id: randomUUID(),
          name: name.trim(),
          email: normalizedEmail,
          passwordHash: passwordHash.toString("hex"),
          salt: salt.toString("hex"),
          role: "admin",
          favoriteTeam: null,
        };
        users.push(admin);
      }

      let changed = !existingAdmin;
      for (const user of users) {
        if (user !== admin && user.role === "admin") {
          user.role = "user";
          changed = true;
        }
      }
      if (changed) {
        await persist();
      }
    } catch (error) {
      users.splice(0, users.length, ...originalUsers);
      throw error;
    }
  }

  return {
    findById(id) {
      return users.find((user) => user.id === id) || null;
    },
    async verify(email, password) {
      if (typeof email !== "string" || typeof password !== "string")
        return null;
      const user = users.find(
        (candidate) => candidate.email === normalizeEmail(email),
      );
      if (!user || ["suspended", "deleted"].includes(user.status)) return null;
      const candidate = await deriveKey(
        password,
        Buffer.from(user.salt, "hex"),
        passwordKeyLength,
      );
      const expected = Buffer.from(user.passwordHash, "hex");
      return candidate.length === expected.length &&
        timingSafeEqual(candidate, expected)
        ? user
        : null;
    },
    async register({ name, email, password, favoriteTeam }) {
      const validationError = validateRegistration({
        name,
        email,
        password,
        favoriteTeam,
      });
      if (validationError) {
        const error = new Error(validationError);
        error.code = "invalid_registration";
        throw error;
      }
      const salt = randomBytes(16);
      const passwordHash = await deriveKey(password, salt, passwordKeyLength);
      return serializeWrite(async () => {
        const normalizedEmail = normalizeEmail(email);
        if (users.some((user) => user.email === normalizedEmail)) {
          const error = new Error(
            "Ya existe una cuenta con ese correo electrónico.",
          );
          error.code = "email_exists";
          throw error;
        }
        const user = {
          id: randomUUID(),
          name: name.trim(),
          email: normalizedEmail,
          passwordHash: passwordHash.toString("hex"),
          salt: salt.toString("hex"),
          role: "user",
          favoriteTeam: favoriteTeam?.trim() || null,
          status: "active",
          createdAt: new Date().toISOString(),
        };
        users.push(user);
        try {
          await persist();
        } catch (error) {
          users.pop();
          throw error;
        }
        return user;
      });
    },
    list() {
      return users.map(
        ({
          id,
          name,
          email,
          favoriteTeam,
          role,
          status,
          createdAt,
          statusChangedAt,
          deletedAt,
        }) => ({
          id,
          name,
          email,
          favoriteTeam,
          role: role || "user",
          status: status || "active",
          createdAt: createdAt || null,
          statusChangedAt: statusChangedAt || null,
          deletedAt: deletedAt || null,
        }),
      );
    },
    async setStatus(id, status) {
      if (!["active", "suspended"].includes(status)) {
        const error = new Error("El estado solicitado no es válido.");
        error.code = "invalid_status";
        throw error;
      }

      return serializeWrite(async () => {
        const user = users.find((candidate) => candidate.id === id);
        if (!user) return null;
        if (user.role === "admin") {
          const error = new Error("No se puede suspender al administrador.");
          error.code = "protected_admin";
          throw error;
        }
        if (user.status === "deleted") {
          const error = new Error("La cuenta eliminada no se puede reactivar.");
          error.code = "deleted_account";
          throw error;
        }
        if ((user.status || "active") === status) return user;

        const snapshot = { ...user };
        user.status = status;
        user.statusChangedAt = new Date().toISOString();
        try {
          await persist();
        } catch (error) {
          restoreUser(user, snapshot);
          throw error;
        }
        return user;
      });
    },
    async deleteAccount(id) {
      return serializeWrite(async () => {
        const user = users.find((candidate) => candidate.id === id);
        if (!user) return null;
        if (user.role === "admin") {
          const error = new Error("No se puede eliminar al administrador.");
          error.code = "protected_admin";
          throw error;
        }
        if (user.status === "deleted") return user;

        const snapshot = { ...user };
        user.name = "Cuenta borrada";
        user.status = "deleted";
        user.statusChangedAt = new Date().toISOString();
        user.deletedAt = user.statusChangedAt;
        delete user.passwordHash;
        delete user.salt;
        try {
          await persist();
        } catch (error) {
          restoreUser(user, snapshot);
          throw error;
        }
        return user;
      });
    },
  };
}

export default createUserStore;
