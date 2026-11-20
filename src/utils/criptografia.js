import { promisify } from "node:util";
import { scrypt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

const { hash, compare } = bcrypt;
const deriveKey = promisify(scrypt);
const PASSWORD_KEY_LENGTH = 64;
const SALT_ROUNDS = 10;

export async function generarHashContrasena(password) {
  const passwordHash = await hash(password, SALT_ROUNDS);
  return {
    passwordHash,
    salt: undefined,
  };
}

export async function verificarContrasena(password, saltHex, hashHex) {
  if (!password || !hashHex) {
    return false;
  }

  const clave = String(password);
  const hashGuardado = String(hashHex);

  if (hashGuardado.startsWith("$2")) {
    return compare(clave, hashGuardado);
  }

  if (!saltHex) {
    return false;
  }

  const candidate = await deriveKey(
    clave,
    Buffer.from(String(saltHex), "hex"),
    PASSWORD_KEY_LENGTH,
  );
  const expected = Buffer.from(hashGuardado, "hex");
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}
