import { mapearTablaAPI } from "../utils/apiMappers.js";

export class LigasService {
  #ligasRepo;
  #partidosRepo;
  #apiFutbol;

  constructor({ ligasRepo, partidosRepo = null, apiFutbol = null }) {
    this.#ligasRepo = ligasRepo;
    this.#partidosRepo = partidosRepo;
    this.#apiFutbol = apiFutbol;
  }

  listar() {
    return this.#ligasRepo.listar();
  }

  async obtenerDetalle(id) {
    const liga = this.#ligasRepo.buscar(id);
    let errorTabla = null;

    if (liga.tabla.length === 0 && this.#apiFutbol) {
      try {
        const tabla = await this.buscarTablaDeLiga(liga.id, {
          temporada: liga.temporada,
        });
        if (tabla.length > 0) {
          liga.tabla = tabla;
          this.#ligasRepo.guardarLocal();
        }
      } catch (err) {
        errorTabla = err.status
          ? `Error ${err.status}: ${err.message}`
          : err.message;
      }
    }

    const respuesta = liga.toJSON();
    if (errorTabla && respuesta.tabla.length === 0) {
      respuesta.errorTabla = errorTabla;
    }
    return respuesta;
  }

  obtenerPartidos(id) {
    const liga = this.#ligasRepo.buscar(id);
    return this.#partidosRepo
      ? this.#partidosRepo.obtenerEventosDeLiga(liga.id)
      : { proximos: [], jugados: [] };
  }

  async buscarTablaDeLiga(id, { temporada = "" } = {}) {
    if (!this.#apiFutbol) return [];
    const clave = String(id);
    let cuerpo = await this.#apiFutbol.fetchJson("lookuptable.php", {
      l: clave,
    });
    let datos = cuerpo?.table;

    if ((!Array.isArray(datos) || datos.length === 0) && temporada) {
      cuerpo = await this.#apiFutbol.fetchJson("lookuptable.php", {
        l: clave,
        s: String(temporada),
      });
      datos = cuerpo?.table;
    }

    return mapearTablaAPI(datos || []);
  }
}

export default LigasService;
