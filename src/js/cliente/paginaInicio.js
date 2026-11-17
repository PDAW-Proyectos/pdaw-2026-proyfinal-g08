import { obtenerLigasCompartidas } from "./api.js";
import { crearElementoPartidoInicio } from "./tarjetasPartido.js";

function crearCardLiga(liga) {
  const columna = document.createElement("div");
  columna.className = "col";

  const tarjeta = document.createElement("a");
  tarjeta.href = `liga.html?id=${liga.id}`;
  tarjeta.className = "card shadow-sm text-decoration-none";

  const cuerpo = document.createElement("div");
  cuerpo.className = "card-body p-3 d-flex align-items-center gap-2";

  const escudo = document.createElement("img");
  escudo.className = "flex-shrink-0";
  escudo.width = 43;
  escudo.height = 43;
  escudo.src = liga.escudo || "";
  escudo.alt = `Escudo de ${liga.nombre}`;
  escudo.style.objectFit = "contain";
  escudo.referrerPolicy = "no-referrer";
  escudo.onerror = () => {
    escudo.style.display = "none";
  };

  const informacion = document.createElement("div");
  const nombre = document.createElement("h2");
  nombre.className = "card-title h6 mb-1 text-dark";
  nombre.textContent = liga.nombre;

  const pais = document.createElement("p");
  pais.className = "card-text text-body-secondary mb-0 small";
  pais.textContent = liga.pais;

  informacion.append(nombre, pais);
  cuerpo.append(escudo, informacion);
  tarjeta.append(cuerpo);
  columna.append(tarjeta);

  return columna;
}

async function cargarLigasInicio(contenedorLigas) {
  if (!contenedorLigas) return;
  try {
    const ligas = await obtenerLigasCompartidas();
    contenedorLigas.replaceChildren();
    ligas.forEach((liga) => {
      contenedorLigas.appendChild(crearCardLiga(liga));
    });
  } catch (error) {
    console.error("No se pudieron cargar las ligas:", error);
  }
}

function agruparPartidosPorCompetencia(partidos, ligas = []) {
  const mapaLigas = new Map(ligas.map((liga) => [String(liga.id), liga]));
  const indiceOrden = new Map(ligas.map((liga, idx) => [String(liga.id), idx]));
  const grupos = new Map();

  partidos.forEach((partido) => {
    const idLiga = String(partido.idLiga || "");
    const clave = idLiga || String(partido.nombreLiga || "otras");
    const ligaMeta = idLiga ? mapaLigas.get(idLiga) : null;

    if (!grupos.has(clave)) {
      grupos.set(clave, {
        idLiga,
        nombreLiga: ligaMeta?.nombre || partido.nombreLiga || "Otras competiciones",
        pais: ligaMeta?.pais || "",
        escudo: ligaMeta?.escudo || "",
        partidos: [],
      });
    }
    grupos.get(clave).partidos.push(partido);
  });

  return Array.from(grupos.values()).sort((a, b) => {
    const ordA = indiceOrden.has(a.idLiga) ? indiceOrden.get(a.idLiga) : Number.MAX_SAFE_INTEGER;
    const ordB = indiceOrden.has(b.idLiga) ? indiceOrden.get(b.idLiga) : Number.MAX_SAFE_INTEGER;
    if (ordA !== ordB) return ordA - ordB;
    return a.nombreLiga.localeCompare(b.nombreLiga);
  });
}

const PARTIDOS_VISIBLES_POR_LIGA_INICIO = 3;

