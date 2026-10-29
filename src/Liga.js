

class Liga{
    constructor(id, nombre, pais, escudo, tabla){
        this.id = id;
        this.nombre = nombre;
        this.pais = pais;
        this.escudo = escudo;
        this.tabla = [];
    }

    get obtenerId(){
        return this.id;
    }
    get obtenerNombre(){
        return this.nombre;
    }
    get obtenerPais(){
        return this.pais
    }
    get obtenerEscudo(){
        return this.escudo;
    }
    get obtenerTabla(){
        return this.tabla;
    }
}