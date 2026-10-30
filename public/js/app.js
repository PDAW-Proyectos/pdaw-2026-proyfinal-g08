const fechaPartido = document.querySelector("#fechaPartido");
const anioActual = document.querySelector("#anioActual");

if (fechaPartido) {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  fechaPartido.value = `${anio}-${mes}-${dia}`;
}

if (anioActual) {
  anioActual.textContent = new Date().getFullYear();
}
