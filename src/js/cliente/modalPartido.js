import { formatearFechaLarga, formatearHora, inicialesEquipo } from "./fechas.js";

const DIALOG_ID = "modalDetallePartido";

function traducirEstado(partido) {
  if (partido?.esJugado) return "Finalizado";
  const est = String(partido?.estado || "").trim().toUpperCase();
  if (!est || est === "NS" || est === "NOT STARTED") return "Programado";
  if (est === "PST" || est === "POSTPONED") return "Aplazado";
  if (est === "CANC" || est === "CANCELLED") return "Cancelado";
  if (est === "HT" || est === "HALFTIME") return "Descanso";
  if (est === "FT" || est === "MATCH FINISHED") return "Finalizado";
  return String(partido?.estado || "Programado");
}

function crearInsigniaEquipoModal(url, nombre) {
  const envoltorio = document.createElement("span");
  envoltorio.className = "modal-partido-escudo-box";

  const agregarFallback = () => {
    const fallback = document.createElement("span");
    fallback.className = "modal-partido-escudo-fallback";
    fallback.textContent = inicialesEquipo(nombre);
    envoltorio.appendChild(fallback);
  };

  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = `Escudo de ${nombre || "equipo"}`;
    img.width = 52;
    img.height = 52;
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => {
      img.remove();
      agregarFallback();
    });
    envoltorio.appendChild(img);
  } else {
    agregarFallback();
  }

  return envoltorio;
}

function asegurarDialogo() {
  let dialogo = document.getElementById(DIALOG_ID);
  if (dialogo) return dialogo;

  dialogo = document.createElement("dialog");
  dialogo.id = DIALOG_ID;
  dialogo.className = "dialogo-partido";
  dialogo.setAttribute("aria-labelledby", "modalPartidoTitulo");
  dialogo.addEventListener("click", (event) => {
    if (event.target === dialogo) dialogo.close();
  });

  document.body.appendChild(dialogo);
  return dialogo;
}

function construirColumnaEquipo(partido, lado) {
  const esLocal = lado === "local";
  const idEquipo = esLocal ? partido.idEquipoLocal : partido.idEquipoVisitante;
  const nombre = esLocal ? partido.nombreEquipoLocal : partido.nombreEquipoVisitante;
  const escudo = esLocal ? partido.escudoEquipoLocal : partido.escudoEquipoVisitante;

  const col = document.createElement("div");
  col.className = "modal-partido-equipo";

  const enlace = document.createElement("a");
  enlace.className = "modal-partido-equipo-enlace";
  enlace.href = `equipo.html?id=${encodeURIComponent(idEquipo || nombre || "")}`;
  enlace.title = `Ver ficha de ${nombre || "equipo"}`;
  enlace.appendChild(crearInsigniaEquipoModal(escudo, nombre));

  const spanNombre = document.createElement("span");
  spanNombre.className = "modal-partido-equipo-nombre";
  spanNombre.textContent = nombre || (esLocal ? "Local" : "Visitante");
  enlace.appendChild(spanNombre);

  const spanRol = document.createElement("span");
  spanRol.className = "modal-partido-equipo-rol";
  spanRol.textContent = esLocal ? "Local" : "Visitante";

  col.append(enlace, spanRol);
  return col;
}

