import {
  obtenerLigasCompartidas,
  crearElemento,
  crearEscudoImg,
  crearMensaje,
  fetchJsonSeguro,
  formatearErrorHttp,
  crearAvisoError,
} from "./utils.js";
import { crearElementoPartidoLiga, renderizarListaPartidosPaginada } from "./partidos.js";

const PARTIDOS_POR_PAGINA_LIGA = 5;

const ALIAS_LIGAS = {
  premierleague: "4328",
  laliga: "4335",
  bundesliga: "4331",
  seriea: "4332",
  ligue1: "4334",
};

const normalizarClave = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function crearFilaMensajeTabla(texto, colSpan) {
  return crearElemento("tr", {}, [
    crearElemento("td", {
      className: "text-center text-body-secondary small py-3",
      textContent: texto,
      attributes: { colspan: colSpan },
    }),
  ]);
}

function crearCeldaEquipoTabla(pos, imgSize) {
  const enlace = crearElemento("a", {
    className: "d-flex align-items-center gap-2 text-decoration-none text-dark",
    attributes: { href: `equipo.html?id=${encodeURIComponent(pos.idEquipo || pos.nombreEquipo)}` },
  });
  if (pos.escudoEquipo) {
    enlace.appendChild(crearEscudoImg(pos.escudoEquipo, imgSize, "flex-shrink-0"));
  }
  enlace.appendChild(
    crearElemento("span", {
      className: "text-truncate",
      textContent: pos.nombreEquipo ?? "Equipo",
    })
  );
  return crearElemento("td", {}, [enlace]);
}

function renderizarTablaResumida(tbody, tabla) {
  if (!tbody || !Array.isArray(tabla) || tabla.length === 0) return;
  tbody.replaceChildren(
    ...tabla.map((pos) =>
      crearElemento("tr", {}, [
        crearElemento("th", {
          className: "text-center",
          textContent: pos.posicion ?? "—",
          attributes: { scope: "row" },
        }),
        crearCeldaEquipoTabla(pos, 22),
        crearElemento("td", { className: "text-center", textContent: pos.partidosJugados ?? "0" }),
        crearElemento("td", { className: "text-center fw-bold", textContent: pos.puntos ?? "0" }),
      ])
    )
  );
}

export async function inicializarLigas() {
  try {
    const ligas = await obtenerLigasCompartidas();
    if (!Array.isArray(ligas)) return;

    document.querySelectorAll(".tarjeta-detalle-liga[data-liga-id]").forEach((articulo) => {
      const idNorm = normalizarClave(articulo.dataset.ligaId);
      const liga = ligas.find((l) => {
        if (String(l.id) === String(articulo.dataset.ligaId)) return true;
        const nNorm = normalizarClave(l.nombre);
        return (
          (nNorm && idNorm && (nNorm.includes(idNorm) || idNorm.includes(nNorm))) ||
          ALIAS_LIGAS[idNorm] === String(l.id)
        );
      });
      if (!liga) return;

      const titulo = articulo.querySelector('[data-liga-field="nombre"]');
      if (titulo && !titulo.querySelector("a")) {
        titulo.replaceChildren(
          crearElemento("a", {
            className: "text-decoration-none text-dark",
            textContent: titulo.textContent,
            attributes: { href: `liga.html?id=${encodeURIComponent(liga.id)}` },
          })
        );
      }

      const imgEscudo = articulo.querySelector('[data-liga-field="escudo"]');
      if (imgEscudo && liga.escudo) {
        imgEscudo.src = liga.escudo;
        imgEscudo.referrerPolicy = "no-referrer";
        imgEscudo.hidden = false;
        const spanText = articulo.querySelector(".escudo-liga-detalle span");
        if (spanText) spanText.hidden = true;
      }

      const tbody = articulo.querySelector("[data-liga-tabla]");
      if (tbody && Array.isArray(liga.tabla) && liga.tabla.length > 0) {
        renderizarTablaResumida(tbody, liga.tabla);
      }

      const details = articulo.querySelector("details.tabla-liga");
      if (details && tbody) {
        details.addEventListener("toggle", async () => {
          if (!details.open || tbody.children.length > 0) return;
          tbody.replaceChildren(crearFilaMensajeTabla("Cargando tabla...", 4));
          try {
            const detalle = await fetchJsonSeguro(`/api/ligas/${encodeURIComponent(liga.id)}`);
            if (Array.isArray(detalle.tabla) && detalle.tabla.length > 0) {
              renderizarTablaResumida(tbody, detalle.tabla);
            } else if (detalle.errorTabla) {
              tbody.replaceChildren(crearFilaMensajeTabla(detalle.errorTabla, 4));
            } else {
              tbody.replaceChildren(crearFilaMensajeTabla("Sin datos de tabla disponibles.", 4));
            }
          } catch (err) {
            tbody.replaceChildren(crearFilaMensajeTabla(formatearErrorHttp(err), 4));
          }
        });
      }
    });
  } catch (error) {
    const cuadricula = document.querySelector(".cuadricula-ligas");
    const previo = document.getElementById("errorLigasCatalogo");
    if (previo) previo.remove();
    if (cuadricula?.parentElement) {
      const aviso = crearAvisoError(error, {
        onReintentar: () => inicializarLigas(),
        centrado: true,
      });
      aviso.id = "errorLigasCatalogo";
      aviso.classList.add("mb-3", "border", "rounded-3", "bg-white");
      cuadricula.parentElement.insertBefore(aviso, cuadricula);
    }
  }
}

