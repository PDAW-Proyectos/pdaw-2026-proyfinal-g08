export function normalizarTexto(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
export function normalizarCorreo(correo) {
  return String(correo ?? "")
    .trim()
    .toLowerCase();
}

export function esCorreoValido(correo) {
  const texto = correo?.trim?.();
  return Boolean(
    texto && correo.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto),
  );
}
