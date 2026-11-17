import { fechaAValorEntrada } from "./fechas.js";

function inicializarControlesFecha() {
  const fechaLocal = new Date();
  const elemAnio = document.querySelector("#anioActual");
  if (elemAnio) elemAnio.textContent = fechaLocal.getFullYear();

  const entradaFecha = document.querySelector("#fechaPartido");
  if (!entradaFecha) return;

  entradaFecha.value = fechaAValorEntrada(fechaLocal);

  const desplazarFecha = (cantidad) => {
    const fechaSeleccionada = new Date(`${entradaFecha.value}T12:00:00`);
    fechaSeleccionada.setDate(fechaSeleccionada.getDate() + cantidad);
    entradaFecha.value = fechaAValorEntrada(fechaSeleccionada);
    entradaFecha.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const btnAnt = document.querySelector("#diaAnterior");
  const btnSig = document.querySelector("#diaSiguiente");
  if (btnAnt) btnAnt.addEventListener("click", () => desplazarFecha(-1));
  if (btnSig) btnSig.addEventListener("click", () => desplazarFecha(1));
}

function inicializarFiltrosResultados() {
  const botonesFiltro = document.querySelectorAll("[data-filtro]");
  if (botonesFiltro.length === 0) return;

  botonesFiltro.forEach((boton) => {
    boton.addEventListener("click", () => {
      const filtroSeleccionado = boton.dataset.filtro;
      let resultadosVisibles = 0;

      botonesFiltro.forEach((b) => {
        b.setAttribute("aria-pressed", String(b === boton));
      });

      document.querySelectorAll(".fila-resultado").forEach((fila) => {
        const estaVisible =
          filtroSeleccionado === "todos" || fila.dataset.categoria === filtroSeleccionado;
        fila.hidden = !estaVisible;
        if (estaVisible) resultadosVisibles += 1;
      });

      const vacios = document.querySelector("#resultadosVacios");
      if (vacios) vacios.hidden = resultadosVisibles > 0;
    });
  });
}

function inicializarFavoritos() {
  const botones = document.querySelectorAll("[data-favorito]");
  if (botones.length === 0) return;

  const claveFavoritos = "ofsai-favorite-matches";
  const favoritosGuardados = new Set(
    JSON.parse(localStorage.getItem(claveFavoritos) || "[]")
  );

  botones.forEach((boton) => {
    const esFavorito = favoritosGuardados.has(boton.dataset.favorito);
    boton.setAttribute("aria-pressed", String(esFavorito));
    boton.textContent = esFavorito ? "★" : "☆";
    boton.addEventListener("click", () => {
      const idPartido = boton.dataset.favorito;
      const seleccionado = boton.getAttribute("aria-pressed") !== "true";

      boton.setAttribute("aria-pressed", String(seleccionado));
      boton.textContent = seleccionado ? "★" : "☆";
      if (seleccionado) {
        favoritosGuardados.add(idPartido);
      } else {
        favoritosGuardados.delete(idPartido);
      }
      localStorage.setItem(claveFavoritos, JSON.stringify([...favoritosGuardados]));
    });
  });
}

export function inicializarControlesGenerales() {
  inicializarControlesFecha();
  inicializarFiltrosResultados();
  inicializarFavoritos();
}
