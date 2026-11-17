import { obtenerLigasCompartidas } from "./api.js";
import { formatearFechaPartido } from "./fechas.js";
import { vincularAperturaModalPartido } from "./modalPartido.js";
import { crearElementoPartidoLiga } from "./tarjetasPartido.js";

function crearEscudoInline(url, size) {
  const img = document.createElement("img");
  img.src = url;
  img.alt = "";
  img.width = size;
  img.height = size;
  img.style.objectFit = "contain";
  img.referrerPolicy = "no-referrer";
  img.onerror = () => {
    img.style.display = "none";
  };
  return img;
}

function crearMensajeCentrado(texto) {
  const div = document.createElement("div");
  div.className = "p-3 text-body-secondary small text-center";
  div.textContent = texto;
  return div;
}

function crearColumnaMetrica(claseColumna, etiqueta, valor, claseValor) {
  const col = document.createElement("div");
  col.className = claseColumna;

  const titulo = document.createElement("span");
  titulo.className = "d-block text-muted small text-uppercase fw-semibold";
  titulo.textContent = etiqueta;

  const dato = document.createElement("span");
  dato.className = claseValor;
  dato.textContent = valor;

  col.append(titulo, dato);
  return col;
}

function crearPiePartidoDestacado(textoIzq, textoDer, claseDer = "") {
  const pie = document.createElement("div");
  pie.className =
    "text-body-secondary small border-top pt-2 d-flex justify-content-between align-items-center gap-2";

  const spanIzq = document.createElement("span");
  spanIzq.textContent = textoIzq;

  const spanDer = document.createElement("span");
  if (claseDer) spanDer.className = claseDer;
  spanDer.textContent = textoDer;

  pie.append(spanIzq, spanDer);
  return pie;
}

function renderizarEncabezadoEquipo(equipo) {
  document.title = `${equipo.nombre} · Orsai.`;

  const elemTitulo = document.getElementById("tituloEquipo");
  if (elemTitulo) elemTitulo.textContent = equipo.nombre;

  const elemMigaEquipo = document.getElementById("migaEquipo");
  if (elemMigaEquipo) elemMigaEquipo.textContent = equipo.nombre;

  const elemMigaLiga = document.getElementById("migaLiga");
  if (elemMigaLiga && equipo.liga) {
    const enlaceMiga = document.createElement("a");
    enlaceMiga.href = `liga.html?id=${encodeURIComponent(equipo.liga.id)}`;
    enlaceMiga.className = "text-decoration-none";
    enlaceMiga.textContent = equipo.liga.nombre;
    elemMigaLiga.replaceChildren(enlaceMiga);
  }

  const elemPaisFundacion = document.getElementById("paisYFundacionEquipo");
  if (elemPaisFundacion) {
    const pais = equipo.pais || "Club de fútbol";
    const fund = equipo.fundacion ? ` · Fundado en ${equipo.fundacion}` : "";
    elemPaisFundacion.textContent = `${pais}${fund}`;
  }

  const elemEscudo = document.getElementById("escudoEquipo");
  if (elemEscudo) {
    if (equipo.escudo) {
      elemEscudo.src = equipo.escudo;
      elemEscudo.alt = `Escudo de ${equipo.nombre}`;
      elemEscudo.referrerPolicy = "no-referrer";
      elemEscudo.style.display = "block";
      elemEscudo.onerror = () => {
        elemEscudo.style.display = "none";
      };
    } else {
      elemEscudo.style.display = "none";
    }
  }

  const elemLigaCont = document.getElementById("ligaEquipoContenedor");
  if (elemLigaCont) {
    if (equipo.liga) {
      const enlaceLiga = document.createElement("a");
      enlaceLiga.href = `liga.html?id=${encodeURIComponent(equipo.liga.id)}`;
      enlaceLiga.className =
        "badge bg-light text-dark border p-2 text-decoration-none d-inline-flex align-items-center gap-2";
      if (equipo.liga.escudo) {
        enlaceLiga.appendChild(crearEscudoInline(equipo.liga.escudo, 20));
      }
      const nombreLiga = document.createElement("span");
      nombreLiga.textContent = equipo.liga.nombre;
      enlaceLiga.appendChild(nombreLiga);
      elemLigaCont.replaceChildren(enlaceLiga);
    } else {
      const badge = document.createElement("span");
      badge.className = "badge bg-light text-secondary border";
      badge.textContent = "Competición en seguimiento";
      elemLigaCont.replaceChildren(badge);
    }
  }
}

