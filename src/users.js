const fs = require("node:fs/promises");
const path = require("node:path");
const { promisify } = require("node:util");
const { randomBytes, randomUUID, scrypt, timingSafeEqual } = require("node:crypto");

const deriveKey = promisify(scrypt);
const passwordKeyLength = 64;

const normalizeEmail = (email) => email.trim().toLowerCase();

function validateRegistration({ name, email, password, favoriteTeam }) {
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
    return "Ingresá un nombre de entre 2 y 80 caracteres.";
  }
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return "Ingresá un correo electrónico válido.";
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
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

async function createUserStore(
  filePath = path.join(__dirname, "..", "data", "users.json"),
) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  let users;
  try {
    users = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new Error(`No se pudo leer el archivo de usuarios: ${error.message}`);
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

  return {
    findById(id) {
      return users.find((user) => user.id === id) || null;
    },

    async verify(email, password) {
      if (typeof email !== "string" || typeof password !== "string") return null;
      const user = users.find((candidate) => candidate.email === normalizeEmail(email));
      if (!user) return null;

      const candidate = await deriveKey(password, Buffer.from(user.salt, "hex"), passwordKeyLength);
      const expected = Buffer.from(user.passwordHash, "hex");
      return candidate.length === expected.length && timingSafeEqual(candidate, expected)
        ? user
        : null;
    },

    async register({ name, email, password, favoriteTeam }) {
      const validationError = validateRegistration({ name, email, password, favoriteTeam });
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
          const error = new Error("Ya existe una cuenta con ese correo electrónico.");
          error.code = "email_exists";
          throw error;
        }

        const user = {
          id: randomUUID(),
          name: name.trim(),
          email: normalizedEmail,
          passwordHash: passwordHash.toString("hex"),
          salt: salt.toString("hex"),
          favoriteTeam: favoriteTeam?.trim() || null,
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
  };
}

module.exports = { createUserStore };
