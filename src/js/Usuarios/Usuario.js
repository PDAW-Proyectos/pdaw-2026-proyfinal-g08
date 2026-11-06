export class Usuario {
  constructor(id, username, email, password) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.password = password;
  }

  get obtenerId() {
    return this.id;
  }

  get obtenerUsername() {
    return this.username;
  }

  get obtenerEmail() {
    return this.email;
  }
}

export default Usuario;
