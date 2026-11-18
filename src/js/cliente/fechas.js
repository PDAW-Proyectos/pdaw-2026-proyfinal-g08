export function fechaAValorEntrada(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function sumarDiasAFecha(fechaBase = new Date(), dias = 0) {
  const fecha = new Date(
    fechaBase.getFullYear(),
    fechaBase.getMonth(),
    fechaBase.getDate() + dias,
  );
  return fechaAValorEntrada(fecha);
}

export function extraerClaveFechaPartido(partido) {
  if (!partido) return "";
  const fechaTexto = String(partido.fecha || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) {
    if (partido.hora) {
      const fechaConHora = new Date(
        `${fechaTexto}T${String(partido.hora).trim()}`,
      );
      if (!Number.isNaN(fechaConHora.getTime())) {
        return fechaAValorEntrada(fechaConHora);
      }
    }
    return fechaTexto;
  }

  const ts = String(partido.timestamp || "").trim();
  if (ts) {
    const fechaTs = new Date(ts);
    if (!Number.isNaN(fechaTs.getTime())) {
      return fechaAValorEntrada(fechaTs);
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(ts)) {
      return ts.slice(0, 10);
    }
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
  const limpio = String(nombre || "").trim();
  if (!limpio) return "EQ";
  const partes = limpio.split(/\s+/).filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0] || ""}${partes[1][0] || ""}`.toUpperCase();
}
