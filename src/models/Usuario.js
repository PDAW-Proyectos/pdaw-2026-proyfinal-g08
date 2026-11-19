export class Usuario {
  #id;
  #name;
  #email;
  #passwordHash;
  #salt;
  #favoriteTeam;

  constructor(datos = {}) {
    this.#id = datos.id ?? "";
    this.#name = datos.name ?? "";
    this.#email = datos.email ?? "";
    this.#passwordHash = datos.passwordHash ?? "";
    this.#salt = datos.salt ?? "";
    this.#favoriteTeam = datos.favoriteTeam ?? null;
  }

  get id() { return this.#id; }
  get name() { return this.#name; }
  get email() { return this.#email; }
  get passwordHash() { return this.#passwordHash; }
  get salt() { return this.#salt; }
  get favoriteTeam() { return this.#favoriteTeam; }

  toPublicJSON() {
    return {
      id: this.#id,
      name: this.#name,
      email: this.#email,
      favoriteTeam: this.#favoriteTeam,
    };
  }

  toJSON() {
    return {
      id: this.#id,
      name: this.#name,
      email: this.#email,
      passwordHash: this.#passwordHash,
      salt: this.#salt,
      favoriteTeam: this.#favoriteTeam,
    };
  }
}

export default Usuario;
