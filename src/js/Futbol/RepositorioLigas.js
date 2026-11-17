import { Liga } from "./Liga.js";
import { exponerLiga } from "./formatos.js";
import { Posicion } from "./Posicion.js";

const normalizar = (texto) =>
  String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

export class RepositorioLigas {
  #ligas;

  constructor() {
    this.#ligas = [];
  }

  get ligas() {
    return [...this.#ligas];
  }

  buscarLiga(id) {
    const termino = String(id ?? "").trim().toLowerCase();
    const terminoNorm = normalizar(termino);

    const ligaResultado = this.#ligas.find((l) => {
      if (String(l.id) === termino) return true;
      const nombreNorm = normalizar(l.nombre);
      if (nombreNorm === terminoNorm) return true;
      if (
        terminoNorm.length >= 3 &&
        (nombreNorm.includes(terminoNorm) || terminoNorm.includes(nombreNorm))
      ) {
        return true;
      }
      if (terminoNorm.includes("premier") && String(l.id) === "4328") return true;
      if (terminoNorm.includes("laliga") && String(l.id) === "4335") return true;
      if (terminoNorm.includes("bundesliga") && String(l.id) === "4331") return true;
      if (terminoNorm.includes("seriea") && String(l.id) === "4332") return true;
      if (terminoNorm.includes("ligue") && String(l.id) === "4334") return true;
      return false;
    });

    if (!ligaResultado) {
      throw new Error(`La liga '${id}' no existe`);
    }
    return ligaResultado;
  }

  cargarLigas(datos) {
    if (!Array.isArray(datos)) return;
    datos.forEach((liga) => {
      this.agregarLiga(liga);
    });
  }

  agregarLiga(datos) {
    if (!datos || !datos.id) return null;

    let tablaNueva = [];
    if (Array.isArray(datos.tabla) && datos.tabla.length > 0) {
      tablaNueva = datos.tabla.map((posicionCruda) =>
        posicionCruda instanceof Posicion ? posicionCruda : new Posicion(posicionCruda)
      );
    }

    const indiceExistente = this.#ligas.findIndex((l) => String(l.id) === String(datos.id));
    if (indiceExistente !== -1) {
      const existente = this.#ligas[indiceExistente];
      const tablaFinal = tablaNueva.length > 0 ? tablaNueva : existente.tabla;
      const ligaActualizada = new Liga(
        datos.id,
        datos.nombre || existente.nombre,
        datos.pais || existente.pais,
        datos.escudo || existente.escudo,
        datos.temporada || existente.temporada,
        tablaFinal
      );
      this.#ligas[indiceExistente] = ligaActualizada;
      return ligaActualizada;
    }

    const nuevaLiga = new Liga(
      datos.id,
      datos.nombre,
      datos.pais,
      datos.escudo,
      datos.temporada,
      tablaNueva
    );
    this.#ligas.push(nuevaLiga);
    return nuevaLiga;
  }

  listarLigas() {
    return this.#ligas.map((l) => exponerLiga(l));
  }
}

export default RepositorioLigas;
