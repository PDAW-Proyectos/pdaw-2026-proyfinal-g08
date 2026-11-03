import {Liga} from "../src/Liga.js"
import { exponerLiga } from "./Formatos.js";

export class RepositorioLigas{
    constructor(){
        this.ligas = [];
    }
    
    cargarLigas(datos){
        datos.forEach(liga => {
            this.agregarLiga(liga);
        });
    }

    buscarLiga(id){
        let ligaResultado = this.ligas.filter(l => l.id == id);
        console.log(ligaResultado)
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
        this.ligas.push(nuevaLiga);
    }
    listarLigas(){
        let resultado = this.ligas.map(l => exponerLiga(l));
        return resultado;
    }
}