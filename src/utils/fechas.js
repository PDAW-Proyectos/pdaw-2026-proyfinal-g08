export const esperar = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function parsearFechaUTC(fecha, hora = "", timestamp = "") {
  if (timestamp) {
    const ts =
      String(timestamp).includes("Z") || String(timestamp).includes("+")
        ? timestamp
        : `${timestamp}Z`;
    const d = new Date(ts);
    const ms = d.getTime();
    if (ms === ms) return d;
  }
  if (fecha) {
    const d = new Date(`${fecha}T${hora || "00:00:00"}Z`);
    const ms = d.getTime();
    if (ms === ms) return d;
  }
  return null;
}

export function tiempoPartidoMs(partido) {
  const fecha = parsearFechaUTC(
    partido?.fecha,
    partido?.hora,
    partido?.timestamp,
  );
  return fecha ? fecha.getTime() : 0;
}

export const compararFechaAsc = (a, b) =>
  tiempoPartidoMs(a) - tiempoPartidoMs(b);
export const compararFechaDesc = (a, b) =>
  tiempoPartidoMs(b) - tiempoPartidoMs(a);
