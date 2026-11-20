import { crearError } from "../utils/errores.js";

export class EstadoCuenta {
  get nombre() {
    return "active";
  }

  autenticable() {
    return false;
  }

  visibleEnComunidad() {
    return true;
  }

  validarCambioEstado() {}

  mismoEstado(nombre) {
    return this.nombre === nombre;
  }

  static desdeNombre(nombre) {
    if (nombre === "suspended") return new EstadoSuspendido();
    if (nombre === "deleted") return new EstadoEliminado();
    return new EstadoActivo();
  }
}

export class EstadoActivo extends EstadoCuenta {
  get nombre() {
    return "active";
  }

  autenticable() {
    return true;
  }
}

export class EstadoSuspendido extends EstadoCuenta {
  get nombre() {
    return "suspended";
  }
}

export class EstadoEliminado extends EstadoCuenta {
  get nombre() {
    return "deleted";
  }

  visibleEnComunidad() {
    return false;
  }

  validarCambioEstado() {
    throw crearError(
      409,
      "deleted_account",
      "La cuenta eliminada no se puede reactivar.",
    );
  }
}
