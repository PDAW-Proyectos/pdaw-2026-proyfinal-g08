let mapaLigasPorId = new Map();
let promesaLigas = null;

export async function obtenerLigasCompartidas() {
  if (promesaLigas) return promesaLigas;

  promesaLigas = (async () => {
    const datos = await fetchJsonSeguro("/api/ligas");
    const lista = Array.isArray(datos) ? datos : [];
    mapaLigasPorId = new Map(lista.map((liga) => [String(liga.id), liga]));
    return lista;
  })();

  try {
    return await promesaLigas;
  } catch (error) {
    promesaLigas = null;
    throw error;
  }
}

export function obtenerEscudoLiga(idLiga) {
  return idLiga ? mapaLigasPorId.get(String(idLiga))?.escudo || "" : "";
}

export function fechaAValorEntrada(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function sumarDiasAFecha(fechaBase = new Date(), dias = 0) {
  return fechaAValorEntrada(
    new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate() + dias)
  );
}

export function extraerClaveFechaPartido(partido) {
  if (!partido) return "";
  const fechaTexto = String(partido.fecha || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) {
    if (partido.hora) {
      const fechaConHora = new Date(`${fechaTexto}T${String(partido.hora).trim()}`);
      if (!Number.isNaN(fechaConHora.getTime())) return fechaAValorEntrada(fechaConHora);
    }
    return fechaTexto;
  }

  const ts = String(partido.timestamp || "").trim();
  if (ts) {
    const fechaTs = new Date(ts);
    if (!Number.isNaN(fechaTs.getTime())) return fechaAValorEntrada(fechaTs);
    if (/^\d{4}-\d{2}-\d{2}/.test(ts)) return ts.slice(0, 10);
  }
  return "";
}

export function formatearFechaPartido(fechaStr, horaStr) {
  if (!fechaStr) return "";
  try {
    const fecha = new Date(`${fechaStr}T${horaStr || "00:00:00"}`);
    if (Number.isNaN(fecha.getTime())) return fechaStr;
    const formateada = fecha.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return formateada.charAt(0).toUpperCase() + formateada.slice(1);
  } catch {
    return fechaStr;
  }
}

export function formatearFechaLarga(fechaStr) {
  if (!fechaStr) return "Fecha por confirmar";
  try {
    const fecha = new Date(`${fechaStr}T12:00:00`);
    if (Number.isNaN(fecha.getTime())) return fechaStr;
    const formateada = fecha.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return formateada.charAt(0).toUpperCase() + formateada.slice(1);
  } catch {
    return fechaStr;
  }
}

export function formatearHora(horaStr) {
  if (!horaStr) return "";
  const limpia = String(horaStr).trim();
  return limpia.length >= 5 ? limpia.slice(0, 5) : limpia;
}

export function inicialesEquipo(nombre) {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "EQ";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0] || ""}${partes[1][0] || ""}`.toUpperCase();
}

export function crearElemento(tag, opciones = {}, hijos = []) {
  const el = document.createElement(tag);
  if (opciones.className) el.className = opciones.className;
  if (opciones.textContent !== undefined) el.textContent = opciones.textContent;
  if (opciones.hidden) el.hidden = true;
  if (opciones.attributes) {
    Object.entries(opciones.attributes).forEach(([clave, valor]) => {
      if (valor !== undefined && valor !== null) {
        el.setAttribute(clave, String(valor));
      }
    });
  }
  hijos.forEach((hijo) => {
    if (hijo !== null && hijo !== undefined) el.append(hijo);
  });
  return el;
}

export function crearEscudoImg(url, size, clase = "", alt = "") {
  const img = document.createElement("img");
  img.src = url;
  img.alt = alt;
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

export function crearMensaje(texto, clase = "p-3 text-body-secondary small text-center") {
  return crearElemento("div", { className: clase, textContent: texto });
}

export function paginarElementos(elementos = [], pagina = 1, porPagina = 6) {
  const lista = Array.isArray(elementos) ? elementos : [];
  const tam = Math.max(1, Number(porPagina) || 6);
  const totalElementos = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(totalElementos / tam));
  const paginaActual = Math.min(Math.max(1, Number(pagina) || 1), totalPaginas);
  const inicio = (paginaActual - 1) * tam;
  const fin = inicio + tam;

  return {
    items: lista.slice(inicio, fin),
    paginaActual,
    totalPaginas,
    totalElementos,
    desde: totalElementos === 0 ? 0 : inicio + 1,
    hasta: Math.min(fin, totalElementos),
  };
}

export function calcularPaginasVisibles(paginaActual, totalPaginas) {
  if (totalPaginas <= 5) {
    return Array.from({ length: totalPaginas }, (_, idx) => idx + 1);
  }
  const paginas = new Set([1, totalPaginas, paginaActual - 1, paginaActual, paginaActual + 1]);
  const ordenadas = [...paginas]
    .filter((p) => p >= 1 && p <= totalPaginas)
    .sort((a, b) => a - b);

  const resultado = [];
  ordenadas.forEach((p, idx) => {
    if (idx > 0 && p - ordenadas[idx - 1] > 1) resultado.push("...");
    resultado.push(p);
  });
  return resultado;
}

export function formatearErrorHttp(error, respaldo = "No se pudo completar la solicitud.") {
  if (!error) return respaldo;
  const mensajeBase = String(error.message || respaldo).trim();
  if (error.status === 0) return mensajeBase;
  if (Number.isInteger(error.status) && error.status >= 400) {
    return /^Error \d{3}:/i.test(mensajeBase)
      ? mensajeBase
      : `Error ${error.status}: ${mensajeBase}`;
  }
  return mensajeBase || respaldo;
}

export async function fetchJsonSeguro(url, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(url, opciones);
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    const errRed = new Error("Error de conexión: No se pudo comunicar con el servidor.");
    errRed.status = 0;
    throw errRed;
  }

  if (respuesta.status === 204) return null;

  const texto = await respuesta.text();
  let datos = null;
  let jsonValido = true;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      jsonValido = false;
    }
  }

  if (!respuesta.ok) {
    const causa =
      datos?.error ||
      (respuesta.status >= 500
        ? "Ocurrió un error interno del servidor."
        : "No se pudo completar la solicitud.");
    const errHttp = new Error(
      /^Error \d{3}:/i.test(causa) ? causa : `Error ${respuesta.status}: ${causa}`
    );
    errHttp.status = respuesta.status;
    errHttp.code = datos?.code || null;
    throw errHttp;
  }

  if (texto && !jsonValido) {
    const errFormato = new Error("Error 502: La respuesta del servidor no tiene formato JSON válido.");
    errFormato.status = 502;
    throw errFormato;
  }

  return datos;
}

export function crearAvisoError(
  error,
  { onReintentar = null, textoReintentar = "Reintentar", centrado = false } = {}
) {
  const hijos = [
    crearElemento("p", {
      className: "estado-error-texto",
      textContent: formatearErrorHttp(error),
    }),
  ];
  if (typeof onReintentar === "function") {
    const boton = crearElemento("button", {
      className: "grupo-liga-toggle",
      textContent: textoReintentar,
      attributes: { type: "button" },
    });
    boton.addEventListener("click", onReintentar);
    hijos.push(boton);
  }
  return crearElemento(
    "div",
    {
      className: `estado-error-bloque${centrado ? " estado-error-centrado" : ""}`,
      attributes: { role: "alert" },
    },
    hijos
  );
}
