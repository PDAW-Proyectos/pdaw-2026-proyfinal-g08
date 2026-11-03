import { Liga } from "./Liga.js";

export class RepositorioLigas{
    constructor(){
        this.ligas = [];
    }
    
    async cargarLigas(datos){
        datos.forEach(liga => {
            this.agregarLiga(liga);
        });
    }

    listar(){
        return this.ligas;
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
            datos.escudo,
            datos.temporada
        );
        console.log(nuevaLiga)
        this.ligas.push(nuevaLiga);
    }
}