import { Liga } from "./Liga.js";
import {
  LIGAS_UTILIZADAS_IDS,
  LIGAS_PRINCIPALES_DEFAULT,
} from "./ClienteApiFutbol.js";
import { formatearLigaAPI, formatearTablaAPI, exponerLiga } from "./formatos.js";

export class ServicioLigas {
  #clienteApi;
  #rutaLigas;

  constructor(clienteApi, rutaLigas = "./data/ligas.json") {
    this.#clienteApi = clienteApi;
    this.#rutaLigas = rutaLigas;
  }

  get rutaLigas() {
    return this.#rutaLigas;
  }
  set rutaLigas(ruta) {
    this.#rutaLigas = ruta;
  }

  cargarLigasLocal() {
    const raw = this.#clienteApi.leerJson(this.#rutaLigas, null);
    const arreglo = Array.isArray(raw) && raw.length > 0 ? raw : LIGAS_PRINCIPALES_DEFAULT;
    if (!this.#clienteApi.existeArchivo(this.#rutaLigas)) {
      this.#clienteApi.escribirJson(this.#rutaLigas, arreglo);
    }
    return arreglo.map(
      (l) =>
        new Liga(
          l.id,
          l.nombre,
          l.pais,
          l.escudo,
          l.temporada,
          formatearTablaAPI(Array.isArray(l.tabla) ? l.tabla : [])
        )
    );
  }

  guardarLigasLocal(ligas = []) {
    const serializadas = ligas.map((l) => exponerLiga(l));
    this.#clienteApi.escribirJson(this.#rutaLigas, serializadas);
  }

  async listarLigas() {
    try {
      const url = this.#clienteApi.construirUrl("all_leagues.php");
      const respuesta = await this.#clienteApi.fetchSeguro(url);
      const datos = (await respuesta.json()).leagues.filter((liga) =>
        LIGAS_UTILIZADAS_IDS.includes(liga.idLeague)
      );
      return datos.map((liga) => formatearLigaAPI(liga));
    } catch (error) {
      console.warn("Aviso en listarLigas de API, usando JSON local:", error.message);
      return this.cargarLigasLocal().map((l) => exponerLiga(l));
    }
  }

  async buscarLigaPorId(id) {
    const clave = String(id);
    try {
      const url = this.#clienteApi.construirUrl("lookupleague.php", { id: clave });
      const respuesta = await this.#clienteApi.fetchSeguro(url);
      const datos = (await respuesta.json()).leagues;
      if (!datos || datos.length === 0) {
        throw new Error(`Liga con id ${id} no encontrada`);
      }
      return formatearLigaAPI(datos[0]);
    } catch (error) {
      const local = this.cargarLigasLocal().find((l) => String(l.id) === clave);
      if (local) return exponerLiga(local);
      throw error;
    }
  }

  async buscarTablaDeLiga(id, { lanzarError = false, temporada = "" } = {}) {
    const clave = String(id);
    try {
      const url = this.#clienteApi.construirUrl("lookuptable.php", { l: clave });
      const respuesta = await this.#clienteApi.fetchSeguro(url);
      let datos = (await respuesta.json()).table;

      if ((!Array.isArray(datos) || datos.length === 0) && temporada) {
        const urlTemp = this.#clienteApi.construirUrl("lookuptable.php", {
          l: clave,
          s: String(temporada),
        });
        const resTemp = await this.#clienteApi.fetchSeguro(urlTemp);
        datos = (await resTemp.json()).table;
      }

      return formatearTablaAPI(datos || []);
    } catch (error) {
      console.warn(`Aviso al buscar tabla de liga ${id}:`, error.message);
      if (lanzarError) throw error;
      return [];
    }
  }
}

export default ServicioLigas;
