import {
  ClienteApiFutbol,
  LIGAS_UTILIZADAS_IDS,
  LIGAS_PRINCIPALES_DEFAULT,
} from "./ClienteApiFutbol.js";
import { ServicioLigas } from "./ServicioLigas.js";
import { ServicioPartidos } from "./ServicioPartidos.js";
import { ServicioEquipos } from "./ServicioEquipos.js";

export { LIGAS_UTILIZADAS_IDS, LIGAS_PRINCIPALES_DEFAULT };

export class ServicioFutbol {
  #clienteApi;
  #servicioLigas;
  #servicioPartidos;
  #servicioEquipos;

  constructor(fetchFn = fetch, rutas = {}) {
    const configRutas = rutas ?? {};
    this.#clienteApi = new ClienteApiFutbol(fetchFn, configRutas);
    this.#servicioLigas = new ServicioLigas(
      this.#clienteApi,
      configRutas.rutaLigas ?? "./data/ligas.json"
    );
    this.#servicioPartidos = new ServicioPartidos(this.#clienteApi, {
      rutaProximos: configRutas.rutaProximos ?? "./data/proximos_partidos.json",
      rutaJugados: configRutas.rutaJugados ?? "./data/partidos_jugados.json",
    });
    this.#servicioEquipos = new ServicioEquipos(
      this.#clienteApi,
      configRutas.rutaEquipos ?? "./data/equipos.json"
    );
  }

  get clienteApi() {
    return this.#clienteApi;
  }

  get servicioLigas() {
    return this.#servicioLigas;
  }

  get servicioPartidos() {
    return this.#servicioPartidos;
  }

  get servicioEquipos() {
    return this.#servicioEquipos;
  }

  get fetchFn() {
    return this.#clienteApi.fetchFn;
  }
  set fetchFn(fn) {
    this.#clienteApi.fetchFn = fn;
  }

  get rutaBase() {
    return this.#clienteApi.rutaBase;
  }
  set rutaBase(url) {
    this.#clienteApi.rutaBase = url;
  }

  get rutaLigas() {
    return this.#servicioLigas.rutaLigas;
  }
  set rutaLigas(ruta) {
    this.#servicioLigas.rutaLigas = ruta;
  }

  get rutaProximos() {
    return this.#servicioPartidos.rutaProximos;
  }
  set rutaProximos(ruta) {
    this.#servicioPartidos.rutaProximos = ruta;
  }

  get rutaJugados() {
    return this.#servicioPartidos.rutaJugados;
  }
  set rutaJugados(ruta) {
    this.#servicioPartidos.rutaJugados = ruta;
  }

  get rutaEquipos() {
    return this.#servicioEquipos.rutaEquipos;
  }
  set rutaEquipos(ruta) {
    this.#servicioEquipos.rutaEquipos = ruta;
  }

  // ===== Ligas =====
  cargarLigasLocal() {
    return this.#servicioLigas.cargarLigasLocal();
  }

  guardarLigasLocal(ligas = []) {
    return this.#servicioLigas.guardarLigasLocal(ligas);
  }

  listarLigas() {
    return this.#servicioLigas.listarLigas();
  }

  buscarLigaPorId(id) {
    return this.#servicioLigas.buscarLigaPorId(id);
  }

  buscarTablaDeLiga(id, opciones = {}) {
    return this.#servicioLigas.buscarTablaDeLiga(id, opciones);
  }

  // ===== Partidos =====
  cargarProximosPartidosLocal() {
    return this.#servicioPartidos.cargarProximosPartidosLocal();
  }

  sobrescribirProximosPartidosLocal(partidos = []) {
    return this.#servicioPartidos.sobrescribirProximosPartidosLocal(partidos);
  }

  anexarProximosPartidosLocal(nuevosPartidos = [], fechaReferencia = new Date()) {
    return this.#servicioPartidos.anexarProximosPartidosLocal(nuevosPartidos, fechaReferencia);
  }

  cargarPartidosJugadosLocal() {
    return this.#servicioPartidos.cargarPartidosJugadosLocal();
  }

  anexarPartidosJugadosLocal(nuevosPartidos = []) {
    return this.#servicioPartidos.anexarPartidosJugadosLocal(nuevosPartidos);
  }

  buscarProximosEventosLiga(idLiga, opciones = {}) {
    return this.#servicioPartidos.buscarProximosEventosLiga(idLiga, opciones);
  }

  buscarEventoPorId(idEvento) {
    return this.#servicioPartidos.buscarEventoPorId(idEvento);
  }

  buscarProximosEventosEquipo(idEquipo) {
    return this.#servicioPartidos.buscarProximosEventosEquipo(idEquipo);
  }

  buscarUltimosEventosEquipo(idEquipo) {
    return this.#servicioPartidos.buscarUltimosEventosEquipo(idEquipo);
  }

  // ===== Equipos =====
  cargarEquiposLocal() {
    return this.#servicioEquipos.cargarEquiposLocal();
  }

  anexarEquipoLocal(equipo) {
    return this.#servicioEquipos.anexarEquipoLocal(equipo);
  }

  anexarEquiposLocal(equiposNuevos = []) {
    return this.#servicioEquipos.anexarEquiposLocal(equiposNuevos);
  }

  buscarEquipoLocal(termino) {
    return this.#servicioEquipos.buscarEquipoLocal(termino);
  }

  buscarEquipoPorId(idEquipo) {
    return this.#servicioEquipos.buscarEquipoPorId(idEquipo);
  }

  buscarEquiposPorNombre(nombreEquipo) {
    return this.#servicioEquipos.buscarEquiposPorNombre(nombreEquipo);
  }

  buscarEquipoPorNombre(nombreEquipo) {
    return this.#servicioEquipos.buscarEquipoPorNombre(nombreEquipo);
  }

  resolverEscudoEquipoLocal(idEquipo, nombreEquipo, opciones = {}) {
    return this.#servicioEquipos.resolverEscudoEquipoLocal(idEquipo, nombreEquipo, opciones);
  }

  // ===== Cliente HTTP =====
  fetchSeguro(url, maxReintentos = 2) {
    return this.#clienteApi.fetchSeguro(url, maxReintentos);
  }
}

export default ServicioFutbol;
