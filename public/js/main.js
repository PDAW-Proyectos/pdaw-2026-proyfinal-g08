import { inicializarControlesGenerales } from "/cliente/controlesGenerales.js";
import { inicializarBuscadores } from "/cliente/buscadorEquipos.js";
import { inicializarInicio } from "/cliente/paginaInicio.js";
import { inicializarLigas } from "/cliente/paginaLigas.js";
import { inicializarLiga } from "/cliente/paginaLiga.js";
import { inicializarEquipo } from "/cliente/paginaEquipo.js";
import { inicializarProde } from "/cliente/paginaProde.js";

function iniciarAplicacion() {
  inicializarBuscadores();
  inicializarControlesGenerales();

  const pagina = document.body.dataset.pagina;

  if (pagina === "index" || document.getElementById("contenedorLigas")) {
    inicializarInicio();
  }

  if (pagina === "liga" || document.getElementById("cuerpoTablaPosiciones")) {
    inicializarLiga();
  }

  if (pagina === "equipo" || document.getElementById("tituloEquipo")) {
    inicializarEquipo();
  }

  if (document.querySelectorAll("[data-liga-tabla]").length > 0) {
    inicializarLigas();
  }

  if (pagina === "prode") {
    inicializarProde();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarAplicacion);
} else {
  iniciarAplicacion();
}