function crearBloqueCompetenciaProximos(grupo) {
  const bloque = document.createElement("section");
  bloque.className = "grupo-liga-partidos";
  bloque.setAttribute("aria-label", `Próximos partidos de ${grupo.nombreLiga}`);

  const cabecera = document.createElement("header");
  cabecera.className = "cabecera-grupo-liga";

  const tituloCont = grupo.idLiga ? document.createElement("a") : document.createElement("div");
  tituloCont.className = "grupo-liga-enlace";
  if (grupo.idLiga) {
    tituloCont.href = `liga.html?id=${encodeURIComponent(grupo.idLiga)}`;
    tituloCont.title = `Ver tabla y detalles de ${grupo.nombreLiga}`;
  }

  if (grupo.escudo) {
    const escudoLiga = document.createElement("img");
    escudoLiga.src = grupo.escudo;
    escudoLiga.alt = "";
    escudoLiga.width = 20;
    escudoLiga.height = 20;
    escudoLiga.className = "grupo-liga-escudo";
    escudoLiga.referrerPolicy = "no-referrer";
    escudoLiga.onerror = () => {
      escudoLiga.style.display = "none";
    };
    tituloCont.appendChild(escudoLiga);
  }

  const nombreLiga = document.createElement("strong");
  nombreLiga.className = "grupo-liga-nombre";
  nombreLiga.textContent = grupo.nombreLiga;
  tituloCont.appendChild(nombreLiga);

  if (grupo.pais) {
    const paisLiga = document.createElement("span");
    paisLiga.className = "grupo-liga-pais";
    paisLiga.textContent = `· ${grupo.pais}`;
    tituloCont.appendChild(paisLiga);
  }

  const conteo = document.createElement("span");
  conteo.className = "grupo-liga-conteo";
  conteo.textContent = `${grupo.partidos.length} ${
    grupo.partidos.length === 1 ? "partido" : "partidos"
  }`;

  cabecera.append(tituloCont, conteo);

  const lista = document.createElement("div");
  lista.className = "grupo-liga-lista";
  const tarjetas = grupo.partidos.map((partido, indice) => {
    const tarjeta = crearElementoPartidoInicio(partido, { escudoLiga: grupo.escudo });
    if (indice >= PARTIDOS_VISIBLES_POR_LIGA_INICIO) {
      tarjeta.hidden = true;
    }
    lista.appendChild(tarjeta);
    return tarjeta;
  });

  bloque.append(cabecera, lista);

  if (grupo.partidos.length > PARTIDOS_VISIBLES_POR_LIGA_INICIO) {
    const extras = grupo.partidos.length - PARTIDOS_VISIBLES_POR_LIGA_INICIO;
    let expandido = false;

    const pie = document.createElement("div");
    pie.className = "grupo-liga-pie";

    const botonToggle = document.createElement("button");
    botonToggle.type = "button";
    botonToggle.className = "grupo-liga-toggle";
    botonToggle.setAttribute("aria-expanded", "false");
    botonToggle.textContent = `Mostrar más (+${extras})`;

    botonToggle.addEventListener("click", () => {
      expandido = !expandido;
      tarjetas.forEach((tarjeta, indice) => {
        if (indice >= PARTIDOS_VISIBLES_POR_LIGA_INICIO) {
          tarjeta.hidden = !expandido;
        }
      });
      botonToggle.setAttribute("aria-expanded", String(expandido));
      botonToggle.textContent = expandido
        ? "Mostrar menos"
        : `Mostrar más (+${extras})`;
    });

    pie.appendChild(botonToggle);
    bloque.appendChild(pie);
  }

  return bloque;
}

async function cargarPartidosInicio() {
  const contenedorProximos = document.getElementById("contenedorPartidosProximos");
  const contenedorJugados = document.getElementById("contenedorPartidosJugados");
  if (!contenedorProximos && !contenedorJugados) return;

  let ligasDisponibles = [];
  try {
    ligasDisponibles = await obtenerLigasCompartidas();
  } catch {
    ligasDisponibles = [];
  }

  if (contenedorProximos) {
    try {
      const res = await fetch("/api/partidos/proximos?limite=0");
      if (res.ok) {
        const proximos = await res.json();
        contenedorProximos.replaceChildren();
        if (Array.isArray(proximos) && proximos.length > 0) {
          const grupos = agruparPartidosPorCompetencia(proximos, ligasDisponibles);
          grupos.forEach((grupo) => {
            contenedorProximos.appendChild(crearBloqueCompetenciaProximos(grupo));
          });
        } else {
          const vacio = document.createElement("div");
          vacio.className = "p-3 text-body-secondary small";
          vacio.textContent = "No hay partidos próximos programados.";
          contenedorProximos.appendChild(vacio);
        }
      }
    } catch (err) {
      console.warn("Aviso al cargar próximos partidos de inicio:", err);
    }
  }

  if (contenedorJugados) {
    try {
      const res = await fetch("/api/partidos/jugados?limite=6");
      if (res.ok) {
        const jugados = await res.json();
        contenedorJugados.replaceChildren();
        if (Array.isArray(jugados) && jugados.length > 0) {
          jugados.forEach((partido) => {
            contenedorJugados.appendChild(crearElementoPartidoInicio(partido));
          });
        } else {
          const vacio = document.createElement("div");
          vacio.className = "p-3 text-body-secondary small";
          vacio.textContent = "No hay resultados recientes disponibles.";
          contenedorJugados.appendChild(vacio);
        }
      }
    } catch (err) {
      console.warn("Aviso al cargar partidos jugados de inicio:", err);
    }
  }
}

export function inicializarInicio() {
  const contenedorLigas = document.getElementById("contenedorLigas");
  cargarLigasInicio(contenedorLigas);
  cargarPartidosInicio();
}
