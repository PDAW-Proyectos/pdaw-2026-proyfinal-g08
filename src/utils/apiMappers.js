import { Posicion } from "../models/Posicion.js";
import { Partido } from "../models/Partido.js";
import { Equipo } from "../models/Equipo.js";

export function mapearLigaAPI(datos = {}) {
  return {
    id: datos.idLeague ?? datos.id ?? "",
    nombre: datos.strLeague ?? datos.nombre ?? "",
    temporada: datos.strCurrentSeason ?? datos.temporada ?? "",
    pais: datos.strCountry ?? datos.pais ?? "",
    escudo: datos.strBadge ?? datos.escudo ?? "",
  };
}

export function mapearTablaAPI(tablaCruda = []) {
  if (!Array.isArray(tablaCruda)) return [];
  return tablaCruda.map(
    (d) =>
      new Posicion({
        idEquipo: d.idTeam ?? d.idEquipo ?? "",
        nombreEquipo: d.strTeam ?? d.nombreEquipo ?? "",
        escudoEquipo: d.strBadge ?? d.escudoEquipo ?? "",
        idLiga: d.idLeague ?? d.idLiga ?? "",
        posicion: d.intRank ?? d.posicion ?? "",
        partidosJugados: d.intPlayed ?? d.partidosJugados ?? "0",
        victorias: d.intWin ?? d.victorias ?? "0",
        derrotas: d.intLoss ?? d.derrotas ?? "0",
        empates: d.intDraw ?? d.empates ?? "0",
        golesFavor: d.intGoalsFor ?? d.golesFavor ?? "0",
        golesContra: d.intGoalsAgainst ?? d.golesContra ?? "0",
        diferenciaGol: d.intGoalDifference ?? d.diferenciaGol ?? "0",
        puntos: d.intPoints ?? d.puntos ?? "0",
        racha: d.strForm ?? d.racha ?? "",
      })
  );
}

export function mapearPartidoAPI(datos = {}) {
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

export function mapearEquipoAPI(datos = {}) {
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
