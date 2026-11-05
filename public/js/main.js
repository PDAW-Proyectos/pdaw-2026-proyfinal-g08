const contenedorLigas = document.getElementById("contenedorLigas");

window.addEventListener("load", ()=>{
  //distingue la pagina con atributo dataset en el body
  //Sostener esto? Separar en modulos con app.js centralizandolos?
  let pagina = document.body.dataset.pagina;
  switch(pagina){
    case "index": {
      cargarLigas();
      break;
    }
    case "liga": {
      renderizarPaginaLiga();
      break;
    }
  }
});

//Comportamiento de index.html
async function cargarLigas(){
  const respuesta = await fetch("/api/ligas");
  if (!respuesta.ok){
    throw new Error("Error en la respueta: ", error.message);
  }
  const datos = await respuesta.json();
  mostrarLigas(datos);
}

function mostrarLigas(ligas){
  contenedorLigas.innerHTML = "";
  ligas.forEach(liga => {
    let elemLiga = crearCardLiga(liga)
    contenedorLigas.appendChild(elemLiga);
  });
}

function crearCardLiga(liga) {
  const columna = document.createElement("div");
  columna.className = "col";

  const tarjeta = document.createElement("a");
  tarjeta.href = `../liga.html?id=${liga.id}`;
  tarjeta.className = "card shadow-sm";

  const cuerpo = document.createElement("div");
  cuerpo.className = "card-body p-3 d-flex align-items-center gap-2";

  const escudo = document.createElement("img");
  escudo.className = "flex-shrink-0";
  escudo.width = 43;
  escudo.height = 43;
  escudo.src = liga.escudo;
  escudo.alt = `Escudo de ${liga.nombre}`;
  escudo.style.objectFit = "contain";

  const informacion = document.createElement("div");

  const nombre = document.createElement("h2");
  nombre.className = "card-title h6 mb-1";
  nombre.textContent = liga.nombre;

  const pais = document.createElement("p");
  pais.className = "card-text text-body-secondary mb-0";
  pais.textContent = liga.pais;

  informacion.append(nombre, pais);
  cuerpo.append(escudo, informacion);
  tarjeta.append(cuerpo);
  columna.append(tarjeta);

  return columna;
}
//Comportamiento de liga.html
async function renderizarPaginaLiga(){
  const urlActual = window.location.search;
  const parametros = new URLSearchParams(urlActual);
  const respuesta = await fetch(`/api/ligas/${parametros.get("id")}`);
  if(!respuesta.ok){
    throw new Error("Error en la respuesta: ", error.message);
  }
  const liga = await respuesta.json();
  renderizarEncabezadoLiga(liga);
  renderizarTablaLiga(liga);
}
async function renderizarEncabezadoLiga(liga){
  const escudoLiga = document.getElementById("escudoLiga");
  const tituloLiga = document.getElementById("tituloLiga");
  const paisLiga = document.getElementById("paisLiga");
  const temporadaLiga = document.getElementById("temporadaLiga");

  escudoLiga.src = liga.escudo;
  escudoLiga.alt = `escudo-${liga.nombre}`
  tituloLiga.textContent = liga.nombre;
  paisLiga.textContent = liga.pais;
  temporadaLiga.textContent = liga.temporada;
}
function renderizarTablaLiga(liga){
  const cuerpoTabla = document.getElementById("cuerpoTablaPosiciones");
  const tablaDeLiga = liga.tabla;
  cuerpoTabla.replaceChildren();
  tablaDeLiga.forEach(posicion => {
    let tableRow = agregarPosicionATabla(posicion)
    cuerpoTabla.appendChild(tableRow)
  })
}
function agregarPosicionATabla(posicion){
  const tableRow = document.createElement("tr");
  const celdaPosicion = document.createElement("th");
  celdaPosicion.scope = "row";
  celdaPosicion.className = "text-center";
  celdaPosicion.textContent = posicion.posicion ?? "—";
  tableRow.appendChild(celdaPosicion);

  const celdaEquipo = document.createElement("td");
  const informacionEquipo = document.createElement("a");
  informacionEquipo.href = `equipo.html?id=${posicion.idEquipo}`;
  informacionEquipo.className = "d-flex align-items-center gap-2";

  if (posicion.escudoEquipo) {
    const escudoEquipo = document.createElement("img");
    escudoEquipo.src = posicion.escudoEquipo;
    escudoEquipo.alt = "";
    escudoEquipo.width = 30;
    escudoEquipo.height = 30;
    escudoEquipo.className = "flex-shrink-0";
    escudoEquipo.style.objectFit = "contain";
    escudoEquipo.loading = "lazy";
    informacionEquipo.appendChild(escudoEquipo);
  }

  const nombreEquipo = document.createElement("span");
  nombreEquipo.className = "nombre-equipo text-truncate d-inline-block";
  nombreEquipo.textContent = posicion.nombreEquipo ?? "Equipo desconocido";
  informacionEquipo.appendChild(nombreEquipo);
  celdaEquipo.appendChild(informacionEquipo);
  tableRow.appendChild(celdaEquipo);

  const estadisticas = [
    posicion.partidosJugados,
    posicion.victorias,
    posicion.empates,
    posicion.derrotas,
    posicion.golesFavor,
    posicion.golesContra,
    posicion.diferenciaGol,
    posicion.puntos
  ];

  estadisticas.forEach(estadistica => {
    const celdaEstadistica = document.createElement("td");
    celdaEstadistica.className = "text-center";
    celdaEstadistica.textContent = estadistica ?? "—";
    tableRow.appendChild(celdaEstadistica);
  });

  return tableRow;
}