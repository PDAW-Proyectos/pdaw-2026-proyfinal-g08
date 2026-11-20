export function redondearPuntos(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function esPrecioValido(precio) {
  return (
    Number(precio) === precio &&
    precio > 0 &&
    precio <= 1000000 &&
    Math.abs(precio * 100 - Math.round(precio * 100)) < 0.000001
  );
}
