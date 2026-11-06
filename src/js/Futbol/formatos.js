import { Posicion } from "./Posicion.js";

// Expone un objeto liga como JSON
export function exponerLiga(Liga) {
  return {
    id: Liga.id,
    nombre: Liga.nombre,
    pais: Liga.pais,
    escudo: Liga.escudo,
    temporada: Liga.temporada,
    tabla: Liga.tabla,
  };
}

// Formatea la liga proveniente de la API
export function formatearLigaAPI(datos) {
  return {
    id: datos.idLeague,
    nombre: datos.strLeague,
    temporada: datos.strCurrentSeason,
    pais: datos.strCountry,
    escudo: datos.strBadge,
  };
}

function cambiarFormatoPosicion(datos) {
  return {
    idEquipo: datos.idTeam,
    nombreEquipo: datos.strTeam,
    escudoEquipo: datos.strBadge,
    idLiga: datos.idLeague,
    posicion: datos.intRank,
    partidosJugados: datos.intPlayed,
    victorias: datos.intWin,
    derrotas: datos.intLoss,
    empates: datos.intDraw,
    golesFavor: datos.intGoalsFor,
    golesContra: datos.intGoalsAgainst,
    diferenciaGol: datos.intGoalDifference,
    puntos: datos.intPoints,
    racha: datos.strForm,
  };
}

export function formatearTablaAPI(tablaCruda = []) {
  if (!Array.isArray(tablaCruda)) return [];
  return tablaCruda.map((posicionCruda) => {
    const posicionFormateada = cambiarFormatoPosicion(posicionCruda);
    return new Posicion(posicionFormateada);
  });
}