function renderizarTablaCompletaLiga(liga) {
  const cuerpoTabla = document.getElementById("cuerpoTablaPosiciones");
  if (!cuerpoTabla) return;

  const tabla = Array.isArray(liga.tabla) ? liga.tabla : [];
  if (tabla.length === 0) {
    const boton = crearElemento("button", {
      className: "btn btn-sm btn-outline-success",
      textContent: "Reintentar cargar tabla",
      attributes: { type: "button" },
    });
    boton.addEventListener("click", () => inicializarLiga());
    cuerpoTabla.replaceChildren(
      crearElemento("tr", {}, [
        crearElemento(
          "td",
          { className: "text-center text-body-secondary py-4", attributes: { colspan: 10 } },
          [
            crearElemento("p", {
              className: "mb-2",
              textContent: liga.errorTabla
                ? `No se pudo obtener la tabla desde la API: ${liga.errorTabla}`
                : "No hay datos de posiciones disponibles para esta liga en este momento.",
            }),
            boton,
          ]
        ),
      ])
    );
    return;
  }

  cuerpoTabla.replaceChildren(
    ...tabla.map((pos) =>
      crearElemento("tr", {}, [
        crearElemento("th", {
          className: "text-center",
          textContent: pos.posicion ?? "—",
          attributes: { scope: "row" },
        }),
        crearCeldaEquipoTabla(pos, 30),
        ...[
          pos.partidosJugados,
          pos.victorias,
          pos.empates,
          pos.derrotas,
          pos.golesFavor,
          pos.golesContra,
          pos.diferenciaGol,
          pos.puntos,
        ].map((val) => crearElemento("td", { className: "text-center", textContent: val ?? "—" })),
      ])
    )
  );
}

