import {
  obtenerEscudoLiga,
  formatearFechaPartido,
  formatearFechaLarga,
  formatearHora,
  inicialesEquipo,
  crearEscudoImg,
  crearElemento,
  crearMensaje,
  paginarElementos,
  calcularPaginasVisibles,
  fetchJsonSeguro,
} from "./utils.js";

const DIALOG_ID = "modalDetallePartido";

const ESTADOS_TRADUCIDOS = {
  NS: "Programado",
  "NOT STARTED": "Programado",
  PST: "Aplazado",
  POSTPONED: "Aplazado",
  CANC: "Cancelado",
  CANCELLED: "Cancelado",
  HT: "Descanso",
  HALFTIME: "Descanso",
  FT: "Finalizado",
  "MATCH FINISHED": "Finalizado",
};

function traducirEstado(partido) {
  if (partido?.esJugado) return "Finalizado";
  const est = String(partido?.estado || "").trim().toUpperCase();
  if (!est) return "Programado";
  return ESTADOS_TRADUCIDOS[est] || String(partido?.estado || "Programado");
}

function crearInsigniaEquipoModal(url, nombre) {
  const envoltorio = crearElemento("span", { className: "modal-partido-escudo-box" });
  const agregarFallback = () => {
    envoltorio.appendChild(
      crearElemento("span", {
        className: "modal-partido-escudo-fallback",
        textContent: inicialesEquipo(nombre),
      })
    );
  };

  if (url) {
    const img = crearEscudoImg(url, 52, "", `Escudo de ${nombre || "equipo"}`);
    img.onerror = () => {
      img.remove();
      agregarFallback();
    };
    envoltorio.appendChild(img);
  } else {
    agregarFallback();
  }
  return envoltorio;
}

function construirColumnaEquipo(partido, lado) {
  const esLocal = lado === "local";
  const idEquipo = esLocal ? partido.idEquipoLocal : partido.idEquipoVisitante;
  const nombre = esLocal ? partido.nombreEquipoLocal : partido.nombreEquipoVisitante;
  const escudo = esLocal ? partido.escudoEquipoLocal : partido.escudoEquipoVisitante;

  const enlace = crearElemento(
    "a",
    {
      className: "modal-partido-equipo-enlace",
      attributes: {
        href: `equipo.html?id=${encodeURIComponent(idEquipo || nombre || "")}`,
        title: `Ver ficha de ${nombre || "equipo"}`,
      },
    },
    [
      crearInsigniaEquipoModal(escudo, nombre),
      crearElemento("span", {
        className: "modal-partido-equipo-nombre",
        textContent: nombre || (esLocal ? "Local" : "Visitante"),
      }),
    ]
  );

  return crearElemento("div", { className: "modal-partido-equipo" }, [
    enlace,
    crearElemento("span", {
      className: "modal-partido-equipo-rol",
      textContent: esLocal ? "Local" : "Visitante",
    }),
  ]);
}

