import {
  obtenerLigasCompartidas,
  formatearFechaPartido,
  formatearHora,
  crearElemento,
  crearEscudoImg,
  crearMensaje,
  fetchJsonSeguro,
  formatearErrorHttp,
  crearAvisoError,
} from "./utils.js";
import {
  crearElementoPartidoLiga,
  renderizarListaPartidosPaginada,
  vincularAperturaModalPartido,
} from "./partidos.js";

const PARTIDOS_POR_PAGINA_EQUIPO = 5;

function crearColumnaMetrica(claseColumna, etiqueta, valor, claseValor) {
  return crearElemento("div", { className: claseColumna }, [
    crearElemento("span", {
      className: "d-block text-muted small text-uppercase fw-semibold",
      textContent: etiqueta,
    }),
    crearElemento("span", { className: claseValor, textContent: valor }),
  ]);
}

function crearEnlaceRival(rivalId, rivalNombre) {
  return crearElemento("h3", { className: "h5 mb-0 text-truncate" }, [
    crearElemento("a", {
      className: "text-dark text-decoration-none fw-bold hover-underline",
      textContent: rivalNombre || "Rival por confirmar",
      attributes: { href: `equipo.html?id=${encodeURIComponent(rivalId || rivalNombre)}` },
    }),
  ]);
}

function crearPiePartidoDestacado(textoIzq, textoDer, claseDer = "") {
  return crearElemento(
    "div",
    {
      className:
        "text-body-secondary small border-top pt-2 d-flex justify-content-between align-items-center gap-2",
    },
    [
      crearElemento("span", { textContent: textoIzq }),
      crearElemento("span", { className: claseDer, textContent: textoDer }),
    ]
  );
}

function renderizarEncabezadoEquipo(equipo) {
  document.title = `${equipo.nombre} · Orsai.`;
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setText("tituloEquipo", equipo.nombre);
  setText("migaEquipo", equipo.nombre);
  setText(
    "paisYFundacionEquipo",
    `${equipo.pais || "Club de fútbol"}${equipo.fundacion ? ` · Fundado en ${equipo.fundacion}` : ""}`
  );

  const elemMigaLiga = document.getElementById("migaLiga");
  if (elemMigaLiga && equipo.liga) {
    elemMigaLiga.replaceChildren(
      crearElemento("a", {
        className: "text-decoration-none",
        textContent: equipo.liga.nombre,
        attributes: { href: `liga.html?id=${encodeURIComponent(equipo.liga.id)}` },
      })
    );
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
      elemLigaCont.replaceChildren(
        crearElemento(
          "a",
          {
            className:
              "badge bg-light text-dark border p-2 text-decoration-none d-inline-flex align-items-center gap-2",
            attributes: { href: `liga.html?id=${encodeURIComponent(equipo.liga.id)}` },
          },
          [
            equipo.liga.escudo ? crearEscudoImg(equipo.liga.escudo, 20) : null,
            crearElemento("span", { textContent: equipo.liga.nombre }),
          ]
        )
      );
    } else {
      elemLigaCont.replaceChildren(
        crearElemento("span", {
          className: "badge bg-light text-secondary border",
          textContent: "Competición en seguimiento",
        })
      );
    }
  }
}