async function cargarPartidosLiga(idLiga, escudoLiga = "") {
  const listaProximos = document.getElementById("listaProximosPartidosLiga");
  const listaJugados = document.getElementById("listaPartidosJugadosLiga");
  if (!listaProximos && !listaJugados) return;

  try {
    const { proximos = [], jugados = [] } = await fetchJsonSeguro(
      `/api/ligas/${encodeURIComponent(idLiga)}/partidos`
    );

    if (listaProximos) {
      renderizarListaPartidosPaginada(listaProximos, proximos, {
        porPagina: PARTIDOS_POR_PAGINA_LIGA,
        mensajeVacio: "No hay partidos próximos programados.",
        claseMensajeVacio: "p-3 text-body-secondary small text-center",
        etiquetaAria: "Paginación de próximos partidos de la liga",
        crearTarjeta: (p) => crearElementoPartidoLiga(p, { escudoLiga }),
      });
    }
    if (listaJugados) {
      renderizarListaPartidosPaginada(listaJugados, jugados, {
        porPagina: PARTIDOS_POR_PAGINA_LIGA,
        mensajeVacio: "No hay resultados jugados registrados.",
        claseMensajeVacio: "p-3 text-body-secondary small text-center",
        etiquetaAria: "Paginación de partidos jugados de la liga",
        crearTarjeta: (p) => crearElementoPartidoLiga(p, { escudoLiga }),
      });
    }
  } catch (error) {
    const opciones = {
      onReintentar: () => cargarPartidosLiga(idLiga, escudoLiga),
      centrado: true,
    };
    if (listaProximos) listaProximos.replaceChildren(crearAvisoError(error, opciones));
    if (listaJugados) listaJugados.replaceChildren(crearAvisoError(error, opciones));
  }
}

export async function inicializarLiga() {
  const idLiga = new URLSearchParams(window.location.search).get("id");
  const cuerpoTabla = document.getElementById("cuerpoTablaPosiciones");
  const listaProximos = document.getElementById("listaProximosPartidosLiga");
  const listaJugados = document.getElementById("listaPartidosJugadosLiga");

  if (!idLiga) {
    const msg = "Error 400: Falta el identificador de la liga en la URL.";
    if (cuerpoTabla) cuerpoTabla.replaceChildren(crearFilaMensajeTabla(msg, 10));
    if (listaProximos) listaProximos.replaceChildren(crearMensaje(msg));
    if (listaJugados) listaJugados.replaceChildren(crearMensaje(msg));
    return;
  }

  if (cuerpoTabla) {
    cuerpoTabla.replaceChildren(crearFilaMensajeTabla("Cargando tabla de posiciones...", 10));
  }

  try {
    const liga = await fetchJsonSeguro(`/api/ligas/${encodeURIComponent(idLiga)}`);

    const escudoLiga = document.getElementById("escudoLiga");
    if (escudoLiga) {
      if (liga.escudo) {
        escudoLiga.src = liga.escudo;
        escudoLiga.alt = `Escudo de ${liga.nombre}`;
        escudoLiga.referrerPolicy = "no-referrer";
        escudoLiga.style.display = "block";
        escudoLiga.onerror = () => {
          escudoLiga.style.display = "none";
        };
      } else {
        escudoLiga.style.display = "none";
      }
    }
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val || "";
    };
    setText("tituloLiga", liga.nombre);
    setText("paisLiga", liga.pais);
    setText("temporadaLiga", liga.temporada);

    renderizarTablaCompletaLiga(liga);
    cargarPartidosLiga(idLiga, liga.escudo || "");
  } catch (error) {
    if (cuerpoTabla) {
      const boton = crearElemento("button", {
        className: "btn btn-sm btn-outline-success",
        textContent: "Reintentar",
        attributes: { type: "button" },
      });
      boton.addEventListener("click", () => inicializarLiga());
      cuerpoTabla.replaceChildren(
        crearElemento("tr", {}, [
          crearElemento(
            "td",
            { className: "text-center text-danger py-4", attributes: { colspan: 10 } },
            [crearElemento("p", { className: "mb-2 small fw-semibold", textContent: formatearErrorHttp(error) }), boton]
          ),
        ])
      );
    }
    if (listaProximos) listaProximos.replaceChildren(crearAvisoError(error, { centrado: true }));
    if (listaJugados) listaJugados.replaceChildren(crearAvisoError(error, { centrado: true }));
  }
}
