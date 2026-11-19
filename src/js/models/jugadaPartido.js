import {repositorioPartidos} from "../Futbol/RepositorioPartidos.js"

class jugadaPartido{

    #golesLocal;
    #golesVisitante;
    #idPartido;
    #puntaje;

    constructor(golesLocal, golesVisitante, idPartido){
        this.golesLocal = golesLocal;
        this.golesVisitante = golesVisitante;
        this.idPartido = idPartido;
    }
    get obtenerGolesVisitante(){
        return this.#golesVisitante
    }
    get obtenerGolesLocal(){
        return this.#golesLocal
    }
    get obtenerIDPartido(){
        return this.#idPartido
    }
    calcularPuntaje(){
        let partido = repositorioPartidos.obtenerPorId(this.#idPartido);
        if (!partido.esJugado) return;
        if (partido.golesVisitante == this.golesVisitante &&
            partido.golesLocal == this.golesLocal)
            this.puntaje = 6;
        if (partido.golesLocal>partido.golesVisitante && this.golesLocal > this.golesVisitante )
            this.#puntaje = 3;
        if (partido.golesLocal < partido.golesVisitante && this.golesLocal > this.golesVisitante)
            this.#puntaje = 3;
        return this.#puntaje
    }
}