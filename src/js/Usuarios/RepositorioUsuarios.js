import { Usuario } from "./Usuario.js";

export class RepositorioUsuarios {
  constructor() {
    this.usuarios = [];
    this.proximoId = 0;
  }

  buscarPorId(id) {
    const usuarioEncontrado = this.usuarios.find((u) => u.obtenerId == id);
    if (!usuarioEncontrado) {
      throw new Error("Usuario no encontrado");
    }
    return usuarioEncontrado;
  }

  crearUsuario(datos) {
    const usuarioNuevo = new Usuario(
      this.proximoId,
      datos.username,
      datos.email,
      datos.password,
    );
    this.proximoId++;
    this.usuarios.push(usuarioNuevo);
    return usuarioNuevo;
  }
}

export default RepositorioUsuarios;
