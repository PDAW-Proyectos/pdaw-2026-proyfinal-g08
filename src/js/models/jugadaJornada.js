
class jugadadJornada{
    #idUsuario;
    #idProdeDeJornada;
    #jugadasPartidos;
    #puntajeTotal

    constructor(idUsuario, idProdeDeJornada, jugadas){
        this.idUsuario = idUsuario;
        this.idProdeDeJornada = idProdeDeJornada;
        this.jugadasPartidos = jugadas ?? [];
        this.puntajeTotal = 0
    }

    get obtenerIdUsuario(){
        return this.idUsuario;
    }
    get obtenerIdProdeDeJornada(){
        return this.idProdeDeJornada;
    }
    get obtenerPuntajeTotal(){
        return this.puntajeTotal;
    }
    calcularPuntajeTotal(){
        let puntos = 0;
        this.jugadasPartidos.forEach(jugada => {
            puntos += jugada.calcularPuntaje()
        });
        this.puntajeTotal = puntos;
        return puntos;
    }
}