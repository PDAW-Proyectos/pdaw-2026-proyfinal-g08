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