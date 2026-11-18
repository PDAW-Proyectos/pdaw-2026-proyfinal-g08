import fs from "node:fs";
import path from "node:path";

export const LIGAS_UTILIZADAS_IDS = ["4328", "4331", "4332", "4335", "4334"];

export const LIGAS_PRINCIPALES_DEFAULT = [
  {
    id: "4328",
    nombre: "English Premier League",
    pais: "England",
    escudo: "https://r2.thesportsdb.com/images/media/league/badge/gasy9d1737743125.png",
    temporada: "2026-2027",
    tabla: [],
  },
  {
    id: "4331",
    nombre: "German Bundesliga",
    pais: "Germany",
    escudo: "https://r2.thesportsdb.com/images/media/league/badge/teqh1b1679952008.png",
    temporada: "2026-2027",
    tabla: [],
  },
  {
    id: "4332",
    nombre: "Italian Serie A",
    pais: "Italy",
    escudo: "https://r2.thesportsdb.com/images/media/league/badge/67q3q21679951383.png",
    temporada: "2026-2027",
    tabla: [],
  },
  {
    id: "4335",
    nombre: "Spanish La Liga",
    pais: "Spain",
    escudo: "https://r2.thesportsdb.com/images/media/league/badge/ja4it51687628717.png",
    temporada: "2026-2027",
    tabla: [],
  },
  {
    id: "4334",
    nombre: "French Ligue 1",
    pais: "France",
    escudo: "https://r2.thesportsdb.com/images/media/league/badge/9f7z9d1742983155.png",
    temporada: "2026-2027",
    tabla: [],
  },
];

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const normalizarTexto = (texto) =>
  String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

export class ClienteApiFutbol {
  #fetchFn;
  #rutaBase;
  #intervaloMinimoMs;
  #ultimaPeticionMs;
  #colaPeticiones;

  constructor(fetchFn = fetch, opciones = {}) {
    this.#fetchFn = fetchFn;
    this.#rutaBase = new URL("https://www.thesportsdb.com/api/v1/json/123/");
    const { intervaloMinimoMs } = opciones ?? {};
    this.#intervaloMinimoMs =
      intervaloMinimoMs ?? (fetchFn === fetch ? 1100 : 0);
    this.#ultimaPeticionMs = 0;
    this.#colaPeticiones = Promise.resolve();
  }

  get fetchFn() {
    return this.#fetchFn;
  }
  set fetchFn(fn) {
    this.#fetchFn = fn;
  }

  get rutaBase() {
    return this.#rutaBase;
  }
  set rutaBase(url) {
    this.#rutaBase = new URL(url);
  }

  get intervaloMinimoMs() {
    return this.#intervaloMinimoMs;
  }
  set intervaloMinimoMs(ms) {
    this.#intervaloMinimoMs = Number(ms) || 0;
  }

  existeArchivo(ruta) {
    return fs.existsSync(ruta);
  }

  leerJson(ruta, respaldo = []) {
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

  escribirJson(ruta, datos) {
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

  construirUrl(endpoint, parametros = {}) {
    const url = new URL(endpoint, this.#rutaBase);
    Object.entries(parametros).forEach(([clave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== "") {
        url.searchParams.set(clave, String(valor));
      }
    });
    return url;
  }

  async #esperarTurnoPeticion() {
    if (this.#intervaloMinimoMs <= 0) return;
    const ahora = Date.now();
    const transcurrido = ahora - this.#ultimaPeticionMs;
    if (transcurrido < this.#intervaloMinimoMs) {
      await esperar(this.#intervaloMinimoMs - transcurrido);
    }
    this.#ultimaPeticionMs = Date.now();
  }

  async fetchSeguro(url, maxReintentos = 2) {
    const ejecutar = async () => {
      for (let intento = 0; intento < maxReintentos; intento++) {
        await this.#esperarTurnoPeticion();
        let respuesta;
        try {
          respuesta = await this.#fetchFn(url, {
            headers: {
              accept: "application/json",
              "User-Agent": "curl/7.88.1",
            },
          });
        } catch (error) {
          if (intento === maxReintentos - 1) throw error;
          await esperar(400 * (intento + 1));
          continue;
        }

        if (respuesta.status === 429) {
          const headerEspera = respuesta.headers?.get("retry-after");
          const segundos = headerEspera ? parseInt(headerEspera, 10) : 2 * (intento + 1);
          if (segundos <= 5 && intento < maxReintentos - 1) {
            await esperar((segundos + 1) * 1000);
            continue;
          }
          throw new Error(
            headerEspera
              ? `Límite de peticiones de la API alcanzado. Reintenta en ${headerEspera} segundos.`
              : "Límite de peticiones de la API alcanzado. Reintenta más tarde."
          );
        }

        if (!respuesta.ok) {
          throw new Error(`Falla de la API: ${respuesta.status}`);
        }

        return respuesta;
      }
    };

    const turno = this.#colaPeticiones.then(ejecutar, ejecutar);
    this.#colaPeticiones = turno.catch(() => {});
    return turno;
  }
}

export default ClienteApiFutbol;