function renderizarPosicionEquipo(equipo) {
  const enlaceLiga = document.getElementById("enlaceVerLigaCompleta");
  if (enlaceLiga && equipo.liga) {
    enlaceLiga.href = `liga.html?id=${encodeURIComponent(equipo.liga.id)}`;
  } else if (enlaceLiga) {
    enlaceLiga.style.display = "none";
  }

  const cuerpoPosicion = document.getElementById("cuerpoPosicionLiga");
  if (!cuerpoPosicion) return;

  if (!equipo.posicion) {
    cuerpoPosicion.replaceChildren(
      crearElemento("div", {
        className: "col-12 py-3 text-body-secondary small",
        textContent:
          "Este club no tiene registro activo en la tabla de las principales ligas monitoreadas.",
      })
    );
    return;
  }

  const pos = equipo.posicion;
  const dg = Number(pos.diferenciaGol ?? 0);
  cuerpoPosicion.replaceChildren(
    crearColumnaMetrica(
      "col-6 col-sm-3 col-md-2 border-end",
      "Puesto",
      `#${pos.posicion ?? "—"}`,
      "fs-2 fw-bold text-success"
    ),
    crearColumnaMetrica(
      "col-6 col-sm-3 col-md-2 border-end",
      "Puntos",
      String(pos.puntos ?? "0"),
      "fs-2 fw-bold text-dark"
    ),
    crearColumnaMetrica(
      "col-4 col-sm-2 col-md-2 border-end",
      "Jugados",
      String(pos.partidosJugados ?? "0"),
      "fs-4 fw-semibold text-secondary"
    ),
    crearColumnaMetrica(
      "col-4 col-sm-2 col-md-3 border-end",
      "G / E / P",
      `${pos.victorias ?? 0}V · ${pos.empates ?? 0}E · ${pos.derrotas ?? 0}D`,
      "fs-5 fw-semibold text-dark"
    ),
    crearColumnaMetrica(
      "col-4 col-sm-2 col-md-3",
      "Goles (DG)",
      `${pos.golesFavor ?? 0}:${pos.golesContra ?? 0} (${dg > 0 ? `+${dg}` : String(dg)})`,
      "fs-5 fw-semibold text-dark"
    )
  );
}

function datosRivalPartido(partido, equipo) {
  const esLocal =
    String(partido.idEquipoLocal) === String(equipo.id) ||
    partido.nombreEquipoLocal === equipo.nombre;
  return {
    esLocal,
    nombre: esLocal ? partido.nombreEquipoVisitante : partido.nombreEquipoLocal,
    escudo: esLocal ? partido.escudoEquipoVisitante : partido.escudoEquipoLocal,
    id: esLocal ? partido.idEquipoVisitante : partido.idEquipoLocal,
  };
}

