export const MINUTOS_SESION_PREDETERMINADOS = 10;
export const MINUTOS_SESION_MINIMOS = 1;
export const MINUTOS_SESION_MAXIMOS = 1440;

export function esTiempoSesionValido(minutos) {
  return (
    Number(minutos) === minutos &&
    minutos % 1 === 0 &&
    minutos >= MINUTOS_SESION_MINIMOS &&
    minutos <= MINUTOS_SESION_MAXIMOS
  );
}

export class Configuracion {
  #sessionTimeoutMinutes;

  constructor(datos = {}) {
    const minutos =
      datos.sessionTimeoutMinutes ?? MINUTOS_SESION_PREDETERMINADOS;
    if (!esTiempoSesionValido(minutos)) {
      throw new Error("El archivo de configuración tiene un formato inválido.");
    }
    this.#sessionTimeoutMinutes = minutos;
  }

  get sessionTimeoutMinutes() {
    return this.#sessionTimeoutMinutes;
  }

  set sessionTimeoutMinutes(minutos) {
    if (!esTiempoSesionValido(minutos)) {
      throw new Error(
        `La duración de sesión debe ser un número entero entre ${MINUTOS_SESION_MINIMOS} y ${MINUTOS_SESION_MAXIMOS} minutos.`,
      );
    }
    this.#sessionTimeoutMinutes = minutos;
  }

  toJSON() {
    return {
      sessionTimeoutMinutes: this.#sessionTimeoutMinutes,
    };
  }
}

export default Configuracion;
