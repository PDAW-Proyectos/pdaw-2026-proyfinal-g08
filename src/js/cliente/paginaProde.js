// Los pronósticos quedan en este navegador y se identifican por partido.
const CLAVE_PRONOSTICOS = "orsai-prode-pronosticos";

function leerPronosticos() {
  const guardados = localStorage.getItem(CLAVE_PRONOSTICOS);
  if (!guardados) return {};

  const datos = JSON.parse(guardados);
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    throw new Error("El formato de los pronósticos guardados no es válido.");
  }
  return datos;
}

function crearEquipo(nombre, escudo, etiqueta, id) {
  const equipo = document.createElement("div");
  equipo.className = "prode-equipo";

  if (escudo) {
    const imagen = document.createElement("img");
    imagen.src = escudo;
    imagen.alt = "";
    imagen.referrerPolicy = "no-referrer";
    imagen.addEventListener("error", () => imagen.remove(), { once: true });
    equipo.appendChild(imagen);
  }

  const nombreEquipo = document.createElement("span");
  nombreEquipo.id = id;
  nombreEquipo.textContent = nombre || "Equipo por confirmar";
  equipo.appendChild(nombreEquipo);
  equipo.setAttribute("aria-label", `${etiqueta}: ${nombreEquipo.textContent}`);
  return equipo;
}

