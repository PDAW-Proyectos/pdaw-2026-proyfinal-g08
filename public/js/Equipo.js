class Equipo {
    constructor(id, nombre, escudo, _puntos, proximoPartido, _datos) {
        this.id = id;
        this.nombre = nombre;
        this.escudo = escudo;
        this.proximoPartido = proximoPartido;
        this.recientes = [];
    }

    get obtenerId(){
        return this.id;
    }
    get obtenerNombre(){
        return this.nombre;
    }
    get obtenerEscudo(){
        return this.escudo;
    }
}

window.Equipo = Equipo;