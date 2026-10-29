import {Liga} from "../src/Liga.js"

class RepositorioLigas{

    constructor(){
        this.ligas = [];
    }

    buscarLiga(id){
        let ligaResultado = this.ligas.filter(l => l.id == id);
        if (ligaResultado.length === 0)
            throw new Error("La liga no existe");
        return ligaResultado[0];
    }
    agregarLiga(datos){
        let nuevaLiga = new Liga(
            datos.id, 
            datos.nombre,
            datos.pais,
            datos.escudo
        );
        this.ligas.push(nuevaLiga);
    }
}