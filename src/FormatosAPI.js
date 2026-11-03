export function formatearLiga(datos){
    let datosNuevos = {
        id : datos.idLeague,
        nombre : datos.strLeague,
        temporada : datos.strCurrentSeason,
        pais : datos.strCountry,
        escudo : datos.strBadge
    }
    return datosNuevos
}