function renderizarPartidosDestacados(equipo) {
  const cuerpoProx = document.getElementById("cuerpoProximoPartido");
  if (cuerpoProx) {
    const p = equipo.proximoPartido;
    if (p) {
      const rival = datosRivalPartido(p, equipo);
      const hora = formatearHora(p.hora);
      const pie = crearPiePartidoDestacado(
        `${p.nombreLiga}${p.jornada ? ` · J${p.jornada}` : ""}`,
        p.estadio || equipo.estadio || "Estadio por confirmar",
        "text-truncate"
      );
      pie.lastElementChild.style.maxWidth = "50%";

      cuerpoProx.replaceChildren(
        crearElemento("div", { className: "d-flex align-items-center justify-content-between mb-3" }, [
          crearElemento("span", {
            className: "badge bg-light text-success border small fw-bold",
            textContent: "Por disputar",
          }),
          crearElemento("span", {
            className: "text-body-secondary small",
            textContent: `${formatearFechaPartido(p.fecha, p.hora)}${hora ? ` · ${hora}` : ""}`,
          }),
        ]),
        crearElemento("div", { className: "d-flex align-items-center gap-3 mb-3" }, [
          rival.escudo ? crearEscudoImg(rival.escudo, 42) : null,
          crearElemento("div", {}, [
            crearElemento("p", {
              className: "text-muted small mb-0",
              textContent: rival.esLocal ? "Local vs" : "Visitante ante",
            }),
            crearEnlaceRival(rival.id, rival.nombre),
          ]),
        ]),
        pie
      );
      vincularAperturaModalPartido(cuerpoProx, p, {
        escudoLiga: equipo.liga?.escudo || "",
        claseActiva: "partido-destacado-interactivo",
      });
    } else {
      cuerpoProx.replaceChildren(
        crearMensaje("No hay partidos próximos programados en el calendario inmediato.")
      );
    }
  }

  const cuerpoUlt = document.getElementById("cuerpoUltimoPartido");
  if (cuerpoUlt) {
    const p = equipo.ultimoPartido;
    if (p) {
      const rival = datosRivalPartido(p, equipo);
      const gEq = rival.esLocal ? Number(p.golesLocal ?? 0) : Number(p.golesVisitante ?? 0);
      const gRiv = rival.esLocal ? Number(p.golesVisitante ?? 0) : Number(p.golesLocal ?? 0);
      const [claseRes, textoRes] =
        gEq > gRiv
          ? ["badge bg-success-subtle text-success border border-success-subtle small fw-bold", "Victoria"]
          : gEq < gRiv
            ? ["badge bg-danger-subtle text-danger border border-danger-subtle small fw-bold", "Derrota"]
            : ["badge bg-secondary-subtle text-secondary border small", "Empate"];

      const contRival = crearElemento("div", { className: "d-flex align-items-center gap-2" }, [
        rival.escudo ? crearEscudoImg(rival.escudo, 40) : null,
        crearElemento("div", {}, [
          crearElemento("p", {
            className: "text-muted small mb-0",
            textContent: rival.esLocal ? "Contra" : "De visita en",
          }),
          crearEnlaceRival(rival.id, rival.nombre),
        ]),
      ]);
      contRival.style.maxWidth = "60%";

      cuerpoUlt.replaceChildren(
        crearElemento("div", { className: "d-flex align-items-center justify-content-between mb-3" }, [
          crearElemento("span", { className: claseRes, textContent: textoRes }),
          crearElemento("span", {
            className: "text-body-secondary small",
            textContent: formatearFechaPartido(p.fecha, p.hora),
          }),
        ]),
        crearElemento("div", { className: "d-flex align-items-center justify-content-between mb-3" }, [
          contRival,
          crearElemento("div", { className: "text-center px-3 py-1 bg-light rounded-3 border" }, [
            crearElemento("span", {
              className: "fs-4 fw-bold text-dark",
              textContent: `${p.golesLocal ?? 0} - ${p.golesVisitante ?? 0}`,
            }),
          ]),
        ]),
        crearPiePartidoDestacado(
          `${p.nombreLiga}${p.jornada ? ` · J${p.jornada}` : ""}`,
          rival.esLocal ? "Local" : "Visitante",
          "fw-semibold text-dark"
        )
      );
      vincularAperturaModalPartido(cuerpoUlt, p, {
        escudoLiga: equipo.liga?.escudo || "",
        claseActiva: "partido-destacado-interactivo",
      });
    } else {
      cuerpoUlt.replaceChildren(
        crearMensaje("No hay registros recientes de partidos finalizados.")
      );
    }
  }
}

