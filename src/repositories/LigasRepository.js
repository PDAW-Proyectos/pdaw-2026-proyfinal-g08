import { Liga } from "../models/Liga.js";
import { normalizarTexto } from "../utils/texto.js";
import { existeArchivo, leerJson, escribirJson } from "../utils/jsonFile.js";
import { mapearTablaAPI } from "../utils/apiMappers.js";
import { crearError } from "../utils/errores.js";

const ALIAS_LIGAS = {
  premier: "4328",
  laliga: "4335",
  bundesliga: "4331",
  seriea: "4332",
  ligue: "4334",
};

export class LigasRepository {
  #ligas;
  #rutaLigas;

  constructor(rutaLigas = "./data/ligas.json") {
    this.#ligas = [];
    this.#rutaLigas = rutaLigas;
  }

  get ligas() {
    return [...this.#ligas];
  }

  get rutaLigas() {
    return this.#rutaLigas;
  }
  set rutaLigas(ruta) {
    this.#rutaLigas = ruta;
  }

  cargarLocal(ligasRespaldo = []) {
    const raw = leerJson(this.#rutaLigas, null);
    const arreglo = Array.isArray(raw) && raw.length > 0 ? raw : ligasRespaldo;
    if (!existeArchivo(this.#rutaLigas) && arreglo.length > 0) {
      escribirJson(this.#rutaLigas, arreglo);
    }
    const instanciadas = arreglo.map(
      (l) =>
        new Liga({
          id: l.id,
          nombre: l.nombre,
          pais: l.pais,
          escudo: l.escudo,
          temporada: l.temporada,
          tabla: mapearTablaAPI(Array.isArray(l.tabla) ? l.tabla : []),
        }),
    );
    this.cargar(instanciadas);
    return instanciadas;
  }

  guardarLocal(ligas = this.#ligas) {
    escribirJson(
      this.#rutaLigas,
      ligas.map((l) => new Liga(l).toJSON()),
    );
  }

  buscar(id) {
    const termino = String(id ?? "")
      .trim()
      .toLowerCase();
    const terminoNorm = normalizarTexto(termino);

    const liga = this.#ligas.find((l) => {
      if (String(l.id) === termino) return true;
      const nombreNorm = normalizarTexto(l.nombre);
      if (nombreNorm === terminoNorm) return true;
      if (
        terminoNorm.length >= 3 &&
        (nombreNorm.includes(terminoNorm) || terminoNorm.includes(nombreNorm))
      ) {
        return true;
      }
      return Object.entries(ALIAS_LIGAS).some(
        ([alias, idAlias]) =>
          terminoNorm.includes(alias) && String(l.id) === idAlias,
      );
    });

    if (!liga)
      throw crearError(404, "league_not_found", `La liga '${id}' no existe.`);
    return liga;
  }

  cargar(datos) {
    if (!Array.isArray(datos)) return;
    datos.forEach((liga) => this.agregar(liga));
  }

  agregar(datos) {
    if (!datos || !datos.id) return null;
    const nueva = new Liga(datos);
    const idx = this.#ligas.findIndex((l) => String(l.id) === String(nueva.id));

    if (idx !== -1) {
      const actual = this.#ligas[idx];
      const fusionada = new Liga({
        id: nueva.id,
        nombre: nueva.nombre || actual.nombre,
        pais: nueva.pais || actual.pais,
        escudo: nueva.escudo || actual.escudo,
        temporada: nueva.temporada || actual.temporada,
        tabla: nueva.tabla.length > 0 ? nueva.tabla : actual.tabla,
      });
      this.#ligas[idx] = fusionada;
      return fusionada;
    }

    this.#ligas.push(nueva);
    return nueva;
  }

  listar() {
    return this.#ligas.map((l) => l.toJSON());
  }
}

export default LigasRepository;
