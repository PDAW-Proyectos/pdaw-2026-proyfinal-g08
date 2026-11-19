import {
  obtenerLigasCompartidas,
  extraerClaveFechaPartido,
  formatearFechaLarga,
  sumarDiasAFecha,
  crearElemento,
  crearEscudoImg,
  crearMensaje,
  fetchJsonSeguro,
  crearAvisoError,
} from "./utils.js";
import { crearElementoPartidoInicio, renderizarListaPartidosPaginada } from "./partidos.js";

const PARTIDOS_POR_PAGINA_INICIO = 6;

function crearCardLiga(liga) {
  return crearElemento("div", { className: "col" }, [
    crearElemento(
      "a",
      {
        className: "card shadow-sm text-decoration-none",
        attributes: { href: `liga.html?id=${liga.id}` },
      },
      [
        crearElemento("div", { className: "card-body p-3 d-flex align-items-center gap-2" }, [
          crearEscudoImg(liga.escudo || "", 43, "flex-shrink-0", `Escudo de ${liga.nombre}`),
          crearElemento("div", {}, [
            crearElemento("h2", { className: "card-title h6 mb-1 text-dark", textContent: liga.nombre }),
            crearElemento("p", {
              className: "card-text text-body-secondary mb-0 small",
              textContent: liga.pais,
            }),
          ]),
        ]),
      ]
    ),
  ]);
}

function agruparPartidosPorCompetencia(partidos, ligas = []) {
  const mapaLigas = new Map(ligas.map((l) => [String(l.id), l]));
  const orden = new Map(ligas.map((l, idx) => [String(l.id), idx]));
  const grupos = new Map();

  partidos.forEach((p) => {
    const idLiga = String(p.idLiga || "");
    const clave = idLiga || String(p.nombreLiga || "otras");
    const meta = idLiga ? mapaLigas.get(idLiga) : null;
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        idLiga,
        nombreLiga: meta?.nombre || p.nombreLiga || "Otras competiciones",
        pais: meta?.pais || "",
        escudo: meta?.escudo || "",
        partidos: [],
      });
    }
    grupos.get(clave).partidos.push(p);
  });

  return Array.from(grupos.values()).sort((a, b) => {
    const ordA = orden.has(a.idLiga) ? orden.get(a.idLiga) : Number.MAX_SAFE_INTEGER;
    const ordB = orden.has(b.idLiga) ? orden.get(b.idLiga) : Number.MAX_SAFE_INTEGER;
    return ordA !== ordB ? ordA - ordB : a.nombreLiga.localeCompare(b.nombreLiga);
  });
}

function crearBloqueCompetenciaProximos(grupo) {
  const bloque = crearElemento("section", {
    className: "grupo-liga-partidos",
    attributes: { "aria-label": `Próximos partidos de ${grupo.nombreLiga}` },
  });

  const tituloCont = crearElemento(grupo.idLiga ? "a" : "div", {
    className: "grupo-liga-enlace",
    attributes: grupo.idLiga
      ? {
          href: `liga.html?id=${encodeURIComponent(grupo.idLiga)}`,
          title: `Ver tabla y detalles de ${grupo.nombreLiga}`,
        }
      : {},
  });

  if (grupo.escudo) {
    tituloCont.appendChild(crearEscudoImg(grupo.escudo, 20, "grupo-liga-escudo"));
  }
  tituloCont.appendChild(
    crearElemento("strong", { className: "grupo-liga-nombre", textContent: grupo.nombreLiga })
  );
  if (grupo.pais) {
    tituloCont.appendChild(
      crearElemento("span", { className: "grupo-liga-pais", textContent: `· ${grupo.pais}` })
    );
  }

  const cabecera = crearElemento("header", { className: "cabecera-grupo-liga" }, [
    tituloCont,
    crearElemento("span", {
      className: "grupo-liga-conteo",
      textContent: `${grupo.partidos.length} ${grupo.partidos.length === 1 ? "partido" : "partidos"}`,
    }),
  ]);

  const lista = crearElemento("div", { className: "grupo-liga-lista" });
  grupo.partidos.forEach((partido) => {
    lista.appendChild(crearElementoPartidoInicio(partido, { escudoLiga: grupo.escudo }));
  });

  bloque.append(cabecera, lista);
  return bloque;
}

function crearEstadoVacioFiltro(fechaFiltro, onQuitarFiltro) {
  const boton = crearElemento("button", {
    className: "grupo-liga-toggle",
    textContent: "Ver todos los partidos",
    attributes: { type: "button" },
  });
  boton.addEventListener("click", onQuitarFiltro);
  return crearElemento("div", { className: "estado-vacio-filtro" }, [
    crearElemento("p", {
      className: "estado-vacio-filtro-texto",
      textContent: `No hay próximos partidos programados para el ${formatearFechaLarga(fechaFiltro)}.`,
    }),
    boton,
  ]);
}

