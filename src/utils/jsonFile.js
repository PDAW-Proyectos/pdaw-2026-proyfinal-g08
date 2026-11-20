import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function existeArchivo(ruta) {
  return fs.existsSync(ruta);
}

export function leerJson(ruta, respaldo = []) {
  try {
    if (!fs.existsSync(ruta)) return respaldo;
    const contenido = fs.readFileSync(ruta, "utf-8");
    if (!contenido.trim()) return respaldo;
    const datos = JSON.parse(contenido);
    return datos ?? respaldo;
  } catch (err) {
    console.warn(`Aviso al leer ${ruta}:`, err.message);
    return respaldo;
  }
}

export function escribirJson(ruta, datos) {
  try {
    const dir = path.dirname(ruta);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ruta, JSON.stringify(datos, null, 2), "utf-8");
  } catch (err) {
    console.warn(`Aviso al escribir ${ruta}:`, err.message);
  }
}

export async function leerJsonAsync(ruta, crearRespaldo = () => undefined) {
  await fsPromises.mkdir(path.dirname(ruta), { recursive: true });
  try {
    return {
      datos: JSON.parse(await fsPromises.readFile(ruta, "utf8")),
      archivoFaltante: false,
    };
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    return { datos: crearRespaldo(), archivoFaltante: true };
  }
}

export async function escribirJsonAtomico(ruta, datos) {
  await fsPromises.mkdir(path.dirname(ruta), { recursive: true });
  const archivoTemporal = `${ruta}.${randomUUID()}.tmp`;
  await fsPromises.writeFile(archivoTemporal, JSON.stringify(datos, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  try {
    await fsPromises.rename(archivoTemporal, ruta);
  } catch (error) {
    await fsPromises.unlink(archivoTemporal).catch((errorLimpieza) => {
      if (errorLimpieza.code !== "ENOENT") throw errorLimpieza;
    });
    throw error;
  }
}

export function crearColaEscritura() {
  let cola = Promise.resolve();
  return (operacion) => {
    const siguiente = cola.then(operacion);
    cola = siguiente.catch(() => {});
    return siguiente;
  };
}
