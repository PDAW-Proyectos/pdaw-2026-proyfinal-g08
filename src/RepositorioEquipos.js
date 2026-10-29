import {Equipo} from "../src/Equipo.js"

class RepositorioEquipos{ 
    constructor(){
        this.equipos = [];
    }

    buscarEquipo(id){
        let resultado = this.equipos.filter(e => e.id == id);
        if (resultado.length == 0)
            throw new Error("El equipo no existe");
        return resultado[0];
    }
    agregarEquipos(datos){
        let equipoNuevo = new Equipo(
            datos.id, 
            datos.nombre, 
            datos.escudo,
        )
        this.equipos.push(equipoNuevo);
    }
}