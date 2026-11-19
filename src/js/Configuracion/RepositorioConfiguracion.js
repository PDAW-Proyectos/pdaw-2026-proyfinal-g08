import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const MINUTOS_SESION_PREDETERMINADOS = 10;
export const MINUTOS_SESION_MINIMOS = 1;
export const MINUTOS_SESION_MAXIMOS = 1440;

const esTiempoSesionValido = (minutos) =>
  Number.isInteger(minutos) &&
  minutos >= MINUTOS_SESION_MINIMOS &&
  minutos <= MINUTOS_SESION_MAXIMOS;

export async function crearRepositorioConfiguracion(archivo) {
  await fs.mkdir(path.dirname(archivo), { recursive: true });

  let configuracion;
  try {
    configuracion = JSON.parse(await fs.readFile(archivo, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new Error("No se pudo leer la configuración.", { cause: error });
    }

    configuracion = {
      sessionTimeoutMinutes: MINUTOS_SESION_PREDETERMINADOS,
    };
  }

  if (
    !configuracion ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion) ||
    !esTiempoSesionValido(configuracion.sessionTimeoutMinutes)
  ) {
    throw new Error("El archivo de configuración tiene un formato inválido.");
  }

  let colaEscrituras = Promise.resolve();

  return {
    obtenerMinutosTiempoSesion() {
      return configuracion.sessionTimeoutMinutes;
    },
    establecerMinutosTiempoSesion(minutos) {
      if (!esTiempoSesionValido(minutos)) {
        const error = new Error(
          `La duración de sesión debe ser un número entero entre ${MINUTOS_SESION_MINIMOS} y ${MINUTOS_SESION_MAXIMOS} minutos.`,
        );
        error.code = "tiempo_sesion_invalido";
        return Promise.reject(error);
      }

      const siguiente = colaEscrituras.then(async () => {
        const anterior = configuracion;
        const nuevaConfiguracion = {
          ...configuracion,
          sessionTimeoutMinutes: minutos,
        };
        const archivoTemporal = `${archivo}.${randomUUID()}.tmp`;

        try {
          await fs.writeFile(
            archivoTemporal,
            JSON.stringify(nuevaConfiguracion, null, 2),
            { encoding: "utf8", mode: 0o600 },
          );
          await fs.rename(archivoTemporal, archivo);
        } catch (error) {
          await fs.unlink(archivoTemporal).catch((errorLimpieza) => {
            if (errorLimpieza.code !== "ENOENT") throw errorLimpieza;
          });
          configuracion = anterior;
          throw error;
        }

        configuracion = nuevaConfiguracion;
        return configuracion.sessionTimeoutMinutes;
      });

      colaEscrituras = siguiente.catch(() => {});
      return siguiente;
    },
  };
}

export default crearRepositorioConfiguracion;
