import {Posicion} from "./Posicion.js"

//Expone un objeto liga como JSON
export function exponerLiga(Liga){
    let ligaExpuesta = {
        id : Liga.id,
        nombre : Liga.nombre,
        pais : Liga.pais,
        escudo : Liga.escudo,
        temporada : Liga.temporada,
        tabla: Liga.tabla
    }
    return ligaExpuesta;
}
//Formatea la liga proveniente de la API
export function formatearLigaAPI(datos){
    let datosNuevos = {
        id : datos.idLeague,
        nombre : datos.strLeague,
        temporada : datos.strCurrentSeason,
        pais : datos.strCountry,
        escudo : datos.strBadge
    }
    return datosNuevos
}
export function formatearTablaAPI(tablaCruda){
    let tablaFormateada = tablaCruda.map(posicionCruda =>{
        let posicionFormateada = cambiarFormatoPosicion(posicionCruda);
        return new Posicion(posicionFormateada);
    })
    return tablaFormateada;
}
 function cambiarFormatoPosicion(datos){
    return {
        idEquipo : datos.idTeam,
        nombreEquipo : datos.strTeam,
        escudoEquipo : datos.strBadge,
        idLiga : datos.idLeague,
        posicion : datos.intRank,
        partidosJugados : datos.intPlayed,
        victorias : datos.intWin,
        derrotas : datos.intLoss,
        empates : datos.intDraw,
        golesFavor : datos.intGoalsFor,
        golesContra : datos.intGoalsAgainst,
        diferenciaGol : datos.intGoalDifference,
        puntos : datos.intPoints, 
        racha : datos.strForm
    } 
}
