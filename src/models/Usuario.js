import { EstadoCuenta, EstadoEliminado } from "./EstadoCuenta.js";
import { crearError } from "../utils/errores.js";
import { normalizarCorreo } from "../utils/texto.js";

export class Usuario {
  #id;
  #name;
  #email;
  #passwordHash;
  #salt;
  #favoriteTeam;
  #estado;
  #createdAt;
  #statusChangedAt;
  #deletedAt;

  constructor(datos = {}) {
    this.#id = datos.id ?? "";
    this.#name = datos.name ?? "";
    this.#email = datos.email ? normalizarCorreo(datos.email) : "";
    this.#passwordHash = datos.passwordHash;
    this.#salt = datos.salt;
    this.#favoriteTeam = datos.favoriteTeam ?? null;
    this.#estado = EstadoCuenta.desdeNombre(datos.status || "active");
    this.#createdAt = datos.createdAt ?? null;
    this.#statusChangedAt = datos.statusChangedAt ?? null;
    this.#deletedAt = datos.deletedAt ?? null;
  }

  static crear(datos = {}) {
    if (datos.role === "admin") {
      return new UsuarioAdministrador(datos);
    }
    return new UsuarioComun(datos);
  }

  get id() {
    return this.#id;
  }
  get name() {
    return this.#name;
  }
  get email() {
    return this.#email;
  }
  get passwordHash() {
    return this.#passwordHash;
  }
  get salt() {
    return this.#salt;
  }
  get favoriteTeam() {
    return this.#favoriteTeam;
  }
  get role() {
    return "user";
  }
  get status() {
    return this.#estado.nombre;
  }
  get createdAt() {
    return this.#createdAt;
  }
  get statusChangedAt() {
    return this.#statusChangedAt;
  }
  get deletedAt() {
    return this.#deletedAt;
  }

  puedeAdministrar() {
    return false;
  }

  verificarAccesoAdmin() {
    throw crearError(
      403,
      "forbidden",
      "No tenés permisos para realizar esta acción.",
    );
  }

  validarCambioEstado() {}

  validarEliminacion() {}

  autenticable() {
    return this.#estado.autenticable();
  }

  visibleEnComunidad() {
    return this.#estado.visibleEnComunidad();
  }

  cambiarEstado(status) {
    this.validarCambioEstado();
    this.#estado.validarCambioEstado();
    if (this.#estado.mismoEstado(status)) return false;
    this.#estado = EstadoCuenta.desdeNombre(status);
    this.#statusChangedAt = new Date().toISOString();
    return true;
  }

  marcarEliminado() {
    this.validarEliminacion();
    if (!this.visibleEnComunidad()) return false;
    const fecha = new Date().toISOString();
    this.#name = "Cuenta borrada";
    this.#estado = new EstadoEliminado();
    this.#statusChangedAt = fecha;
    this.#deletedAt = fecha;
    this.#passwordHash = undefined;
    this.#salt = undefined;
    return true;
  }

  comoUsuarioComun() {
    return new UsuarioComun({ ...this.toJSON(), role: "user" });
  }

  crearInstantanea() {
    return this.toJSON();
  }

  restaurarDesde(snapshot) {
    this.#id = snapshot.id ?? "";
    this.#name = snapshot.name ?? "";
    this.#email = snapshot.email ?? "";
    this.#passwordHash = snapshot.passwordHash;
    this.#salt = snapshot.salt;
    this.#favoriteTeam = snapshot.favoriteTeam ?? null;
    this.#estado = EstadoCuenta.desdeNombre(snapshot.status || "active");
    this.#createdAt = snapshot.createdAt ?? null;
    this.#statusChangedAt = snapshot.statusChangedAt ?? null;
    this.#deletedAt = snapshot.deletedAt ?? null;
  }

  toPublicJSON() {
    return {
      id: this.#id,
      name: this.#name,
      email: this.#email,
      favoriteTeam: this.#favoriteTeam,
      role: this.role,
    };
  }

  toPublicProfileJSON() {
    return {
      id: this.#id,
      name: this.#name,
      favoriteTeam: this.#favoriteTeam,
    };
  }

  toProfileJSON() {
    return {
      ...this.toPublicProfileJSON(),
      email: this.#email,
      role: this.role,
    };
  }

  toAdminJSON() {
    return {
      id: this.#id,
      name: this.#name,
      email: this.#email,
      favoriteTeam: this.#favoriteTeam,
      role: this.role,
      status: this.status,
      createdAt: this.#createdAt,
      statusChangedAt: this.#statusChangedAt,
      deletedAt: this.#deletedAt,
    };
  }

  toJSON() {
    const json = {
      id: this.#id,
      name: this.#name,
      email: this.#email,
    };
    if (this.#passwordHash !== undefined)
      json.passwordHash = this.#passwordHash;
    if (this.#salt !== undefined) json.salt = this.#salt;
    json.role = this.role;
    json.favoriteTeam = this.#favoriteTeam;
    json.status = this.status;
    if (this.#createdAt !== null) json.createdAt = this.#createdAt;
    if (this.#statusChangedAt !== null)
      json.statusChangedAt = this.#statusChangedAt;
    if (this.#deletedAt !== null) json.deletedAt = this.#deletedAt;
    return json;
  }
}

export class UsuarioComun extends Usuario {}

export class UsuarioAdministrador extends Usuario {
  get role() {
    return "admin";
  }

  puedeAdministrar() {
    return true;
  }

  verificarAccesoAdmin() {}

  validarCambioEstado() {
    throw crearError(
      403,
      "protected_admin",
      "No se puede suspender al administrador.",
    );
  }

  validarEliminacion() {
    throw crearError(
      403,
      "protected_admin",
      "No se puede eliminar al administrador.",
    );
  }
}

export default Usuario;