function renderizarPosicionEquipo(equipo) {
  const elemEnlaceVerLiga = document.getElementById("enlaceVerLigaCompleta");
  if (elemEnlaceVerLiga && equipo.liga) {
    elemEnlaceVerLiga.href = `liga.html?id=${encodeURIComponent(equipo.liga.id)}`;
  } else if (elemEnlaceVerLiga) {
    elemEnlaceVerLiga.style.display = "none";
  }

  const cuerpoPosicion = document.getElementById("cuerpoPosicionLiga");
  if (!cuerpoPosicion) return;

  if (equipo.posicion) {
    const dg = Number(equipo.posicion.diferenciaGol ?? 0);
    const dgTexto = dg > 0 ? `+${dg}` : String(dg);
    cuerpoPosicion.replaceChildren(
      crearColumnaMetrica(
        "col-6 col-sm-3 col-md-2 border-end",
        "Puesto",
        `#${equipo.posicion.posicion ?? "—"}`,
        "fs-2 fw-bold text-success",
      ),
      crearColumnaMetrica(
        "col-6 col-sm-3 col-md-2 border-end",
        "Puntos",
        String(equipo.posicion.puntos ?? "0"),
        "fs-2 fw-bold text-dark",
      ),
      crearColumnaMetrica(
        "col-4 col-sm-2 col-md-2 border-end",
        "Jugados",
        String(equipo.posicion.partidosJugados ?? "0"),
        "fs-4 fw-semibold text-secondary",
      ),
      crearColumnaMetrica(
        "col-4 col-sm-2 col-md-3 border-end",
        "G / E / P",
        `${equipo.posicion.victorias ?? 0}V · ${equipo.posicion.empates ?? 0}E · ${equipo.posicion.derrotas ?? 0}D`,
        "fs-5 fw-semibold text-dark",
      ),
      crearColumnaMetrica(
        "col-4 col-sm-2 col-md-3",
        "Goles (DG)",
        `${equipo.posicion.golesFavor ?? 0}:${equipo.posicion.golesContra ?? 0} (${dgTexto})`,
        "fs-5 fw-semibold text-dark",
      ),
    );
  } else {
    const sinDatos = document.createElement("div");
    sinDatos.className = "col-12 py-3 text-body-secondary small";
    sinDatos.textContent =
      "Este club no tiene registro activo en la tabla de las principales ligas monitoreadas.";
    cuerpoPosicion.replaceChildren(sinDatos);
  }
}

function crearEnlaceRival(rivalId, rivalNombre) {
  const titulo = document.createElement("h3");
  titulo.className = "h5 mb-0 text-truncate";

  const enlace = document.createElement("a");
  enlace.href = `equipo.html?id=${encodeURIComponent(rivalId || rivalNombre)}`;
  enlace.className = "text-dark text-decoration-none fw-bold hover-underline";
  enlace.textContent = rivalNombre || "Rival por confirmar";

  titulo.appendChild(enlace);
  return titulo;
}

