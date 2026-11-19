import {
  crearElemento,
  crearEscudoImg,
  inicialesEquipo,
  fetchJsonSeguro,
  formatearErrorHttp,
} from "./utils.js";

let secuenciaId = 0;

function crearAvatarEscudo(equipo) {
  const contenedor = crearElemento("span", { className: "buscador-opcion-escudo" });
  const agregarIniciales = () => {
    contenedor.appendChild(
      crearElemento("span", {
        className: "buscador-opcion-iniciales",
        textContent: inicialesEquipo(equipo.nombre),
      })
    );
  };

  if (equipo.escudo) {
    const img = crearEscudoImg(equipo.escudo, 28);
    img.onerror = () => {
      img.remove();
      agregarIniciales();
    };
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

  const input = crearElemento("input", {
    className: "buscador-entrada",
    attributes: {
      id: idEntrada,
      type: "search",
      placeholder: "Buscar equipo...",
      autocomplete: "off",
      "aria-label": "Buscar equipo",
      "aria-autocomplete": "list",
      "aria-expanded": "false",
      "aria-controls": idLista,
    },
  });

  const btnLimpiar = crearElemento("button", {
    className: "buscador-limpiar",
    textContent: "×",
    hidden: true,
    attributes: { type: "button", "aria-label": "Limpiar búsqueda" },
  });

  const formulario = crearElemento(
    "div",
    { className: "buscador-equipos-caja", attributes: { role: "search" } },
    [
      crearElemento("label", {
        className: "visually-hidden",
        textContent: "Buscar equipo de fútbol",
        attributes: { for: idEntrada },
      }),
      crearIconoLupa(),
      input,
      btnLimpiar,
    ]
  );

  const lista = crearElemento("div", {
    className: "buscador-resultados",
    hidden: true,
    attributes: { id: idLista, role: "listbox" },
  });

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
    lista.querySelectorAll(".buscador-opcion").forEach((op, idx) => {
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
    lista.replaceChildren(
      crearElemento("div", {
        className: esError ? "buscador-estado buscador-error" : "buscador-estado",
        textContent: mensaje,
      })
    );
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
      const partes = [equipo.nombreLiga, equipo.pais].filter(Boolean);
      const opcion = crearElemento(
        "a",
        {
          className: "buscador-opcion",
          attributes: {
            role: "option",
            "aria-selected": "false",
            href: `equipo.html?id=${encodeURIComponent(equipo.id || equipo.nombre || "")}`,
          },
        },
        [
          crearAvatarEscudo(equipo),
          crearElemento("span", { className: "buscador-opcion-texto" }, [
            crearElemento("strong", {
              className: "buscador-opcion-nombre",
              textContent: equipo.nombre || "Club",
            }),
            crearElemento("small", {
              className: "buscador-opcion-meta",
              textContent: partes.join(" · ") || "Club de fútbol",
            }),
          ]),
        ]
      );
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
      const datos = await fetchJsonSeguro(
        `/api/equipos/buscar?q=${encodeURIComponent(consulta)}`,
        { signal: controlador.signal }
      );
      if (input.value.trim() !== consulta) return;
      ultimaConsulta = consulta;
      renderizarResultados(datos, consulta);
    } catch (err) {
      if (err.name === "AbortError") return;
      mostrarEstado(formatearErrorHttp(err, "No se pudo completar la búsqueda."), true);
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
    if (event.key === "ArrowDown" && opciones.length > 0) {
      event.preventDefault();
      indiceActivo = (indiceActivo + 1) % opciones.length;
      actualizarResaltado();
    } else if (event.key === "ArrowUp" && opciones.length > 0) {
      event.preventDefault();
      indiceActivo = (indiceActivo - 1 + opciones.length) % opciones.length;
      actualizarResaltado();
    } else if (event.key === "Enter" && opciones.length > 0) {
      event.preventDefault();
      const destino = opciones[indiceActivo >= 0 ? indiceActivo : 0];
      if (destino?.href) window.location.href = destino.href;
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
