import { obtenerLigasCompartidas } from "./api.js";

const ALIAS_LIGAS = {
  premierleague: "4328",
  laliga: "4335",
  bundesliga: "4331",
  seriea: "4332",
  ligue1: "4334",
};

function normalizarClaveLiga(valor) {
  return String(valor || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function encontrarLigaParaTarjeta(ligas, idTermino) {
  const idNorm = normalizarClaveLiga(idTermino);
  return ligas.find((liga) => {
    if (String(liga.id) === String(idTermino)) return true;
    const nombreNorm = normalizarClaveLiga(liga.nombre);
    if (nombreNorm && idNorm && (nombreNorm.includes(idNorm) || idNorm.includes(nombreNorm))) {
      return true;
    }
    return ALIAS_LIGAS[idNorm] === String(liga.id);
  });
}

function crearFilaMensajeTabla(texto) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 4;
  td.className = "text-center text-body-secondary small py-2";
  td.textContent = texto;
  tr.appendChild(td);
  return tr;
}

function renderizarFilasTabla(tbody, tabla) {
  if (!tbody || !Array.isArray(tabla) || tabla.length === 0) return;
  tbody.replaceChildren();
  tabla.forEach((pos) => {
    const tr = document.createElement("tr");

    const thPos = document.createElement("th");
    thPos.scope = "row";
    thPos.className = "text-center";
    thPos.textContent = pos.posicion ?? "—";

    const tdEquipo = document.createElement("td");
    const enlaceEquipo = document.createElement("a");
    enlaceEquipo.href = `equipo.html?id=${encodeURIComponent(pos.idEquipo || pos.nombreEquipo)}`;
    enlaceEquipo.className =
      "d-flex align-items-center gap-2 text-decoration-none text-dark hover-underline";

    if (pos.escudoEquipo) {
      const img = document.createElement("img");
      img.src = pos.escudoEquipo;
      img.alt = "";
      img.width = 22;
      img.height = 22;
      img.style.objectFit = "contain";
      img.referrerPolicy = "no-referrer";
      img.onerror = () => {
        img.style.display = "none";
      };
      enlaceEquipo.appendChild(img);
    }

    const nombreEquipo = document.createElement("span");
    nombreEquipo.className = "text-truncate";
    nombreEquipo.textContent = pos.nombreEquipo ?? "Equipo";
    enlaceEquipo.appendChild(nombreEquipo);
    tdEquipo.appendChild(enlaceEquipo);

    const tdJugados = document.createElement("td");
    tdJugados.className = "text-center";
    tdJugados.textContent = pos.partidosJugados ?? "0";

    const tdPuntos = document.createElement("td");
    tdPuntos.className = "text-center fw-bold";
    tdPuntos.textContent = pos.puntos ?? "0";

    tr.append(thPos, tdEquipo, tdJugados, tdPuntos);
    tbody.appendChild(tr);
  });
}

export async function inicializarLigas() {
  try {
    const ligas = await obtenerLigasCompartidas();
    if (!Array.isArray(ligas)) return;

    document
      .querySelectorAll(".tarjeta-detalle-liga[data-liga-id]")
      .forEach((articulo) => {
        const liga = encontrarLigaParaTarjeta(ligas, articulo.dataset.ligaId);
        if (!liga) return;

        const elemTitulo = articulo.querySelector('[data-liga-field="nombre"]');
        if (elemTitulo && !elemTitulo.querySelector("a")) {
          const textoOriginal = elemTitulo.textContent;
          const enlaceLiga = document.createElement("a");
          enlaceLiga.href = `liga.html?id=${encodeURIComponent(liga.id)}`;
          enlaceLiga.className = "text-decoration-none text-dark";
          enlaceLiga.textContent = textoOriginal;
          elemTitulo.replaceChildren(enlaceLiga);
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
          renderizarFilasTabla(tbody, liga.tabla);
        }

        const detailsEl = articulo.querySelector("details.tabla-liga");
        if (detailsEl && tbody) {
          detailsEl.addEventListener("toggle", async () => {
            if (!detailsEl.open || tbody.children.length > 0) return;
            tbody.replaceChildren(crearFilaMensajeTabla("Cargando tabla..."));
            try {
              const resLiga = await fetch(`/api/ligas/${encodeURIComponent(liga.id)}`);
              if (!resLiga.ok) throw new Error(`HTTP ${resLiga.status}`);
              const ligaDetalle = await resLiga.json();
              if (Array.isArray(ligaDetalle.tabla) && ligaDetalle.tabla.length > 0) {
                renderizarFilasTabla(tbody, ligaDetalle.tabla);
              } else {
                tbody.replaceChildren(crearFilaMensajeTabla("Sin datos de tabla disponibles."));
              }
            } catch (err) {
              console.warn(`Aviso al cargar tabla de liga ${liga.id}:`, err);
              tbody.replaceChildren(crearFilaMensajeTabla("No se pudo cargar la tabla."));
            }
          });
        }
      });
  } catch (error) {
    console.error("Error al cargar tablas en ligas.html:", error);
  }
}
