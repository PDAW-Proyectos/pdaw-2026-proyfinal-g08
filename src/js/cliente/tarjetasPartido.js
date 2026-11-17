import { obtenerEscudoLiga } from "./api.js";
import { formatearFechaPartido } from "./fechas.js";
import { vincularAperturaModalPartido } from "./modalPartido.js";

function crearImagenEscudo(url, size, clase = "") {
  const img = document.createElement("img");
  img.src = url;
  img.alt = "";
  img.width = size;
  img.height = size;
  if (clase) img.className = clase;
  img.style.objectFit = "contain";
  img.referrerPolicy = "no-referrer";
  img.onerror = () => {
    img.style.display = "none";
  };
  return img;
}

export function crearElementoPartidoInicio(partido, opciones = {}) {
  const articulo = document.createElement("article");
  articulo.className = "partido-resumen";

  const datosJornada = document.createElement("div");
  datosJornada.className = "datos-jornada";

  const spanLiga = document.createElement("span");
  spanLiga.textContent = `${partido.nombreLiga || "Liga"}${partido.jornada ? ` · J${partido.jornada}` : ""}`;

  const spanFecha = document.createElement("span");
  spanFecha.textContent = formatearFechaPartido(partido.fecha, partido.hora);

  datosJornada.append(spanLiga, spanFecha);

  const equipos = document.createElement("div");
  equipos.className = "equipos-jornada";

  const enlaceLocal = document.createElement("a");
  enlaceLocal.className =
    "d-flex align-items-center gap-2 text-decoration-none text-dark text-truncate";
  enlaceLocal.href = `equipo.html?id=${encodeURIComponent(
    partido.idEquipoLocal || partido.nombreEquipoLocal
  )}`;
  enlaceLocal.title = `Ver información de ${partido.nombreEquipoLocal}`;
  if (partido.escudoEquipoLocal) {
    enlaceLocal.appendChild(
      crearImagenEscudo(partido.escudoEquipoLocal, 26, "insignia-equipo")
    );
  }
  const nombreLocal = document.createElement("span");
  nombreLocal.className = "text-truncate";
  nombreLocal.textContent = partido.nombreEquipoLocal || "Local";
  enlaceLocal.appendChild(nombreLocal);

  const marcador = document.createElement("span");
  if (partido.esJugado) {
    marcador.className = "marcador-resultado";
    marcador.textContent = `${partido.golesLocal ?? 0} - ${partido.golesVisitante ?? 0}`;
  } else {
    marcador.className = "hora-partido";
    marcador.textContent = partido.hora ? partido.hora.slice(0, 5) : "vs";
  }

  const enlaceVisitante = document.createElement("a");
  enlaceVisitante.className =
    "d-flex align-items-center justify-content-end gap-2 text-decoration-none text-dark text-truncate text-end";
  enlaceVisitante.href = `equipo.html?id=${encodeURIComponent(
    partido.idEquipoVisitante || partido.nombreEquipoVisitante
  )}`;
  enlaceVisitante.title = `Ver información de ${partido.nombreEquipoVisitante}`;
  const nombreVisitante = document.createElement("span");
  nombreVisitante.className = "text-truncate";
  nombreVisitante.textContent = partido.nombreEquipoVisitante || "Visitante";
  enlaceVisitante.appendChild(nombreVisitante);
  if (partido.escudoEquipoVisitante) {
    enlaceVisitante.appendChild(
      crearImagenEscudo(partido.escudoEquipoVisitante, 26, "insignia-equipo")
    );
  }

  equipos.append(enlaceLocal, marcador, enlaceVisitante);
  articulo.append(datosJornada, equipos);

  const escudoLiga = opciones.escudoLiga || obtenerEscudoLiga(partido.idLiga);
  vincularAperturaModalPartido(articulo, partido, {
    escudoLiga,
    claseActiva: "partido-resumen-interactivo",
  });

  return articulo;
}

export function crearElementoPartidoLiga(partido, opciones = {}) {
  const articulo = document.createElement("article");
  articulo.className = "list-group-item py-3";

  const cabecera = document.createElement("div");
  cabecera.className = "d-flex justify-content-between text-body-secondary small mb-2";

  const spanComp = document.createElement("span");
  spanComp.textContent = partido.jornada
    ? `Jornada ${partido.jornada}`
    : partido.nombreLiga || "Competición";

  const spanFecha = document.createElement("span");
  spanFecha.textContent = `${formatearFechaPartido(partido.fecha, partido.hora)}${
    partido.hora ? ` · ${partido.hora.slice(0, 5)}` : ""
  }`;

  cabecera.append(spanComp, spanFecha);

  const cuerpo = document.createElement("div");
  cuerpo.className = "d-flex align-items-center justify-content-between gap-2";

  const localCont = document.createElement("a");
  localCont.className =
    "d-flex align-items-center gap-2 text-decoration-none text-dark text-truncate";
  localCont.style.maxWidth = "42%";
  localCont.href = `equipo.html?id=${encodeURIComponent(
    partido.idEquipoLocal || partido.nombreEquipoLocal
  )}`;
  localCont.title = `Ver equipo: ${partido.nombreEquipoLocal}`;
  if (partido.escudoEquipoLocal) {
    localCont.appendChild(crearImagenEscudo(partido.escudoEquipoLocal, 24));
  }
  const nomL = document.createElement("span");
  nomL.className = "fw-medium text-truncate small";
  nomL.textContent = partido.nombreEquipoLocal || "Local";
  localCont.appendChild(nomL);

  const badgeScore = document.createElement("span");
  badgeScore.className = partido.esJugado
    ? "badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-6"
    : "badge bg-light text-dark border px-2 py-1 fs-6";
  badgeScore.textContent = partido.esJugado
    ? `${partido.golesLocal ?? 0} - ${partido.golesVisitante ?? 0}`
    : partido.hora
      ? partido.hora.slice(0, 5)
      : "vs";

  const visCont = document.createElement("a");
  visCont.className =
    "d-flex align-items-center justify-content-end gap-2 text-end text-decoration-none text-dark text-truncate";
  visCont.style.maxWidth = "42%";
  visCont.href = `equipo.html?id=${encodeURIComponent(
    partido.idEquipoVisitante || partido.nombreEquipoVisitante
  )}`;
  visCont.title = `Ver equipo: ${partido.nombreEquipoVisitante}`;
  const nomV = document.createElement("span");
  nomV.className = "fw-medium text-truncate small";
  nomV.textContent = partido.nombreEquipoVisitante || "Visitante";
  visCont.appendChild(nomV);
  if (partido.escudoEquipoVisitante) {
    visCont.appendChild(crearImagenEscudo(partido.escudoEquipoVisitante, 24));
  }

  cuerpo.append(localCont, badgeScore, visCont);
  articulo.append(cabecera, cuerpo);

  const escudoLiga = opciones.escudoLiga || obtenerEscudoLiga(partido.idLiga);
  vincularAperturaModalPartido(articulo, partido, {
    escudoLiga,
    claseActiva: "partido-lista-interactivo",
  });

  return articulo;
}
