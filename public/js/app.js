const contenedorLigas = document.getElementById("contenedorLigas");

window.addEventListener("load", ()=>{
  //distingue la pagina con atributo dataset en el body
  //Sostener esto? Separar en modulos con app.js centralizandolos?
  let pagina = document.body.dataset.pagina;
  switch(pagina){
    case "index": cargarLigas();
    case "liga": renderizarLiga();
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
async function renderizarLiga(){
  const urlActual = window.location.search;
  const parametros = new URLSearchParams(urlActual);
  const respuesta = await fetch(`/api/ligas/${parametros.get("id")}`);
  if(!respuesta.ok){
    throw new Error("Error en la respuesta: ", error.message);
  }
  const datos = await respuesta.json();
  const escudoLiga = document.getElementById("escudoLiga");
  const tituloLiga = document.getElementById("tituloLiga");
  const paisLiga = document.getElementById("paisLiga");
  const temporadaLiga = document.getElementById("temporadaLiga");

  escudoLiga.src = datos.escudo;
  escudoLiga.alt = `escudo-${datos.nombre}`
  tituloLiga.textContent = datos.nombre;
  paisLiga.textContent = datos.pais;
  temporadaLiga.textContent = datos.temporada;
}