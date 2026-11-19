import fs from "node:fs";
import path from "node:path";

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
