import { Posicion } from "./Posicion.js";
import { Partido } from "./Partido.js";
import { Equipo } from "./Equipo.js";

// Expone un objeto liga como JSON usando sus getters públicos
export function exponerLiga(liga) {
  if (!liga) return null;
  if (typeof liga.toJSON === "function") return liga.toJSON();
  return {
    id: liga.id,
    nombre: liga.nombre,
    pais: liga.pais,
    escudo: liga.escudo,
    temporada: liga.temporada,
    tabla: liga.tabla,
  };
}

// Formatea la liga proveniente de la API
export function formatearLigaAPI(datos = {}) {
  return {
    id: datos.idLeague ?? datos.id ?? "",
    nombre: datos.strLeague ?? datos.nombre ?? "",
    temporada: datos.strCurrentSeason ?? datos.temporada ?? "",
    pais: datos.strCountry ?? datos.pais ?? "",
    escudo: datos.strBadge ?? datos.escudo ?? "",
  };
}

function cambiarFormatoPosicion(datos = {}) {
  return {
    idEquipo: datos.idTeam ?? datos.idEquipo ?? "",
    nombreEquipo: datos.strTeam ?? datos.nombreEquipo ?? "",
    escudoEquipo: datos.strBadge ?? datos.escudoEquipo ?? "",
    idLiga: datos.idLeague ?? datos.idLiga ?? "",
    posicion: datos.intRank ?? datos.posicion ?? "",
    partidosJugados: datos.intPlayed ?? datos.partidosJugados ?? "0",
    victorias: datos.intWin ?? datos.victorias ?? "0",
    derrotas: datos.intLoss ?? datos.derrotas ?? "0",
    empates: datos.intDraw ?? datos.empates ?? "0",
    golesFavor: datos.intGoalsFor ?? datos.golesFavor ?? "0",
    golesContra: datos.intGoalsAgainst ?? datos.golesContra ?? "0",
    diferenciaGol: datos.intGoalDifference ?? datos.diferenciaGol ?? "0",
    puntos: datos.intPoints ?? datos.puntos ?? "0",
    racha: datos.strForm ?? datos.racha ?? "",
  };
}

export function formatearTablaAPI(tablaCruda = []) {
  if (!Array.isArray(tablaCruda)) return [];
  return tablaCruda.map((posicionCruda) => {
    const posicionFormateada = cambiarFormatoPosicion(posicionCruda);
    return new Posicion(posicionFormateada);
  });
}

// Formatea un partido/evento proveniente de la API o de almacenamiento JSON
export function formatearPartidoAPI(datos = {}) {
  return new Partido({
    id: datos.idEvent ?? datos.id,
    idLiga: datos.idLeague ?? datos.idLiga,
    nombreLiga: datos.strLeague ?? datos.nombreLiga,
    escudoLiga: datos.strLeagueBadge ?? datos.escudoLiga,
    temporada: datos.strSeason ?? datos.temporada,
    jornada: datos.intRound ?? datos.jornada,
    idEquipoLocal: datos.idHomeTeam ?? datos.idEquipoLocal,
    nombreEquipoLocal: datos.strHomeTeam ?? datos.nombreEquipoLocal,
    escudoEquipoLocal: datos.strHomeTeamBadge ?? datos.escudoEquipoLocal,
    idEquipoVisitante: datos.idAwayTeam ?? datos.idEquipoVisitante,
    nombreEquipoVisitante: datos.strAwayTeam ?? datos.nombreEquipoVisitante,
    escudoEquipoVisitante: datos.strAwayTeamBadge ?? datos.escudoEquipoVisitante,
    golesLocal: datos.intHomeScore !== undefined ? datos.intHomeScore : datos.golesLocal,
    golesVisitante: datos.intAwayScore !== undefined ? datos.intAwayScore : datos.golesVisitante,
    fecha: datos.dateEvent ?? datos.fecha,
    hora: datos.strTime ?? datos.hora,
    timestamp: datos.strTimestamp ?? datos.timestamp,
    estado: datos.strStatus ?? datos.estado,
    estadio: datos.strVenue ?? datos.estadio,
    descripcion: datos.strDescriptionES || datos.strDescriptionEN || datos.descripcion || "",
  });
}

// Expone un objeto partido como JSON limpio usando getters
export function exponerPartido(partido) {
  if (!partido) return null;
  if (typeof partido.toJSON === "function") return partido.toJSON();
  return {
    id: partido.id,
    idLiga: partido.idLiga,
    nombreLiga: partido.nombreLiga,
    escudoLiga: partido.escudoLiga,
    temporada: partido.temporada,
    jornada: partido.jornada,
    idEquipoLocal: partido.idEquipoLocal,
    nombreEquipoLocal: partido.nombreEquipoLocal,
    escudoEquipoLocal: partido.escudoEquipoLocal,
    idEquipoVisitante: partido.idEquipoVisitante,
    nombreEquipoVisitante: partido.nombreEquipoVisitante,
    escudoEquipoVisitante: partido.escudoEquipoVisitante,
    golesLocal: partido.golesLocal,
    golesVisitante: partido.golesVisitante,
    fecha: partido.fecha,
    hora: partido.hora,
    timestamp: partido.timestamp,
    estado: partido.estado,
    estadio: partido.estadio,
    descripcion: partido.descripcion,
    esJugado: partido.esJugado,
    esProximo: partido.esProximo,
  };
}

// Formatea un equipo proveniente de lookupteam, searchteams o almacenamiento JSON
export function formatearEquipoAPI(datos = {}) {
  return new Equipo({
    id: datos.idTeam ?? datos.id,
    nombre: datos.strTeam ?? datos.nombre,
    escudo: datos.strBadge ?? datos.escudo,
    estadio: datos.strStadium ?? datos.estadio,
    pais: datos.strCountry || datos.strLocation || datos.pais || "",
    fundacion: datos.intFormedYear ?? datos.fundacion,
    descripcion: datos.strDescriptionES || datos.strDescriptionEN || datos.descripcion || "",
    sitioWeb: datos.strWebsite ?? datos.sitioWeb,
    idLiga: datos.idLeague ?? datos.idLiga,
    nombreLiga: datos.strLeague ?? datos.nombreLiga,
  });
}

// Expone un objeto equipo como JSON limpio usando getters
export function exponerEquipo(equipo) {
  if (!equipo) return null;
  if (typeof equipo.toJSON === "function") return equipo.toJSON();
  return {
    id: equipo.id,
    nombre: equipo.nombre,
    escudo: equipo.escudo,
    estadio: equipo.estadio,
    pais: equipo.pais,
    fundacion: equipo.fundacion,
    descripcion: equipo.descripcion,
    sitioWeb: equipo.sitioWeb,
    idLiga: equipo.idLiga,
    nombreLiga: equipo.nombreLiga,
    posicion: equipo.posicion,
    liga: equipo.liga,
    proximoPartido: equipo.proximoPartido ? exponerPartido(equipo.proximoPartido) : null,
    ultimoPartido: equipo.ultimoPartido ? exponerPartido(equipo.ultimoPartido) : null,
  };
}