function renderizarInfoClub(equipo) {
  const elemEstadio = document.getElementById("estadioEquipo");
  if (elemEstadio) elemEstadio.textContent = equipo.estadio || "Estadio principal";

  const elemFundacion = document.getElementById("fundacionEquipo");
  if (elemFundacion) {
    elemFundacion.textContent = equipo.fundacion ? `Año ${equipo.fundacion}` : "—";
  }

  const elemWeb = document.getElementById("sitioWebContenedor");
  if (elemWeb) {
    if (equipo.sitioWeb) {
      const limpia = String(equipo.sitioWeb).replace(/^https?:\/\//, "").trim();
      elemWeb.replaceChildren(
        crearElemento("a", {
          className: "text-success text-decoration-none fw-semibold",
          textContent: `${limpia} ↗`,
          attributes: {
            href: `https://${limpia}`,
            target: "_blank",
            rel: "noopener noreferrer",
          },
        })
      );
    } else {
      elemWeb.textContent = "—";
    }
  }

  const elemDesc = document.getElementById("descripcionEquipo");
  if (elemDesc) {
    elemDesc.textContent =
      equipo.descripcion || "Información histórica e institucional del club en actualización.";
  }
}

function mostrarErrorEquipo(contenedorError, contenedorPrincipal, error, onReintentar = null) {
  if (contenedorPrincipal) contenedorPrincipal.classList.add("d-none");
  if (!contenedorError) return;

  const nodos = [
    crearElemento("strong", { textContent: formatearErrorHttp(error) }),
    document.createTextNode(" "),
    crearElemento("a", {
      className: "alert-link",
      textContent: "Volver a ligas",
      attributes: { href: "ligas.html" },
    }),
  ];

  if (typeof onReintentar === "function") {
    const btn = crearElemento("button", {
      className: "btn btn-sm btn-outline-dark ms-3",
      textContent: "Reintentar",
      attributes: { type: "button" },
    });
    btn.addEventListener("click", onReintentar);
    nodos.push(btn);
  }

  contenedorError.replaceChildren(...nodos);
  contenedorError.classList.remove("d-none");
}

async function cargarListasPartidosEquipo(idEquipo) {
  const listaProx = document.getElementById("listaProximosEquipo");
  const listaJug = document.getElementById("listaJugadosEquipo");
  try {
    const { proximos = [], jugados = [] } = await fetchJsonSeguro(
      `/api/equipos/${encodeURIComponent(idEquipo)}/partidos`
    );

    if (listaProx) {
      renderizarListaPartidosPaginada(listaProx, proximos, {
        porPagina: PARTIDOS_POR_PAGINA_EQUIPO,
        mensajeVacio: "No hay próximos partidos en agenda.",
        claseMensajeVacio: "p-3 text-body-secondary small text-center",
        etiquetaAria: "Paginación de próximos partidos del equipo",
        crearTarjeta: (p) => crearElementoPartidoLiga(p),
      });
    }
    if (listaJug) {
      renderizarListaPartidosPaginada(listaJug, jugados, {
        porPagina: PARTIDOS_POR_PAGINA_EQUIPO,
        mensajeVacio: "No hay partidos jugados registrados.",
        claseMensajeVacio: "p-3 text-body-secondary small text-center",
        etiquetaAria: "Paginación de partidos jugados del equipo",
        crearTarjeta: (p) => crearElementoPartidoLiga(p),
      });
    }
  } catch (error) {
    const opciones = {
      onReintentar: () => cargarListasPartidosEquipo(idEquipo),
      centrado: true,
    };
    if (listaProx) listaProx.replaceChildren(crearAvisoError(error, opciones));
    if (listaJug) listaJug.replaceChildren(crearAvisoError(error, opciones));
  }
}

export async function inicializarEquipo() {
  const idEquipo = new URLSearchParams(window.location.search).get("id");
  const contenedorError = document.getElementById("mensajeErrorEquipo");
  const contenedorPrincipal = document.getElementById("contenidoEquipo");

  if (!idEquipo) {
    mostrarErrorEquipo(contenedorError, contenedorPrincipal, {
      status: 400,
      message: "Falta el identificador del equipo en la URL.",
    });
    return;
  }

  if (contenedorError) contenedorError.classList.add("d-none");
  if (contenedorPrincipal) contenedorPrincipal.classList.remove("d-none");

  try {
    await obtenerLigasCompartidas().catch(() => []);
    const equipo = await fetchJsonSeguro(`/api/equipos/${encodeURIComponent(idEquipo)}`);
    renderizarEncabezadoEquipo(equipo);
    renderizarPosicionEquipo(equipo);
    renderizarPartidosDestacados(equipo);
    renderizarInfoClub(equipo);
    cargarListasPartidosEquipo(idEquipo);
  } catch (error) {
    mostrarErrorEquipo(contenedorError, contenedorPrincipal, error, () => inicializarEquipo());
  }
}
