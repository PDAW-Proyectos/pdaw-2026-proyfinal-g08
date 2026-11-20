import {
  Configuracion,
  MINUTOS_SESION_PREDETERMINADOS,
} from "../models/Configuracion.js";
import { RepositorioJson } from "./RepositorioJson.js";

export class ConfiguracionRepository extends RepositorioJson {
  #configuracion;

  constructor(archivo, datos = {}) {
    super(archivo);
    this.#configuracion = new Configuracion(datos);
  }

  static async crear(archivo) {
    let datos;
    try {
      const resultado = await RepositorioJson.leerArchivo(archivo, () => ({
        sessionTimeoutMinutes: MINUTOS_SESION_PREDETERMINADOS,
      }));
      datos = resultado.datos;
    } catch (error) {
      throw new Error("No se pudo leer la configuración.", { cause: error });
    }

    return new ConfiguracionRepository(archivo, datos ?? {});
  }

  obtenerMinutosTiempoSesion() {
    return this.#configuracion.sessionTimeoutMinutes;
  }

  async establecerMinutosTiempoSesion(minutos) {
    return this.ejecutarEnCola(async () => {
      const anterior = this.#configuracion.sessionTimeoutMinutes;
      this.#configuracion.sessionTimeoutMinutes = minutos;
      try {
        await this.guardarDatos(this.#configuracion.toJSON());
      } catch (error) {
        this.#configuracion.sessionTimeoutMinutes = anterior;
        throw error;
      }
      return this.#configuracion.sessionTimeoutMinutes;
    });
  }
}

export default ConfiguracionRepository;