function renderizarPartidosDestacados(equipo) {
  const cuerpoProx = document.getElementById("cuerpoProximoPartido");
  if (cuerpoProx) {
    if (equipo.proximoPartido) {
      const p = equipo.proximoPartido;
      const esLocal =
        String(p.idEquipoLocal) === String(equipo.id) ||
        p.nombreEquipoLocal === equipo.nombre;
      const rivalNombre = esLocal
        ? p.nombreEquipoVisitante
        : p.nombreEquipoLocal;
      const rivalEscudo = esLocal
        ? p.escudoEquipoVisitante
        : p.escudoEquipoLocal;
      const rivalId = esLocal ? p.idEquipoVisitante : p.idEquipoLocal;

      const cabecera = document.createElement("div");
      cabecera.className =
        "d-flex align-items-center justify-content-between mb-3";

      const badge = document.createElement("span");
      badge.className = "badge bg-light text-success border small fw-bold";
      badge.textContent = "Por disputar";

      const fecha = document.createElement("span");
      fecha.className = "text-body-secondary small";
      fecha.textContent = `${formatearFechaPartido(p.fecha, p.hora)}${
        p.hora ? ` · ${p.hora.slice(0, 5)}` : ""
      }`;
      cabecera.append(badge, fecha);

      const bloqueRival = document.createElement("div");
      bloqueRival.className = "d-flex align-items-center gap-3 mb-3";
      if (rivalEscudo) {
        bloqueRival.appendChild(crearEscudoInline(rivalEscudo, 42));
      }

      const infoRival = document.createElement("div");
      const condicion = document.createElement("p");
      condicion.className = "text-muted small mb-0";
      condicion.textContent = esLocal ? "Local vs" : "Visitante ante";
      infoRival.append(condicion, crearEnlaceRival(rivalId, rivalNombre));
      bloqueRival.appendChild(infoRival);

      const pieEstadio = crearPiePartidoDestacado(
        `${p.nombreLiga}${p.jornada ? ` · J${p.jornada}` : ""}`,
        p.estadio || equipo.estadio || "Estadio por confirmar",
        "text-truncate",
      );
      pieEstadio.lastElementChild.style.maxWidth = "50%";

      cuerpoProx.replaceChildren(cabecera, bloqueRival, pieEstadio);
      vincularAperturaModalPartido(cuerpoProx, p, {
        escudoLiga: equipo.liga?.escudo || "",
        claseActiva: "partido-destacado-interactivo",
      });
    } else {
      cuerpoProx.replaceChildren(
        crearMensajeCentrado(
          "No hay partidos próximos programados en el calendario inmediato.",
        ),
      );
    }
  }

  const cuerpoUlt = document.getElementById("cuerpoUltimoPartido");
  if (cuerpoUlt) {
    if (equipo.ultimoPartido) {
      const p = equipo.ultimoPartido;
      const esLocal =
        String(p.idEquipoLocal) === String(equipo.id) ||
        p.nombreEquipoLocal === equipo.nombre;
      const rivalNombre = esLocal
        ? p.nombreEquipoVisitante
        : p.nombreEquipoLocal;
      const rivalEscudo = esLocal
        ? p.escudoEquipoVisitante
        : p.escudoEquipoLocal;
      const rivalId = esLocal ? p.idEquipoVisitante : p.idEquipoLocal;
      const golesEquipo = esLocal
        ? Number(p.golesLocal ?? 0)
        : Number(p.golesVisitante ?? 0);
      const golesRival = esLocal
        ? Number(p.golesVisitante ?? 0)
        : Number(p.golesLocal ?? 0);

      const cabecera = document.createElement("div");
      cabecera.className =
        "d-flex align-items-center justify-content-between mb-3";

      const badgeResultado = document.createElement("span");
      if (golesEquipo > golesRival) {
        badgeResultado.className =
          "badge bg-success-subtle text-success border border-success-subtle small fw-bold";
        badgeResultado.textContent = "Victoria";
      } else if (golesEquipo < golesRival) {
        badgeResultado.className =
          "badge bg-danger-subtle text-danger border border-danger-subtle small fw-bold";
        badgeResultado.textContent = "Derrota";
      } else {
        badgeResultado.className =
          "badge bg-secondary-subtle text-secondary border small";
        badgeResultado.textContent = "Empate";
      }

      const fecha = document.createElement("span");
      fecha.className = "text-body-secondary small";
      fecha.textContent = formatearFechaPartido(p.fecha, p.hora);
      cabecera.append(badgeResultado, fecha);

      const filaCentral = document.createElement("div");
      filaCentral.className =
        "d-flex align-items-center justify-content-between mb-3";

      const contRival = document.createElement("div");
      contRival.className = "d-flex align-items-center gap-2";
      contRival.style.maxWidth = "60%";
      if (rivalEscudo) {
        contRival.appendChild(crearEscudoInline(rivalEscudo, 40));
      }

      const textoRival = document.createElement("div");
      const etiqueta = document.createElement("p");
      etiqueta.className = "text-muted small mb-0";
      etiqueta.textContent = esLocal ? "Contra" : "De visita en";
      textoRival.append(etiqueta, crearEnlaceRival(rivalId, rivalNombre));
      contRival.appendChild(textoRival);

      const marcadorBox = document.createElement("div");
      marcadorBox.className = "text-center px-3 py-1 bg-light rounded-3 border";
      const marcadorSpan = document.createElement("span");
      marcadorSpan.className = "fs-4 fw-bold text-dark";
      marcadorSpan.textContent = `${p.golesLocal ?? 0} - ${p.golesVisitante ?? 0}`;
      marcadorBox.appendChild(marcadorSpan);

      filaCentral.append(contRival, marcadorBox);

      const pie = crearPiePartidoDestacado(
        `${p.nombreLiga}${p.jornada ? ` · J${p.jornada}` : ""}`,
        esLocal ? "Local" : "Visitante",
        "fw-semibold text-dark",
      );

      cuerpoUlt.replaceChildren(cabecera, filaCentral, pie);
      vincularAperturaModalPartido(cuerpoUlt, p, {
        escudoLiga: equipo.liga?.escudo || "",
        claseActiva: "partido-destacado-interactivo",
      });
    } else {
      cuerpoUlt.replaceChildren(
        crearMensajeCentrado(
          "No hay registros recientes de partidos finalizados.",
        ),
      );
    }
  }
}

