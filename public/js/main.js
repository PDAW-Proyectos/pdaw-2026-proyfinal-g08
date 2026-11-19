import { fechaAValorEntrada } from "./utils.js";
import { inicializarBuscadores } from "./buscador.js";
import { inicializarAutenticacion } from "./auth.js";
import { inicializarInicio } from "./inicio.js";
import { inicializarLigas, inicializarLiga } from "./ligas.js";
import { inicializarEquipo } from "./equipo.js";

function inicializarControlesGenerales() {
  const fechaLocal = new Date();
  const elemAnio = document.querySelector("#anioActual");
  if (elemAnio) elemAnio.textContent = fechaLocal.getFullYear();

  const entradaFecha = document.querySelector("#fechaPartido");
  if (entradaFecha) {
    entradaFecha.value = fechaAValorEntrada(fechaLocal);
    const desplazar = (dias) => {
      const f = new Date(`${entradaFecha.value}T12:00:00`);
      f.setDate(f.getDate() + dias);
      entradaFecha.value = fechaAValorEntrada(f);
      entradaFecha.dispatchEvent(new Event("change", { bubbles: true }));
    };
    document.querySelector("#diaAnterior")?.addEventListener("click", () => desplazar(-1));
    document.querySelector("#diaSiguiente")?.addEventListener("click", () => desplazar(1));
  }

  const botonesFiltro = document.querySelectorAll("[data-filtro]");
  botonesFiltro.forEach((boton) => {
    boton.addEventListener("click", () => {
      const filtro = boton.dataset.filtro;
      let visibles = 0;
      botonesFiltro.forEach((b) => b.setAttribute("aria-pressed", String(b === boton)));
      document.querySelectorAll(".fila-resultado").forEach((fila) => {
        const visible = filtro === "todos" || fila.dataset.categoria === filtro;
        fila.hidden = !visible;
        if (visible) visibles += 1;
      });
      const vacios = document.querySelector("#resultadosVacios");
      if (vacios) vacios.hidden = visibles > 0;
    });
  });

  const claveFavoritos = "ofsai-favorite-matches";
  let listaFavoritos = [];
  try {
    const guardados = JSON.parse(localStorage.getItem(claveFavoritos) || "[]");
    if (Array.isArray(guardados)) listaFavoritos = guardados;
  } catch {
    listaFavoritos = [];
  }
  const favoritos = new Set(listaFavoritos);
  document.querySelectorAll("[data-favorito]").forEach((boton) => {
    const esFav = favoritos.has(boton.dataset.favorito);
    boton.setAttribute("aria-pressed", String(esFav));
    boton.textContent = esFav ? "★" : "☆";
    boton.addEventListener("click", () => {
      const id = boton.dataset.favorito;
      const activo = boton.getAttribute("aria-pressed") !== "true";
      boton.setAttribute("aria-pressed", String(activo));
      boton.textContent = activo ? "★" : "☆";
      if (activo) favoritos.add(id);
      else favoritos.delete(id);
      try {
        localStorage.setItem(claveFavoritos, JSON.stringify([...favoritos]));
      } catch {
        // Ignora errores de cuota o almacenamiento bloqueado
      }
    });
  });
}

function iniciarAplicacion() {
  inicializarBuscadores();
  inicializarControlesGenerales();
  inicializarAutenticacion();

  const pagina = document.body.dataset.pagina;
  if (pagina === "index" || document.getElementById("contenedorLigas")) inicializarInicio();
  if (pagina === "liga" || document.getElementById("cuerpoTablaPosiciones")) inicializarLiga();
  if (pagina === "equipo" || document.getElementById("tituloEquipo")) inicializarEquipo();
  if (document.querySelectorAll("[data-liga-tabla]").length > 0) inicializarLigas();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarAplicacion);
} else {
  iniciarAplicacion();
}
