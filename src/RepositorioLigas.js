import {Liga} from "../src/Liga.js"
import { exponerLiga } from "./Formatos.js";
import { Posicion } from "./Posicion.js";

export class RepositorioLigas{
    constructor(){
        this.ligas = [];
    }
    
    buscarLiga(id){
        let ligaResultado = this.ligas.filter(l => l.id == id);
        console.log(ligaResultado)
        if (ligaResultado.length === 0)
            throw new Error("La liga no existe");
        return ligaResultado[0];
    }
    cargarLigas(datos){
        datos.forEach(liga => {
            this.agregarLiga(liga);
        });
    }
    agregarLiga(datos){
        console.log("Tabla de ", datos.nombre)
        let tabla = datos.tabla.map(posicionCruda => new Posicion(posicionCruda));
        console.log(tabla);
        let nuevaLiga = new Liga(
            datos.id, 
            datos.nombre,
            datos.pais,
            datos.escudo,
            datos.temporada,
            tabla
        );
        this.ligas.push(nuevaLiga);
    }
    listarLigas(){
        let resultado = this.ligas.map(l => exponerLiga(l));
        return resultado;
    }
}