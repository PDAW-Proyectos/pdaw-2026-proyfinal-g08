import { esperar } from "../utils/fechas.js";
import { crearError } from "../utils/errores.js";

export const LIGAS_UTILIZADAS_IDS = ["4328", "4331", "4332", "4335", "4334"];

export const LIGAS_PRINCIPALES_DEFAULT = [
  {
    id: "4328",
    nombre: "English Premier League",
    pais: "England",
    escudo:
      "https://r2.thesportsdb.com/images/media/league/badge/gasy9d1737743125.png",
    temporada: "2026-2027",
    tabla: [],
  },
  {
    id: "4331",
    nombre: "German Bundesliga",
    pais: "Germany",
    escudo:
      "https://r2.thesportsdb.com/images/media/league/badge/teqh1b1679952008.png",
    temporada: "2026-2027",
    tabla: [],
  },
  {
    id: "4332",
    nombre: "Italian Serie A",
    pais: "Italy",
    escudo:
      "https://r2.thesportsdb.com/images/media/league/badge/67q3q21679951383.png",
    temporada: "2026-2027",
    tabla: [],
  },
  {
    id: "4335",
    nombre: "Spanish La Liga",
    pais: "Spain",
    escudo:
      "https://r2.thesportsdb.com/images/media/league/badge/ja4it51687628717.png",
    temporada: "2026-2027",
    tabla: [],
  },
  {
    id: "4334",
    nombre: "French Ligue 1",
    pais: "France",
    escudo:
      "https://r2.thesportsdb.com/images/media/league/badge/9f7z9d1742983155.png",
    temporada: "2026-2027",
    tabla: [],
  },
];

export class ApiFutbolService {
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

  construirUrl(endpoint, parametros = {}) {
    const url = new URL(endpoint, this.#rutaBase);
    Object.entries(parametros).forEach(([clave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== "") {
        url.searchParams.set(clave, String(valor));
      }
    });
    return url;
  }

  async #esperarTurno() {
    if (this.#intervaloMinimoMs <= 0) return;
    const transcurrido = Date.now() - this.#ultimaPeticionMs;
    if (transcurrido < this.#intervaloMinimoMs) {
      await esperar(this.#intervaloMinimoMs - transcurrido);
    }
    this.#ultimaPeticionMs = Date.now();
  }

  async fetchJson(endpoint, parametros = {}, maxReintentos = 2) {
    const url = this.construirUrl(endpoint, parametros);
    const ejecutar = async () => {
      for (let intento = 0; intento < maxReintentos; intento++) {
        await this.#esperarTurno();
        let respuesta;
        try {
          respuesta = await this.#fetchFn(url, {
            headers: {
              accept: "application/json",
              "User-Agent": "curl/7.88.1",
            },
          });
        } catch {
          if (intento === maxReintentos - 1) {
            throw crearError(
              502,
              "external_api_unreachable",
              "No se pudo conectar con la API externa de fútbol.",
            );
          }
          await esperar(400 * (intento + 1));
          continue;
        }

        if (respuesta.status === 429) {
          const headerEspera = respuesta.headers?.get("retry-after");
          const segundos = headerEspera
            ? parseInt(headerEspera, 10)
            : 2 * (intento + 1);
          if (segundos <= 5 && intento < maxReintentos - 1) {
            await esperar((segundos + 1) * 1000);
            continue;
          }
          throw crearError(
            429,
            "rate_limited",
            headerEspera
              ? `Límite de peticiones de la API externa alcanzado. Reintenta en ${headerEspera} s.`
              : "Límite de peticiones de la API externa alcanzado. Reintenta más tarde.",
          );
        }

        if (!respuesta.ok) {
          throw crearError(
            502,
            "external_api_error",
            `La API externa de fútbol respondió con error HTTP ${respuesta.status}.`,
          );
        }

        try {
          return await respuesta.json();
        } catch {
          throw crearError(
            502,
            "external_api_invalid_json",
            "La API externa devolvió una respuesta inválida.",
          );
        }
      }
    };

    const turno = this.#colaPeticiones.then(ejecutar, ejecutar);
    this.#colaPeticiones = turno.catch(() => {});
    return turno;
  }
}

export default ApiFutbolService;
