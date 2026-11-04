export class Posicion{
    constructor(datos){
        this.idEquipo = datos.idEquipo,
        this.nombreEquipo = datos.nombreEquipo,
        this.escudoEquipo = datos.escudoEquipo,
        this.idLiga = datos.idLiga,
        this.posicion = datos.posicion,
        this.partidosJugados = datos.partidosJugados,
        this.victorias = datos.victorias,
        this.derrotas = datos.derrotas,
        this.empates = datos.empates,
        this.golesFavor = datos.golesFavor,
        this.golesContra = datos.golesContra,
        this.diferenciaGol = datos.diferenciaGol,
        this.puntos = datos.puntos, 
        this.racha = datos.racha
    }
}