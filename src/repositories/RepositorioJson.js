import {
  crearColaEscritura,
  escribirJsonAtomico,
  leerJsonAsync,
} from "../utils/jsonFile.js";

export class RepositorioJson {
  #archivo;
  #serializarEscritura;

  constructor(archivo) {
    this.#archivo = archivo;
    this.#serializarEscritura = crearColaEscritura();
  }

  get archivo() {
    return this.#archivo;
  }

  static async leerArchivo(archivo, crearRespaldo) {
    return leerJsonAsync(archivo, crearRespaldo);
  }

  async guardarDatos(datos) {
    await escribirJsonAtomico(this.#archivo, datos);
  }

  ejecutarEnCola(operacion) {
    return this.#serializarEscritura(operacion);
  }
}

export default RepositorioJson;