function renderizarContenidoModal(dialogo, partido, opciones = {}) {
  dialogo.replaceChildren();

  const cabecera = document.createElement("header");
  cabecera.className = "modal-partido-cabecera";

  const infoLiga = document.createElement("div");
  infoLiga.className = "modal-partido-liga";

  const escudoLigaUrl = opciones.escudoLiga || partido.escudoLiga || "";
  if (escudoLigaUrl) {
    const imgLiga = document.createElement("img");
    imgLiga.src = escudoLigaUrl;
    imgLiga.alt = "";
    imgLiga.width = 24;
    imgLiga.height = 24;
    imgLiga.className = "modal-partido-liga-escudo";
    imgLiga.referrerPolicy = "no-referrer";
    imgLiga.addEventListener("error", () => {
      imgLiga.style.display = "none";
    });
    infoLiga.appendChild(imgLiga);
  }

  const textoLiga = document.createElement("div");
  const nombreLigaEl = partido.idLiga
    ? document.createElement("a")
    : document.createElement("span");
  nombreLigaEl.className = "modal-partido-liga-nombre";
  nombreLigaEl.textContent = partido.nombreLiga || "Competición";
  if (partido.idLiga) {
    nombreLigaEl.href = `liga.html?id=${encodeURIComponent(partido.idLiga)}`;
  }

  const metaSub = document.createElement("p");
  metaSub.id = "modalPartidoTitulo";
  metaSub.className = "modal-partido-subtitulo mb-0";
  const partesSub = [];
  if (partido.temporada) partesSub.push(`Temporada ${partido.temporada}`);
  if (partido.jornada) partesSub.push(`Jornada ${partido.jornada}`);
  metaSub.textContent = partesSub.join(" · ") || "Detalle del encuentro";

  textoLiga.append(nombreLigaEl, metaSub);
  infoLiga.appendChild(textoLiga);

  const accionesCabecera = document.createElement("div");
  accionesCabecera.className = "modal-partido-cabecera-acciones";

  const badgeEstado = document.createElement("span");
  badgeEstado.className = partido.esJugado
    ? "etiqueta-jornada etiqueta-final"
    : "etiqueta-jornada";
  badgeEstado.textContent = traducirEstado(partido);

  const btnCerrar = document.createElement("button");
  btnCerrar.type = "button";
  btnCerrar.className = "auth-dialog-close";
  btnCerrar.setAttribute("aria-label", "Cerrar detalle del partido");
  btnCerrar.textContent = "×";
  btnCerrar.addEventListener("click", () => dialogo.close());

  accionesCabecera.append(badgeEstado, btnCerrar);
  cabecera.append(infoLiga, accionesCabecera);

  const marcadorCont = document.createElement("section");
  marcadorCont.className = "modal-partido-enfrentamiento";
  marcadorCont.setAttribute("aria-label", "Equipos y marcador");

  const centro = document.createElement("div");
  centro.className = "modal-partido-centro";

  const hora = formatearHora(partido.hora);
  const datoPrincipal = document.createElement("div");
  datoPrincipal.className = partido.esJugado
    ? "modal-partido-marcador"
    : "modal-partido-hora";
  datoPrincipal.textContent = partido.esJugado
    ? `${partido.golesLocal ?? 0} - ${partido.golesVisitante ?? 0}`
    : hora || "VS";

  const etiquetaCentro = document.createElement("span");
  etiquetaCentro.className = "modal-partido-centro-nota";
  etiquetaCentro.textContent = partido.esJugado
    ? "Marcador final"
    : hora
      ? "Hora del encuentro"
      : "Por disputar";

  centro.append(datoPrincipal, etiquetaCentro);
  marcadorCont.append(
    construirColumnaEquipo(partido, "local"),
    centro,
    construirColumnaEquipo(partido, "visitante")
  );

  const listaDetalles = document.createElement("dl");
  listaDetalles.className = "modal-partido-detalles";
  [
    {
      etiqueta: "Fecha",
      valor: `${formatearFechaLarga(partido.fecha)}${hora ? ` · ${hora}` : ""}`,
    },
    {
      etiqueta: "Competición",
      valor: `${partido.nombreLiga || "Fútbol"}${partido.temporada ? ` (${partido.temporada})` : ""}`,
    },
    { etiqueta: "Estadio", valor: partido.estadio || "Por confirmar" },
    { etiqueta: "Estado", valor: traducirEstado(partido) },
  ].forEach(({ etiqueta, valor }) => {
    const fila = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = etiqueta;
    const dd = document.createElement("dd");
    dd.textContent = valor;
    fila.append(dt, dd);
    listaDetalles.appendChild(fila);
  });

  dialogo.append(cabecera, marcadorCont, listaDetalles);

  if (partido.descripcion) {
    const bloqueDesc = document.createElement("section");
    bloqueDesc.className = "modal-partido-descripcion";
    const tituloDesc = document.createElement("h3");
    tituloDesc.textContent = "Información adicional";
    const textoDesc = document.createElement("p");
    textoDesc.textContent = partido.descripcion;
    bloqueDesc.append(tituloDesc, textoDesc);
    dialogo.appendChild(bloqueDesc);
  }

  const pie = document.createElement("footer");
  pie.className = "modal-partido-pie";

  if (partido.idLiga) {
    const enlaceLiga = document.createElement("a");
    enlaceLiga.href = `liga.html?id=${encodeURIComponent(partido.idLiga)}`;
    enlaceLiga.className = "btn btn-sm boton-contorno-grada";
    enlaceLiga.textContent = `Ver ${partido.nombreLiga || "liga"}`;
    pie.appendChild(enlaceLiga);
  }

  const btnListo = document.createElement("button");
  btnListo.type = "button";
  btnListo.className = "btn btn-sm boton-grada ms-auto";
  btnListo.textContent = "Cerrar";
  btnListo.addEventListener("click", () => dialogo.close());
  pie.appendChild(btnListo);

  dialogo.appendChild(pie);
}

