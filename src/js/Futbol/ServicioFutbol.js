export const LIGAS_UTILIZADAS_IDS = ["4328", "4331", "4332", "4335", "4334"];
import { formatearLigaAPI, formatearTablaAPI } from "./formatos.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class ServicioFutbol {
  constructor(fetchFn = fetch) {
    this.fetchFn = fetchFn;
    this.rutaBase = new URL("https://www.thesportsdb.com/api/v1/json/123/");
  }

  async fetchSeguro(url, maxReintentos = 3) {
    for (let intento = 0; intento < maxReintentos; intento++) {
      let respuesta;
      try {
        respuesta = await this.fetchFn(url);
      } catch (error) {
        if (intento === maxReintentos - 1) throw error;
        await esperar(500 * (intento + 1));
        continue;
      }

      if (respuesta.status === 429) {
        const headerEspera = respuesta.headers?.get("retry-after");
        const segundos = headerEspera ? parseInt(headerEspera, 10) : 2 * (intento + 1);
        if (segundos <= 15 && intento < maxReintentos - 1) {
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
  }

  async listarLigas() {
    const url = new URL("all_leagues.php", this.rutaBase);
    const respuesta = await this.fetchSeguro(url);
    const datos = (await respuesta.json()).leagues.filter((liga) =>
      LIGAS_UTILIZADAS_IDS.includes(liga.idLeague)
    );
    const arregloFormateado = datos.map((liga) => formatearLigaAPI(liga));
    return arregloFormateado;
  }

  async buscarLigaPorId(id) {
    const url = new URL("lookupleague.php", this.rutaBase);
    url.searchParams.set("id", id);
    const respuesta = await this.fetchSeguro(url);
    const datos = (await respuesta.json()).leagues;
    if (!datos || datos.length === 0) {
      throw new Error(`Liga con id ${id} no encontrada`);
    }
    return formatearLigaAPI(datos[0]);
  }

  async buscarTablaDeLiga(id) {
    const url = new URL("lookuptable.php", this.rutaBase);
    url.searchParams.set("l", id);
    const respuesta = await this.fetchSeguro(url);
    const datos = (await respuesta.json()).table;
    return formatearTablaAPI(datos || []);
  }
}

export default ServicioFutbol;