function renderizarContenidoModal(dialogo, partido, opciones = {}) {
  dialogo.replaceChildren();

  const escudoLigaUrl = opciones.escudoLiga || partido.escudoLiga || "";
  const nombreLigaEl = crearElemento(partido.idLiga ? "a" : "span", {
    className: "modal-partido-liga-nombre",
    textContent: partido.nombreLiga || "Competición",
    attributes: partido.idLiga
      ? { href: `liga.html?id=${encodeURIComponent(partido.idLiga)}` }
      : {},
  });

  const partesSub = [];
  if (partido.temporada) partesSub.push(`Temporada ${partido.temporada}`);
  if (partido.jornada) partesSub.push(`Jornada ${partido.jornada}`);

  const infoLiga = crearElemento("div", { className: "modal-partido-liga" }, [
    escudoLigaUrl ? crearEscudoImg(escudoLigaUrl, 24, "modal-partido-liga-escudo") : null,
    crearElemento("div", {}, [
      nombreLigaEl,
      crearElemento("p", {
        className: "modal-partido-subtitulo mb-0",
        textContent: partesSub.join(" · ") || "Detalle del encuentro",
        attributes: { id: "modalPartidoTitulo" },
      }),
    ]),
  ]);

  const btnCerrar = crearElemento("button", {
    className: "auth-dialog-close",
    textContent: "×",
    attributes: { type: "button", "aria-label": "Cerrar detalle del partido" },
  });
  btnCerrar.addEventListener("click", () => dialogo.close());

  const cabecera = crearElemento("header", { className: "modal-partido-cabecera" }, [
    infoLiga,
    crearElemento("div", { className: "modal-partido-cabecera-acciones" }, [
      crearElemento("span", {
        className: partido.esJugado ? "etiqueta-jornada etiqueta-final" : "etiqueta-jornada",
        textContent: traducirEstado(partido),
      }),
      btnCerrar,
    ]),
  ]);

  const hora = formatearHora(partido.hora);
  const centro = crearElemento("div", { className: "modal-partido-centro" }, [
    crearElemento("div", {
      className: partido.esJugado ? "modal-partido-marcador" : "modal-partido-hora",
      textContent: partido.esJugado
        ? `${partido.golesLocal ?? 0} - ${partido.golesVisitante ?? 0}`
        : hora || "VS",
    }),
    crearElemento("span", {
      className: "modal-partido-centro-nota",
      textContent: partido.esJugado
        ? "Marcador final"
        : hora
          ? "Hora del encuentro"
          : "Por disputar",
    }),
  ]);

  const marcadorCont = crearElemento(
    "section",
    { className: "modal-partido-enfrentamiento", attributes: { "aria-label": "Equipos y marcador" } },
    [construirColumnaEquipo(partido, "local"), centro, construirColumnaEquipo(partido, "visitante")]
  );

  const listaDetalles = crearElemento(
    "dl",
    { className: "modal-partido-detalles" },
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
    ].map(({ etiqueta, valor }) =>
      crearElemento("div", {}, [
        crearElemento("dt", { textContent: etiqueta }),
        crearElemento("dd", { textContent: valor }),
      ])
    )
  );

  dialogo.append(cabecera, marcadorCont, listaDetalles);

  if (partido.descripcion) {
    dialogo.appendChild(
      crearElemento("section", { className: "modal-partido-descripcion" }, [
        crearElemento("h3", { textContent: "Información adicional" }),
        crearElemento("p", { textContent: partido.descripcion }),
      ])
    );
  }

  const btnListo = crearElemento("button", {
    className: "btn btn-sm boton-grada ms-auto",
    textContent: "Cerrar",
    attributes: { type: "button" },
  });
  btnListo.addEventListener("click", () => dialogo.close());

  dialogo.appendChild(
    crearElemento("footer", { className: "modal-partido-pie" }, [
      partido.idLiga
        ? crearElemento("a", {
            className: "btn btn-sm boton-contorno-grada",
            textContent: `Ver ${partido.nombreLiga || "liga"}`,
            attributes: { href: `liga.html?id=${encodeURIComponent(partido.idLiga)}` },
          })
        : null,
      btnListo,
    ])
  );
}

async function enriquecerDesdeServidor(dialogo, partido, opciones) {
  if (!partido?.id || (partido.estadio && partido.descripcion)) return;
  try {
    const actualizado = await fetchJsonSeguro(`/api/partidos/${encodeURIComponent(partido.id)}`);
    if (!dialogo.open || !actualizado) return;
    const combinado = {
      ...actualizado,
      ...partido,
      estadio: partido.estadio || actualizado.estadio || "",
      descripcion: partido.descripcion || actualizado.descripcion || "",
      escudoEquipoLocal: partido.escudoEquipoLocal || actualizado.escudoEquipoLocal || "",
      escudoEquipoVisitante: partido.escudoEquipoVisitante || actualizado.escudoEquipoVisitante || "",
    };
    if (combinado.estadio !== partido.estadio || combinado.descripcion !== partido.descripcion) {
      renderizarContenidoModal(dialogo, combinado, opciones);
    }
  } catch {
    // Mantiene los datos iniciales ya mostrados
  }
}