function renderizarInfoClub(equipo) {
  const elemEstadio = document.getElementById("estadioEquipo");
  if (elemEstadio)
    elemEstadio.textContent = equipo.estadio || "Estadio principal";

  const elemFundacion = document.getElementById("fundacionEquipo");
  if (elemFundacion) {
    elemFundacion.textContent = equipo.fundacion
      ? `Año ${equipo.fundacion}`
      : "—";
  }

  const elemWeb = document.getElementById("sitioWebContenedor");
  if (elemWeb) {
    if (equipo.sitioWeb) {
      const limpia = String(equipo.sitioWeb)
        .replace(/^https?:\/\//, "")
        .trim();
      const enlaceWeb = document.createElement("a");
      enlaceWeb.href = `https://${limpia}`;
      enlaceWeb.target = "_blank";
      enlaceWeb.rel = "noopener noreferrer";
      enlaceWeb.className = "text-success text-decoration-none fw-semibold";
      enlaceWeb.textContent = `${limpia} ↗`;
      elemWeb.replaceChildren(enlaceWeb);
    } else {
      elemWeb.textContent = "—";
    }
  }

  const elemDesc = document.getElementById("descripcionEquipo");
  if (elemDesc) {
    elemDesc.textContent =
      equipo.descripcion ||
      "Información histórica e institucional del club en actualización.";
  }
}

async function cargarListasPartidosEquipo(idEquipo) {
  const listaProx = document.getElementById("listaProximosEquipo");
  const listaJug = document.getElementById("listaJugadosEquipo");

  try {
    const res = await fetch(
      `/api/equipos/${encodeURIComponent(idEquipo)}/partidos`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { proximos = [], jugados = [] } = await res.json();

    if (listaProx) {
      listaProx.replaceChildren();
      if (proximos.length > 0) {
        proximos.forEach((partido) => {
          listaProx.appendChild(crearElementoPartidoLiga(partido));
        });
      } else {
        listaProx.appendChild(
          crearMensajeCentrado("No hay próximos partidos en agenda."),
        );
      }
    }

    if (listaJug) {
      listaJug.replaceChildren();
      if (jugados.length > 0) {
        jugados.forEach((partido) => {
          listaJug.appendChild(crearElementoPartidoLiga(partido));
        });
      } else {
        listaJug.appendChild(
          crearMensajeCentrado("No hay partidos jugados registrados."),
        );
      }
    }
  } catch (err) {
    console.warn("Aviso al cargar listas de partidos del equipo:", err);
  }
}

export async function inicializarEquipo() {
  const idEquipo = new URLSearchParams(window.location.search).get("id");
  const contenedorError = document.getElementById("mensajeErrorEquipo");
  const contenedorPrincipal = document.getElementById("contenidoEquipo");

  if (!idEquipo) {
    if (contenedorError) contenedorError.classList.remove("d-none");
    if (contenedorPrincipal) contenedorPrincipal.classList.add("d-none");
    return;
  }

  try {
    await obtenerLigasCompartidas().catch(() => []);
    const res = await fetch(`/api/equipos/${encodeURIComponent(idEquipo)}`);
    if (!res.ok) throw new Error(`Error ${res.status}`);

    const equipo = await res.json();
    renderizarEncabezadoEquipo(equipo);
    renderizarPosicionEquipo(equipo);
    renderizarPartidosDestacados(equipo);
    renderizarInfoClub(equipo);
    cargarListasPartidosEquipo(idEquipo);
  } catch (error) {
    console.error("Error al cargar equipo:", error);
    if (contenedorError) contenedorError.classList.remove("d-none");
    if (contenedorPrincipal) contenedorPrincipal.classList.add("d-none");
  }
}