function configurarFiltroFecha(contenedorProximos, obtenerLigas, obtenerPartidos) {
  let fechaFiltro = null;
  const barra = document.querySelector("#proximos-partidos .barra-filtro-fecha");
  const botones = barra ? [...barra.querySelectorAll("[data-filtro-fecha]")] : [];
  const entradaFecha = document.getElementById("filtroFechaInicio");

  const sincronizar = () => {
    const hoy = sumarDiasAFecha(new Date(), 0);
    const manana = sumarDiasAFecha(new Date(), 1);
    if (entradaFecha) {
      entradaFecha.value = fechaFiltro || "";
      entradaFecha.classList.toggle("activo", Boolean(fechaFiltro));
    }
    botones.forEach((b) => {
      const tipo = b.dataset.filtroFecha;
      const activo =
        (tipo === "todos" && !fechaFiltro) ||
        (tipo === "hoy" && fechaFiltro === hoy) ||
        (tipo === "manana" && fechaFiltro === manana);
      b.classList.toggle("activo", activo);
      b.setAttribute("aria-pressed", String(activo));
    });
  };

  const renderizar = () => {
    contenedorProximos.replaceChildren();
    const todos = obtenerPartidos();
    const filtrados = fechaFiltro
      ? todos.filter((p) => extraerClaveFechaPartido(p) === fechaFiltro)
      : todos;

    if (filtrados.length > 0) {
      renderizarListaPartidosPaginada(contenedorProximos, filtrados, {
        porPagina: PARTIDOS_POR_PAGINA_INICIO,
        etiquetaAria: "Paginación de próximos partidos",
        renderizarGrupo: (itemsPagina) =>
          agruparPartidosPorCompetencia(itemsPagina, obtenerLigas()).map(
            crearBloqueCompetenciaProximos
          ),
      });
      return;
    }

    if (fechaFiltro && todos.length > 0) {
      contenedorProximos.appendChild(
        crearEstadoVacioFiltro(fechaFiltro, () => aplicar(null))
      );
      return;
    }

    contenedorProximos.appendChild(
      crearMensaje("No hay partidos próximos programados.", "p-3 text-body-secondary small")
    );
  };

  const aplicar = (nuevaFecha) => {
    fechaFiltro = nuevaFecha || null;
    sincronizar();
    renderizar();
  };

  botones.forEach((b) => {
    b.addEventListener("click", () => {
      const tipo = b.dataset.filtroFecha;
      if (tipo === "hoy") aplicar(sumarDiasAFecha(new Date(), 0));
      else if (tipo === "manana") aplicar(sumarDiasAFecha(new Date(), 1));
      else aplicar(null);
    });
  });

  if (entradaFecha) {
    const onCambio = () => aplicar(entradaFecha.value || null);
    entradaFecha.addEventListener("change", onCambio);
    entradaFecha.addEventListener("input", onCambio);
  }

  sincronizar();
  return renderizar;
}

export async function inicializarInicio() {
  const contenedorLigas = document.getElementById("contenedorLigas");
  const contenedorProximos = document.getElementById("contenedorPartidosProximos");
  const contenedorJugados = document.getElementById("contenedorPartidosJugados");

  let ligasDisponibles = [];
  let todosLosProximos = [];

  const renderizarProximos = contenedorProximos
    ? configurarFiltroFecha(
        contenedorProximos,
        () => ligasDisponibles,
        () => todosLosProximos
      )
    : null;

  const cargarLigas = async () => {
    try {
      ligasDisponibles = await obtenerLigasCompartidas();
      if (contenedorLigas) {
        contenedorLigas.replaceChildren(...ligasDisponibles.map(crearCardLiga));
      }
      if (todosLosProximos.length > 0 && renderizarProximos) renderizarProximos();
    } catch (error) {
      if (contenedorLigas) {
        contenedorLigas.replaceChildren(
          crearAvisoError(error, { onReintentar: cargarLigas, centrado: true })
        );
      }
    }
  };

  const cargarProximos = async () => {
    if (!contenedorProximos) return;
    try {
      const datos = await fetchJsonSeguro("/api/partidos/proximos?limite=0");
      todosLosProximos = Array.isArray(datos) ? datos : [];
      renderizarProximos();
    } catch (error) {
      contenedorProximos.replaceChildren(
        crearAvisoError(error, { onReintentar: cargarProximos, centrado: true })
      );
    }
  };

  const cargarJugados = async () => {
    if (!contenedorJugados) return;
    try {
      const jugados = await fetchJsonSeguro("/api/partidos/jugados?limite=0");
      renderizarListaPartidosPaginada(
        contenedorJugados,
        Array.isArray(jugados) ? jugados : [],
        {
          porPagina: PARTIDOS_POR_PAGINA_INICIO,
          mensajeVacio: "No hay resultados recientes disponibles.",
          etiquetaAria: "Paginación de partidos jugados",
          crearTarjeta: (p) => crearElementoPartidoInicio(p),
        }
      );
    } catch (error) {
      contenedorJugados.replaceChildren(
        crearAvisoError(error, { onReintentar: cargarJugados, centrado: true })
      );
    }
  };

  await Promise.all([cargarLigas(), cargarProximos(), cargarJugados()]);
}