async function enriquecerDesdeServidor(dialogo, partido, opciones) {
  if (!partido?.id || (partido.estadio && partido.descripcion)) return;
  try {
    const res = await fetch(`/api/partidos/${encodeURIComponent(partido.id)}`);
    if (!res.ok || !dialogo.open) return;
    const actualizado = await res.json();
    if (!dialogo.open) return;
    const combinado = {
      ...actualizado,
      ...partido,
      estadio: partido.estadio || actualizado.estadio || "",
      descripcion: partido.descripcion || actualizado.descripcion || "",
      escudoEquipoLocal: partido.escudoEquipoLocal || actualizado.escudoEquipoLocal || "",
      escudoEquipoVisitante:
        partido.escudoEquipoVisitante || actualizado.escudoEquipoVisitante || "",
    };
    if (
      combinado.estadio !== partido.estadio ||
      combinado.descripcion !== partido.descripcion
    ) {
      renderizarContenidoModal(dialogo, combinado, opciones);
    }
  } catch {
    // Mantiene los datos iniciales ya mostrados
  }
}

export function abrirModalPartido(partido, opciones = {}) {
  if (!partido) return;
  const dialogo = asegurarDialogo();
  renderizarContenidoModal(dialogo, partido, opciones);
  if (typeof dialogo.showModal === "function") {
    if (!dialogo.open) dialogo.showModal();
  } else {
    dialogo.setAttribute("open", "");
  }
  enriquecerDesdeServidor(dialogo, partido, opciones);
}

export function vincularAperturaModalPartido(elemento, partido, opciones = {}) {
  if (!elemento || !partido) return;

  const {
    claseActiva = "partido-interactivo",
    etiquetaAria = `Ver detalle del partido ${partido.nombreEquipoLocal || "Local"} contra ${partido.nombreEquipoVisitante || "Visitante"}`,
  } = opciones;

  if (claseActiva) elemento.classList.add(claseActiva);
  elemento.setAttribute("role", "button");
  elemento.setAttribute("tabindex", "0");
  elemento.setAttribute("aria-label", etiquetaAria);

  elemento.addEventListener("click", (event) => {
    if (event.target.closest("a, button, input, select, textarea")) return;
    abrirModalPartido(partido, opciones);
  });

  elemento.addEventListener("keydown", (event) => {
    if (event.target !== elemento && event.target.closest("a, button")) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      abrirModalPartido(partido, opciones);
    }
  });
}
