//Expone un objeto liga como JSON
export function exponerLiga(Liga){
    let ligaExpuesta = {
        id : Liga.id,
        nombre : Liga.nombre,
        pais : Liga.pais,
        escudo : Liga.escudo,
        temporada : Liga.temporada
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