export function abrirModalPartido(partido, opciones = {}) {
  if (!partido) return;
  let dialogo = document.getElementById(DIALOG_ID);
  if (!dialogo) {
    dialogo = crearElemento("dialog", {
      className: "dialogo-partido",
      attributes: { id: DIALOG_ID, "aria-labelledby": "modalPartidoTitulo" },
    });
    dialogo.addEventListener("click", (event) => {
      if (event.target === dialogo) dialogo.close();
    });
    document.body.appendChild(dialogo);
  }

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

function crearEnlaceEquipoTarjeta(id, nombre, escudo, size, claseLink, esVisitante = false) {
  const enlace = crearElemento("a", {
    className: claseLink,
    attributes: {
      href: `equipo.html?id=${encodeURIComponent(id || nombre)}`,
      title: `Ver información de ${nombre}`,
    },
  });
  const spanNombre = crearElemento("span", {
    className: "text-truncate",
    textContent: nombre || (esVisitante ? "Visitante" : "Local"),
  });
  const img = escudo ? crearEscudoImg(escudo, size, size === 26 ? "insignia-equipo" : "") : null;

  if (esVisitante) {
    enlace.append(spanNombre);
    if (img) enlace.append(img);
  } else {
    if (img) enlace.append(img);
    enlace.append(spanNombre);
  }
  return enlace;
}

export function crearElementoPartidoInicio(partido, opciones = {}) {
  const datosJornada = crearElemento("div", { className: "datos-jornada" }, [
    crearElemento("span", {
      textContent: `${partido.nombreLiga || "Liga"}${partido.jornada ? ` · J${partido.jornada}` : ""}`,
    }),
    crearElemento("span", { textContent: formatearFechaPartido(partido.fecha, partido.hora) }),
  ]);

  const marcador = crearElemento("span", {
    className: partido.esJugado ? "marcador-resultado" : "hora-partido",
    textContent: partido.esJugado
      ? `${partido.golesLocal ?? 0} - ${partido.golesVisitante ?? 0}`
      : formatearHora(partido.hora) || "vs",
  });

  const equipos = crearElemento("div", { className: "equipos-jornada" }, [
    crearEnlaceEquipoTarjeta(
      partido.idEquipoLocal,
      partido.nombreEquipoLocal,
      partido.escudoEquipoLocal,
      26,
      "d-flex align-items-center gap-2 text-decoration-none text-dark text-truncate"
    ),
    marcador,
    crearEnlaceEquipoTarjeta(
      partido.idEquipoVisitante,
      partido.nombreEquipoVisitante,
      partido.escudoEquipoVisitante,
      26,
      "d-flex align-items-center justify-content-end gap-2 text-decoration-none text-dark text-truncate text-end",
      true
    ),
  ]);

  const articulo = crearElemento("article", { className: "partido-resumen" }, [
    datosJornada,
    equipos,
  ]);
  vincularAperturaModalPartido(articulo, partido, {
    escudoLiga: opciones.escudoLiga || obtenerEscudoLiga(partido.idLiga),
    claseActiva: "partido-resumen-interactivo",
  });
  return articulo;
}

export function crearElementoPartidoLiga(partido, opciones = {}) {
  const hora = formatearHora(partido.hora);
  const cabecera = crearElemento(
    "div",
    { className: "d-flex justify-content-between text-body-secondary small mb-2" },
    [
      crearElemento("span", {
        textContent: partido.jornada ? `Jornada ${partido.jornada}` : partido.nombreLiga || "Competición",
      }),
      crearElemento("span", {
        textContent: `${formatearFechaPartido(partido.fecha, partido.hora)}${hora ? ` · ${hora}` : ""}`,
      }),
    ]
  );

  const localCont = crearEnlaceEquipoTarjeta(
    partido.idEquipoLocal,
    partido.nombreEquipoLocal,
    partido.escudoEquipoLocal,
    24,
    "d-flex align-items-center gap-2 text-decoration-none text-dark text-truncate fw-medium small"
  );
  localCont.style.maxWidth = "42%";

  const visCont = crearEnlaceEquipoTarjeta(
    partido.idEquipoVisitante,
    partido.nombreEquipoVisitante,
    partido.escudoEquipoVisitante,
    24,
    "d-flex align-items-center justify-content-end gap-2 text-end text-decoration-none text-dark text-truncate fw-medium small",
    true
  );
  visCont.style.maxWidth = "42%";

  const badgeScore = crearElemento("span", {
    className: partido.esJugado
      ? "badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-6"
      : "badge bg-light text-dark border px-2 py-1 fs-6",
    textContent: partido.esJugado ? `${partido.golesLocal ?? 0} - ${partido.golesVisitante ?? 0}` : hora || "vs",
  });

  const articulo = crearElemento("article", { className: "list-group-item py-3" }, [
    cabecera,
    crearElemento("div", { className: "d-flex align-items-center justify-content-between gap-2" }, [
      localCont,
      badgeScore,
      visCont,
    ]),
  ]);

  vincularAperturaModalPartido(articulo, partido, {
    escudoLiga: opciones.escudoLiga || obtenerEscudoLiga(partido.idLiga),
    claseActiva: "partido-lista-interactivo",
  });
  return articulo;
}

function crearBotonPagina({ texto, ariaLabel, deshabilitado = false, activo = false, onClick }) {
  const boton = crearElemento("button", {
    className: `paginacion-partidos-btn${activo ? " activo" : ""}`,
    textContent: texto,
    attributes: {
      type: "button",
      "aria-label": ariaLabel,
      ...(activo ? { "aria-current": "page" } : {}),
      ...(deshabilitado ? { disabled: "" } : {}),
    },
  });
  if (!deshabilitado && onClick) {
    boton.addEventListener("click", onClick);
  }
  return boton;
}

function crearBarraPaginacion({
  paginaActual,
  totalPaginas,
  desde,
  hasta,
  totalElementos,
  etiquetaAria,
  onCambiarPagina,
}) {
  if (totalPaginas <= 1) return null;

  const botones = [
    crearBotonPagina({
      texto: "‹",
      ariaLabel: "Página anterior",
      deshabilitado: paginaActual <= 1,
      onClick: () => onCambiarPagina(paginaActual - 1),
    }),
  ];

  calcularPaginasVisibles(paginaActual, totalPaginas).forEach((entrada) => {
    if (entrada === "...") {
      botones.push(
        crearElemento("span", {
          className: "paginacion-partidos-elipsis",
          textContent: "…",
          attributes: { "aria-hidden": "true" },
        })
      );
      return;
    }
    botones.push(
      crearBotonPagina({
        texto: String(entrada),
        ariaLabel: `Página ${entrada}`,
        activo: entrada === paginaActual,
        onClick: () => {
          if (entrada !== paginaActual) onCambiarPagina(entrada);
        },
      })
    );
  });

  botones.push(
    crearBotonPagina({
      texto: "›",
      ariaLabel: "Página siguiente",
      deshabilitado: paginaActual >= totalPaginas,
      onClick: () => onCambiarPagina(paginaActual + 1),
    })
  );

  return crearElemento(
    "nav",
    { className: "paginacion-partidos", attributes: { "aria-label": etiquetaAria } },
    [
      crearElemento("span", {
        className: "paginacion-partidos-info",
        textContent: `${desde}–${hasta} de ${totalElementos}`,
      }),
      crearElemento("div", { className: "paginacion-partidos-controles" }, botones),
    ]
  );
}

export function renderizarListaPartidosPaginada(contenedor, partidos = [], opciones = {}) {
  if (!contenedor) return;
  const {
    porPagina = 6,
    paginaInicial = 1,
    mensajeVacio = "No hay partidos disponibles.",
    claseMensajeVacio = "p-3 text-body-secondary small",
    etiquetaAria = "Paginación de partidos",
    crearTarjeta = (partido) => crearElementoPartidoLiga(partido),
    renderizarGrupo = null,
  } = opciones;

  if (!Array.isArray(partidos) || partidos.length === 0) {
    contenedor.replaceChildren(crearMensaje(mensajeVacio, claseMensajeVacio));
    return;
  }

  let paginaActual = paginaInicial;

  const pintar = (alCambiarPagina = false) => {
    const estado = paginarElementos(partidos, paginaActual, porPagina);
    paginaActual = estado.paginaActual;

    const nodos = renderizarGrupo
      ? renderizarGrupo(estado.items)
      : estado.items.map((p) => crearTarjeta(p));

    const barra = crearBarraPaginacion({
      ...estado,
      etiquetaAria,
      onCambiarPagina: (nuevaPagina) => {
        paginaActual = nuevaPagina;
        pintar(true);
      },
    });

    contenedor.replaceChildren(...nodos, ...(barra ? [barra] : []));

    if (alCambiarPagina && typeof contenedor.scrollIntoView === "function") {
      (contenedor.closest("section") || contenedor).scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  };

  pintar(false);
}
