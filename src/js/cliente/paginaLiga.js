import { crearElementoPartidoLiga } from "./tarjetasPartido.js";

function renderizarEncabezadoLiga(liga) {
  const escudoLiga = document.getElementById("escudoLiga");
  const tituloLiga = document.getElementById("tituloLiga");
  const paisLiga = document.getElementById("paisLiga");
  const temporadaLiga = document.getElementById("temporadaLiga");

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
  if (tituloLiga) tituloLiga.textContent = liga.nombre || "";
  if (paisLiga) paisLiga.textContent = liga.pais || "";
  if (temporadaLiga) temporadaLiga.textContent = liga.temporada || "";
}

function agregarPosicionATabla(posicion) {
  const tableRow = document.createElement("tr");
  const celdaPosicion = document.createElement("th");
  celdaPosicion.scope = "row";
  celdaPosicion.className = "text-center";
  celdaPosicion.textContent = posicion.posicion ?? "—";
  tableRow.appendChild(celdaPosicion);

  const celdaEquipo = document.createElement("td");
  const informacionEquipo = document.createElement("a");
  informacionEquipo.href = `equipo.html?id=${posicion.idEquipo}`;
  informacionEquipo.className =
    "d-flex align-items-center gap-2 text-decoration-none text-dark";

  if (posicion.escudoEquipo) {
    const escudoEquipo = document.createElement("img");
    escudoEquipo.src = posicion.escudoEquipo;
    escudoEquipo.alt = "";
    escudoEquipo.width = 30;
    escudoEquipo.height = 30;
    escudoEquipo.className = "flex-shrink-0";
    escudoEquipo.style.objectFit = "contain";
    escudoEquipo.loading = "lazy";
    escudoEquipo.referrerPolicy = "no-referrer";
    escudoEquipo.onerror = () => {
      escudoEquipo.style.display = "none";
    };
    informacionEquipo.appendChild(escudoEquipo);
  }

  const nombreEquipo = document.createElement("span");
  nombreEquipo.className = "nombre-equipo text-truncate d-inline-block";
  nombreEquipo.textContent = posicion.nombreEquipo ?? "Equipo desconocido";
  informacionEquipo.appendChild(nombreEquipo);
  celdaEquipo.appendChild(informacionEquipo);
  tableRow.appendChild(celdaEquipo);

  [
    posicion.partidosJugados,
    posicion.victorias,
    posicion.empates,
    posicion.derrotas,
    posicion.golesFavor,
    posicion.golesContra,
    posicion.diferenciaGol,
    posicion.puntos,
  ].forEach((estadistica) => {
    const celdaEstadistica = document.createElement("td");
    celdaEstadistica.className = "text-center";
    celdaEstadistica.textContent = estadistica ?? "—";
    tableRow.appendChild(celdaEstadistica);
  });

  return tableRow;
}

function renderizarTablaLiga(liga) {
  const cuerpoTabla = document.getElementById("cuerpoTablaPosiciones");
  if (!cuerpoTabla) return;

  const tablaDeLiga = Array.isArray(liga.tabla) ? liga.tabla : [];
  cuerpoTabla.replaceChildren();

  if (tablaDeLiga.length === 0) {
    const filaVacia = document.createElement("tr");
    const celda = document.createElement("td");
    celda.colSpan = 10;
    celda.className = "text-center text-body-secondary py-4";

    const mensaje = document.createElement("p");
    mensaje.className = "mb-2";
    mensaje.textContent = liga.errorTabla
      ? `No se pudo obtener la tabla desde la API: ${liga.errorTabla}`
      : "No hay datos de posiciones disponibles para esta liga en este momento.";

    const botonReintentar = document.createElement("button");
    botonReintentar.type = "button";
    botonReintentar.className = "btn btn-sm btn-outline-success";
    botonReintentar.textContent = "Reintentar cargar tabla";
    botonReintentar.addEventListener("click", () => inicializarLiga());

    celda.append(mensaje, botonReintentar);
    filaVacia.appendChild(celda);
    cuerpoTabla.appendChild(filaVacia);
    return;
  }

  tablaDeLiga.forEach((posicion) => {
    cuerpoTabla.appendChild(agregarPosicionATabla(posicion));
  });
}

function crearMensajeLista(texto) {
  const div = document.createElement("div");
  div.className = "p-3 text-body-secondary small text-center";
  div.textContent = texto;
  return div;
}

function crearFilaMensajeTabla(texto) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 10;
  td.className = "text-center text-body-secondary py-4";
  td.textContent = texto;
  tr.appendChild(td);
  return tr;
}

async function cargarPartidosLiga(idLiga, escudoLiga = "") {
  const listaProximos = document.getElementById("listaProximosPartidosLiga");
  const listaJugados = document.getElementById("listaPartidosJugadosLiga");
  if (!listaProximos && !listaJugados) return;

  try {
    const respuesta = await fetch(`/api/ligas/${encodeURIComponent(idLiga)}/partidos`);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const { proximos = [], jugados = [] } = await respuesta.json();

    if (listaProximos) {
      listaProximos.replaceChildren();
      if (proximos.length > 0) {
        proximos.forEach((partido) => {
          listaProximos.appendChild(crearElementoPartidoLiga(partido, { escudoLiga }));
        });
      } else {
        listaProximos.appendChild(
          crearMensajeLista("No hay partidos próximos programados.")
        );
      }
    }

    if (listaJugados) {
      listaJugados.replaceChildren();
      if (jugados.length > 0) {
        jugados.forEach((partido) => {
          listaJugados.appendChild(crearElementoPartidoLiga(partido, { escudoLiga }));
        });
      } else {
        listaJugados.appendChild(
          crearMensajeLista("No hay resultados jugados registrados.")
        );
      }
    }
  } catch (error) {
    console.warn(`Aviso al cargar partidos de la liga ${idLiga}:`, error);
    if (listaProximos) {
      listaProximos.replaceChildren(
        crearMensajeLista("No fue posible obtener próximos partidos.")
      );
    }
    if (listaJugados) {
      listaJugados.replaceChildren(
        crearMensajeLista("No fue posible obtener partidos jugados.")
      );
    }
  }
}

export async function inicializarLiga() {
  const idLiga = new URLSearchParams(window.location.search).get("id");
  if (!idLiga) return;

  const cuerpoTabla = document.getElementById("cuerpoTablaPosiciones");
  if (cuerpoTabla) {
    cuerpoTabla.replaceChildren(
      crearFilaMensajeTabla("Cargando tabla de posiciones...")
    );
  }

  try {
    const respuesta = await fetch(`/api/ligas/${encodeURIComponent(idLiga)}`);
    if (!respuesta.ok) {
      throw new Error(`Error en la respuesta: ${respuesta.status}`);
    }
    const liga = await respuesta.json();
    renderizarEncabezadoLiga(liga);
    renderizarTablaLiga(liga);
    cargarPartidosLiga(idLiga, liga.escudo || "");
  } catch (error) {
    console.error("Error al renderizar liga:", error);
    if (cuerpoTabla) {
      cuerpoTabla.replaceChildren(
        crearFilaMensajeTabla("No fue posible cargar la liga en este momento.")
      );
    }
  }
}