function formatearFecha(partido) {
  const valor = partido.timestamp || (
    partido.fecha ? `${partido.fecha}T${partido.hora || "00:00:00"}` : ""
  );
  const fecha = valor ? new Date(valor) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return "Fecha por confirmar";

  return new Intl.DateTimeFormat("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

function crearEntradaGoles(etiqueta, id, valor) {
  const entrada = document.createElement("input");
  entrada.className = "prode-goles";
  entrada.id = id;
  entrada.type = "number";
  entrada.min = "0";
  entrada.max = "99";
  entrada.step = "1";
  entrada.inputMode = "numeric";
  entrada.required = true;
  entrada.autocomplete = "off";
  entrada.dataset.prodeMarcador = "";
  entrada.value = Number.isInteger(valor) && valor >= 0 && valor <= 99
    ? String(valor)
    : "";
  entrada.setAttribute("aria-label", `Goles ${etiqueta}`);
  return entrada;
}

function crearTarjetaPartido(partido, indice, guardados) {
  const idPartido = String(partido.id ?? `partido-${indice}`);
  const pronostico = guardados[idPartido] || {};
  const idSeguro = `prode-${indice}`;
  const tarjeta = document.createElement("article");
  tarjeta.className = "prode-partido";

  const cabecera = document.createElement("div");
  cabecera.className = "prode-partido-cabecera";
  const competicion = document.createElement("span");
  competicion.textContent = partido.nombreLiga || "Fútbol";
  const fecha = document.createElement("time");
  fecha.textContent = formatearFecha(partido);
  if (partido.timestamp) fecha.dateTime = partido.timestamp;
  cabecera.append(competicion, fecha);

  const filaPartido = document.createElement("div");
  filaPartido.className = "prode-partido-fila";
  // Los equipos quedan en los extremos y los dos marcadores en el centro.
  filaPartido.append(
    crearEquipo(
      partido.nombreEquipoLocal,
      partido.escudoEquipoLocal,
      "Local",
      `${idSeguro}-local`,
    ),
    crearEntradaGoles(
      partido.nombreEquipoLocal || "local",
      `${idSeguro}-goles-local`,
      pronostico.golesLocal,
    ),
  );

  const separador = document.createElement("span");
  separador.className = "prode-vs";
  separador.setAttribute("aria-hidden", "true");
  separador.textContent = "VS";
  filaPartido.append(
    separador,
    crearEntradaGoles(
      partido.nombreEquipoVisitante || "visitante",
      `${idSeguro}-goles-visitante`,
      pronostico.golesVisitante,
    ),
    crearEquipo(
      partido.nombreEquipoVisitante,
      partido.escudoEquipoVisitante,
      "Visitante",
      `${idSeguro}-visitante`,
    ),
  );

  const idEntradaPartido = document.createElement("input");
  idEntradaPartido.type = "hidden";
  idEntradaPartido.name = "partido";
  idEntradaPartido.value = idPartido;
  idEntradaPartido.dataset.prodeId = "";
  tarjeta.append(cabecera, filaPartido, idEntradaPartido);
  return tarjeta;
}

function actualizarConteo(contenedor, etiqueta) {
  const total = contenedor.querySelectorAll("[data-prode-id]").length;
  // Cuenta un partido solo cuando ambos campos de goles están completos.
  const cargados = Array.from(contenedor.querySelectorAll("[data-prode-id]"))
    .filter((entrada) => {
      const tarjeta = entrada.closest(".prode-partido");
      return Array.from(tarjeta.querySelectorAll("[data-prode-marcador]"))
        .every((marcador) => marcador.value !== "");
    }).length;
  etiqueta.textContent = `${cargados} de ${total} pronósticos cargados`;
}

function validarMarcadores(contenedor, estado) {
  const marcadores = Array.from(
    contenedor.querySelectorAll("[data-prode-marcador]"),
  );
  const invalidos = marcadores.filter((marcador) => !marcador.validity.valid);
  const vacios = invalidos.filter((marcador) => marcador.value === "");

  marcadores.forEach((marcador) => {
    const invalido = invalidos.includes(marcador);
    marcador.classList.toggle("prode-goles-invalido", invalido);
    if (invalido) {
      marcador.setAttribute("aria-invalid", "true");
    } else {
      marcador.removeAttribute("aria-invalid");
    }
  });

  if (vacios.length > 0) {
    estado.textContent =
      `Faltan ${vacios.length} campos de goles. Completa los inputs resaltados en rojo.`;
  } else if (invalidos.length > 0) {
    estado.textContent =
      "Revisa los marcadores resaltados: deben ser números enteros entre 0 y 99.";
  } else {
    estado.textContent =
      "Marcadores completos. Guarda para confirmar tus pronósticos.";
  }

  return invalidos;
}

export async function inicializarProde() {
  const formulario = document.getElementById("prodeFormulario");
  const lista = document.getElementById("listaProde");
  const estado = document.getElementById("prodeEstado");
  const acciones = document.getElementById("prodeAcciones");
  const etiquetaConteo = document.getElementById("prodeConteo");
  const botonBorrar = document.getElementById("prodeBorrar");
  if (!formulario || !lista || !estado || !acciones || !etiquetaConteo || !botonBorrar) return;

  formulario.noValidate = true;
  let guardados = {};
  let errorLecturaPronosticos = false;
  try {
    guardados = leerPronosticos();
  } catch (error) {
    console.error("No se pudieron leer los pronósticos guardados:", error);
    errorLecturaPronosticos = true;
  }

  try {
    const respuesta = await fetch("/api/partidos/proximos?limite=10&liga=4328");
    if (!respuesta.ok) {
      throw new Error(`Error al cargar partidos: ${respuesta.status}`);
    }
    const partidos = await respuesta.json();
    if (!Array.isArray(partidos)) {
      throw new Error("La respuesta de partidos no tiene el formato esperado.");
    }

    lista.replaceChildren();
    if (partidos.length === 0) {
      estado.textContent = errorLecturaPronosticos
        ? "No se pudieron recuperar tus pronósticos guardados y no hay próximos partidos disponibles."
        : "No hay próximos partidos disponibles para pronosticar.";
      etiquetaConteo.textContent = "0 pronósticos cargados";
      return;
    }

    partidos.forEach((partido, indice) => {
      lista.appendChild(crearTarjetaPartido(partido, indice, guardados));
    });
    estado.textContent = errorLecturaPronosticos
      ? "No se pudieron recuperar tus pronósticos guardados. Puedes cargar nuevos y guardarlos para reemplazarlos."
      : "Completa un marcador para cada partido y guarda tus pronósticos.";
    acciones.hidden = false;
    actualizarConteo(lista, etiquetaConteo);
    let intentoGuardar = false;
    lista.addEventListener("input", () => {
      actualizarConteo(lista, etiquetaConteo);
      if (intentoGuardar) validarMarcadores(lista, estado);
    });

    formulario.addEventListener("submit", (evento) => {
      evento.preventDefault();
      intentoGuardar = true;
      const invalidos = validarMarcadores(lista, estado);
      if (invalidos.length > 0) {
        invalidos[0].focus();
        return;
      }

      const nuevosPronosticos = {};
      lista.querySelectorAll("[data-prode-id]").forEach((entrada) => {
        const tarjeta = entrada.closest(".prode-partido");
        const marcadores = tarjeta.querySelectorAll("[data-prode-marcador]");
        // El ID del partido permite recuperar después el pronóstico correcto.
        nuevosPronosticos[entrada.value] = {
          golesLocal: Number(marcadores[0].value),
          golesVisitante: Number(marcadores[1].value),
        };
      });

      try {
        localStorage.setItem(CLAVE_PRONOSTICOS, JSON.stringify(nuevosPronosticos));
        guardados = nuevosPronosticos;
        estado.textContent = "¡Pronósticos guardados en este navegador!";
      } catch (error) {
        console.error("No se pudieron guardar los pronósticos:", error);
        estado.textContent =
          "No se pudieron guardar los pronósticos. Comprueba el espacio disponible en el navegador.";
      }
    });

    botonBorrar.addEventListener("click", () => {
      if (!window.confirm("¿Quieres borrar todos tus pronósticos guardados?")) return;
      try {
        localStorage.removeItem(CLAVE_PRONOSTICOS);
        guardados = {};
        lista.querySelectorAll("[data-prode-marcador]").forEach((entrada) => {
          entrada.value = "";
          entrada.classList.remove("prode-goles-invalido");
          entrada.removeAttribute("aria-invalid");
        });
        intentoGuardar = false;
        actualizarConteo(lista, etiquetaConteo);
        estado.textContent = "Se borraron tus pronósticos guardados.";
      } catch (error) {
        console.error("No se pudieron borrar los pronósticos:", error);
        estado.textContent = "No se pudieron borrar los pronósticos guardados.";
      }
    });
  } catch (error) {
    console.error("No se pudieron cargar los partidos del prode:", error);
    estado.textContent = errorLecturaPronosticos
      ? "No se pudieron recuperar tus pronósticos ni cargar los partidos. Comprueba tu conexión e inténtalo de nuevo."
      : "No se pudieron cargar los partidos. Comprueba tu conexión e inténtalo de nuevo más tarde.";
    etiquetaConteo.textContent = "No hay pronósticos cargados";
  }
}

