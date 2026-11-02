import Usuario from "../src/Usuario.js";

class RepositorioUsuarios{
    constructor(){
        this.usuarios = [];
        this.proximoId = 0;
    }

    buscarPorId(id){
        let usuarioEncontrado = this.usuarios.filter(u => u.obtenerId == id);
        if (usuarioEncontrado.length === 0){
            throw new Error("Usuario no encontrado");
        }
        return usuarioEncontrado[0];
    }

    crearUsuario(datos){
        const usuarioNuevo = new Usuario(this.proximoId, datos.username, datos.email, datos.password)
        this.proximoId++;
        this.usuarios.push(usuarioNuevo);
    }
}