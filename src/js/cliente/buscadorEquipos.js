import { inicialesEquipo } from "./fechas.js";

let secuenciaId = 0;

function crearAvatarEscudo(equipo) {
  const contenedor = document.createElement("span");
  contenedor.className = "buscador-opcion-escudo";

  const agregarIniciales = () => {
    const fallback = document.createElement("span");
    fallback.className = "buscador-opcion-iniciales";
    fallback.textContent = inicialesEquipo(equipo.nombre);
    contenedor.appendChild(fallback);
  };

  if (equipo.escudo) {
    const img = document.createElement("img");
    img.src = equipo.escudo;
    img.alt = "";
    img.width = 28;
    img.height = 28;
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => {
      img.remove();
      agregarIniciales();
    });
    contenedor.appendChild(img);
  } else {
    agregarIniciales();
  }

  return contenedor;
}

function crearIconoLupa() {
  const icono = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icono.setAttribute("viewBox", "0 0 24 24");
  icono.setAttribute("width", "16");
  icono.setAttribute("height", "16");
  icono.setAttribute("aria-hidden", "true");
  icono.classList.add("buscador-icono");

  const trazo = document.createElementNS("http://www.w3.org/2000/svg", "path");
  trazo.setAttribute("fill", "none");
  trazo.setAttribute("stroke", "currentColor");
  trazo.setAttribute("stroke-width", "2");
  trazo.setAttribute("stroke-linecap", "round");
  trazo.setAttribute("stroke-linejoin", "round");
  trazo.setAttribute("d", "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 4 4");
  icono.appendChild(trazo);
  return icono;
}

export function montarBuscador(contenedor) {
  if (!contenedor || contenedor.dataset.buscadorMontado === "1") return;
  contenedor.dataset.buscadorMontado = "1";

  secuenciaId += 1;
  const idLista = `resultadosBuscadorEquipos-${secuenciaId}`;
  const idEntrada = `entradaBuscadorEquipos-${secuenciaId}`;

  const formulario = document.createElement("div");
  formulario.className = "buscador-equipos-caja";
  formulario.setAttribute("role", "search");

  const etiqueta = document.createElement("label");
  etiqueta.className = "visually-hidden";
  etiqueta.setAttribute("for", idEntrada);
  etiqueta.textContent = "Buscar equipo de fútbol";

  const input = document.createElement("input");
  input.id = idEntrada;
  input.type = "search";
  input.className = "buscador-entrada";
  input.placeholder = "Buscar equipo...";
  input.autocomplete = "off";
  input.setAttribute("aria-label", "Buscar equipo");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", idLista);

  const btnLimpiar = document.createElement("button");
  btnLimpiar.type = "button";
  btnLimpiar.className = "buscador-limpiar";
  btnLimpiar.setAttribute("aria-label", "Limpiar búsqueda");
  btnLimpiar.textContent = "×";
  btnLimpiar.hidden = true;

  const lista = document.createElement("div");
  lista.id = idLista;
  lista.className = "buscador-resultados";
  lista.setAttribute("role", "listbox");
  lista.hidden = true;

  formulario.append(etiqueta, crearIconoLupa(), input, btnLimpiar);
  contenedor.replaceChildren(formulario, lista);

  let temporizador = null;
  let controlador = null;
  let indiceActivo = -1;
  let ultimaConsulta = "";

  const abrirLista = () => {
    lista.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  const actualizarResaltado = () => {
    const opciones = lista.querySelectorAll(".buscador-opcion");
    opciones.forEach((op, idx) => {
      const activa = idx === indiceActivo;
      op.classList.toggle("activa", activa);
      op.setAttribute("aria-selected", String(activa));
      if (activa) op.scrollIntoView({ block: "nearest" });
    });
  };

  const cerrarLista = () => {
    lista.hidden = true;
    input.setAttribute("aria-expanded", "false");
    indiceActivo = -1;
    actualizarResaltado();
  };

  const mostrarEstado = (mensaje, esError = false) => {
    lista.replaceChildren();
    const div = document.createElement("div");
    div.className = esError ? "buscador-estado buscador-error" : "buscador-estado";
    div.textContent = mensaje;
    lista.appendChild(div);
    abrirLista();
  };

  const renderizarResultados = (equipos, consulta) => {
    const resultados = Array.isArray(equipos) ? equipos : [];
    indiceActivo = -1;
    lista.replaceChildren();

    if (resultados.length === 0) {
      mostrarEstado(`No se encontraron equipos para "${consulta}".`);
      return;
    }

    resultados.forEach((equipo, idx) => {
      const opcion = document.createElement("a");
      opcion.className = "buscador-opcion";
      opcion.setAttribute("role", "option");
      opcion.setAttribute("aria-selected", "false");
      opcion.href = `equipo.html?id=${encodeURIComponent(equipo.id || equipo.nombre || "")}`;

      const textos = document.createElement("span");
      textos.className = "buscador-opcion-texto";

      const nombre = document.createElement("strong");
      nombre.className = "buscador-opcion-nombre";
      nombre.textContent = equipo.nombre || "Club";

      const meta = document.createElement("small");
      meta.className = "buscador-opcion-meta";
      const partes = [equipo.nombreLiga, equipo.pais].filter(Boolean);
      meta.textContent = partes.join(" · ") || "Club de fútbol";

      textos.append(nombre, meta);
      opcion.append(crearAvatarEscudo(equipo), textos);

      opcion.addEventListener("mouseenter", () => {
        indiceActivo = idx;
        actualizarResaltado();
      });

      lista.appendChild(opcion);
    });

    abrirLista();
  };

  const ejecutarBusqueda = async (termino) => {
    const consulta = termino.trim();
    if (consulta.length < 2) {
      cerrarLista();
      return;
    }

    if (controlador) controlador.abort();
    controlador = new AbortController();

    mostrarEstado("Buscando equipos...");
    try {
      const res = await fetch(
        `/api/equipos/buscar?q=${encodeURIComponent(consulta)}`,
        { signal: controlador.signal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const datos = await res.json();
      if (input.value.trim() !== consulta) return;
      ultimaConsulta = consulta;
      renderizarResultados(datos, consulta);
    } catch (err) {
      if (err.name === "AbortError") return;
      mostrarEstado("No se pudo completar la búsqueda en este momento.", true);
    }
  };

  input.addEventListener("input", () => {
    const valor = input.value;
    btnLimpiar.hidden = valor.length === 0;
    clearTimeout(temporizador);

    const limpio = valor.trim();
    if (limpio.length < 2) {
      if (controlador) controlador.abort();
      cerrarLista();
      return;
    }

    temporizador = setTimeout(() => ejecutarBusqueda(limpio), 260);
  });

  input.addEventListener("focus", () => {
    const limpio = input.value.trim();
    if (limpio.length >= 2 && limpio === ultimaConsulta && lista.children.length > 0) {
      abrirLista();
    }
  });

  input.addEventListener("keydown", (event) => {
    if (lista.hidden && event.key !== "Enter") return;

    const opciones = lista.querySelectorAll(".buscador-opcion");
    if (event.key === "ArrowDown") {
      if (opciones.length === 0) return;
      event.preventDefault();
      indiceActivo = (indiceActivo + 1) % opciones.length;
      actualizarResaltado();
    } else if (event.key === "ArrowUp") {
      if (opciones.length === 0) return;
      event.preventDefault();
      indiceActivo = (indiceActivo - 1 + opciones.length) % opciones.length;
      actualizarResaltado();
    } else if (event.key === "Enter") {
      if (opciones.length > 0) {
        event.preventDefault();
        const destino = opciones[indiceActivo >= 0 ? indiceActivo : 0];
        if (destino?.href) window.location.href = destino.href;
      }
    } else if (event.key === "Escape") {
      cerrarLista();
    }
  });

  btnLimpiar.addEventListener("click", () => {
    input.value = "";
    btnLimpiar.hidden = true;
    ultimaConsulta = "";
    if (controlador) controlador.abort();
    cerrarLista();
    input.focus();
  });

  document.addEventListener("click", (event) => {
    if (!contenedor.contains(event.target)) cerrarLista();
  });
}

export function inicializarBuscadores() {
  document.querySelectorAll("[data-buscador-equipos]").forEach(montarBuscador);
}
