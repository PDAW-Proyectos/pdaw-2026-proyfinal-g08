export const LIGAS_UTILIZADAS_IDS = ["4328", "4331", "4332", "4335", "4334"];
import fs from "node:fs";
import path from "node:path";
import { Liga } from "./Liga.js";
import { Partido } from "./Partido.js";
import { Equipo } from "./Equipo.js";
import {
  formatearLigaAPI,
  formatearTablaAPI,
  formatearPartidoAPI,
  formatearEquipoAPI,
  exponerLiga,
  exponerPartido,
  exponerEquipo,
} from "./formatos.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizarTexto = (texto) =>
  String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

export const LIGAS_PRINCIPALES_DEFAULT = [
  {
    id: "4328",
    nombre: "English Premier League",
    pais: "England",
    escudo: "https://r2.thesportsdb.com/images/media/league/badge/gasy9d1737743125.png",
    temporada: "2026-2027",
    tabla: [],
  },
  {
    id: "4331",
    nombre: "German Bundesliga",
    pais: "Germany",
    escudo: "https://r2.thesportsdb.com/images/media/league/badge/teqh1b1679952008.png",
    temporada: "2026-2027",
    tabla: [],
  },
  {
    id: "4332",
    nombre: "Italian Serie A",
    pais: "Italy",
    escudo: "https://r2.thesportsdb.com/images/media/league/badge/67q3q21679951383.png",
    temporada: "2026-2027",
    tabla: [],
  },
  {
    id: "4335",
    nombre: "Spanish La Liga",
    pais: "Spain",
    escudo: "https://r2.thesportsdb.com/images/media/league/badge/ja4it51687628717.png",
    temporada: "2026-2027",
    tabla: [],
  },
  {
    id: "4334",
    nombre: "French Ligue 1",
    pais: "France",
    escudo: "https://r2.thesportsdb.com/images/media/league/badge/9f7z9d1742983155.png",
    temporada: "2026-2027",
    tabla: [],
  },
];

export class ServicioFutbol {
  #fetchFn;
  #rutaBase;
  #rutaLigas;
  #rutaProximos;
  #rutaJugados;
  #rutaEquipos;
  #intervaloMinimoMs;
  #ultimaPeticionMs;
  #colaPeticiones;

  constructor(fetchFn = fetch, rutas = {}) {
    this.#fetchFn = fetchFn;
    this.#rutaBase = new URL("https://www.thesportsdb.com/api/v1/json/123/");
    const configRutas = typeof rutas === "object" && rutas !== null ? rutas : {};
    this.#rutaLigas = configRutas.rutaLigas ?? "./data/ligas.json";
    this.#rutaProximos = configRutas.rutaProximos ?? "./data/proximos_partidos.json";
    this.#rutaJugados = configRutas.rutaJugados ?? "./data/partidos_jugados.json";
    this.#rutaEquipos = configRutas.rutaEquipos ?? "./data/equipos.json";
    this.#intervaloMinimoMs =
      typeof configRutas.intervaloMinimoMs === "number"
        ? configRutas.intervaloMinimoMs
        : fetchFn === fetch
          ? 1100
          : 0;
    this.#ultimaPeticionMs = 0;
    this.#colaPeticiones = Promise.resolve();
  }

  get fetchFn() {
    return this.#fetchFn;
  }
  set fetchFn(fn) {
    this.#fetchFn = fn;
  }

  get rutaBase() {
    return this.#rutaBase;
  }
  set rutaBase(url) {
    this.#rutaBase = url instanceof URL ? url : new URL(url);
  }

  get rutaLigas() {
    return this.#rutaLigas;
  }
  set rutaLigas(ruta) {
    this.#rutaLigas = ruta;
  }

  get rutaProximos() {
    return this.#rutaProximos;
  }
  set rutaProximos(ruta) {
    this.#rutaProximos = ruta;
  }

  get rutaJugados() {
    return this.#rutaJugados;
  }
  set rutaJugados(ruta) {
    this.#rutaJugados = ruta;
  }

  get rutaEquipos() {
    return this.#rutaEquipos;
  }
  set rutaEquipos(ruta) {
    this.#rutaEquipos = ruta;
  }

  #leerJson(ruta, respaldo = []) {
    try {
      if (!fs.existsSync(ruta)) return respaldo;
      const contenido = fs.readFileSync(ruta, "utf-8");
      if (!contenido.trim()) return respaldo;
      const datos = JSON.parse(contenido);
      return datos ?? respaldo;
    } catch (err) {
      console.warn(`Aviso al leer ${ruta}:`, err.message);
      return respaldo;
    }
  }

  #escribirJson(ruta, datos) {
    try {
      const dir = path.dirname(ruta);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(ruta, JSON.stringify(datos, null, 2), "utf-8");
    } catch (err) {
      console.warn(`Aviso al escribir ${ruta}:`, err.message);
    }
  }

  // ===== Persistencia de Ligas (data/ligas.json) =====
  cargarLigasLocal() {
    const raw = this.#leerJson(this.#rutaLigas, null);
    const arreglo = Array.isArray(raw) && raw.length > 0 ? raw : LIGAS_PRINCIPALES_DEFAULT;
    if (!fs.existsSync(this.#rutaLigas)) {
      this.#escribirJson(this.#rutaLigas, arreglo);
    }
    return arreglo.map(
      (l) =>
        new Liga(
          l.id,
          l.nombre,
          l.pais,
          l.escudo,
          l.temporada,
          formatearTablaAPI(Array.isArray(l.tabla) ? l.tabla : [])
        )
    );
  }

  guardarLigasLocal(ligas = []) {
    const serializadas = ligas.map((l) => exponerLiga(l));
    this.#escribirJson(this.#rutaLigas, serializadas);
  }

  // ===== Persistencia de Próximos Partidos (data/proximos_partidos.json) =====
  cargarProximosPartidosLocal() {
    const raw = this.#leerJson(this.#rutaProximos, []);
    if (!Array.isArray(raw)) return [];
    return raw.map((p) => (p instanceof Partido ? p : formatearPartidoAPI(p)));
  }

  sobrescribirProximosPartidosLocal(partidos = []) {
    const serializados = partidos.map((p) => exponerPartido(p));
    this.#escribirJson(this.#rutaProximos, serializados);
  }

  anexarProximosPartidosLocal(nuevosPartidos = [], fechaReferencia = new Date()) {
    if (!Array.isArray(nuevosPartidos) || nuevosPartidos.length === 0) return;
    const existentesRaw = this.#leerJson(this.#rutaProximos, []);
    const existentes = Array.isArray(existentesRaw) ? [...existentesRaw] : [];
    const idsExistentes = new Set(
      existentes.map((p) => String(p.id ?? p.idEvent ?? "")).filter(Boolean)
    );

    let huboCambios = false;
    for (const partido of nuevosPartidos) {
      if (!partido) continue;
      const partidoObj =
        partido instanceof Partido ? partido : formatearPartidoAPI(partido);
      const idStr = String(partidoObj.id ?? "");
      if (!idStr || idsExistentes.has(idStr)) continue;
      if (partidoObj.esJugado || partidoObj.yaPasoFecha(fechaReferencia)) continue;

      existentes.push(exponerPartido(partidoObj));
      idsExistentes.add(idStr);
      huboCambios = true;
    }

    if (huboCambios || !fs.existsSync(this.#rutaProximos)) {
      existentes.sort((a, b) => {
        const ta = new Date(
          a.timestamp || `${a.fecha}T${a.hora || "00:00:00"}`
        ).getTime();
        const tb = new Date(
          b.timestamp || `${b.fecha}T${b.hora || "00:00:00"}`
        ).getTime();
        return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
      });
      this.#escribirJson(this.#rutaProximos, existentes);
    }
  }

  // ===== Persistencia de Partidos Jugados (data/partidos_jugados.json - SOLO ANEXAR) =====
  cargarPartidosJugadosLocal() {
    const raw = this.#leerJson(this.#rutaJugados, []);
    if (!Array.isArray(raw)) return [];
    return raw.map((p) => (p instanceof Partido ? p : formatearPartidoAPI(p)));
  }

  anexarPartidosJugadosLocal(nuevosPartidos = []) {
    if (!Array.isArray(nuevosPartidos) || nuevosPartidos.length === 0) return;
    const existentesRaw = this.#leerJson(this.#rutaJugados, []);
    const existentes = Array.isArray(existentesRaw) ? [...existentesRaw] : [];
    const idsExistentes = new Set(
      existentes.map((p) => String(p.id ?? p.idEvent ?? "")).filter(Boolean)
    );

    let huboCambios = false;
    for (const partido of nuevosPartidos) {
      if (!partido) continue;
      const serializado = exponerPartido(
        partido instanceof Partido ? partido : formatearPartidoAPI(partido)
      );
      const idStr = String(serializado?.id ?? "");
      if (idStr && !idsExistentes.has(idStr)) {
        existentes.push(serializado);
        idsExistentes.add(idStr);
        huboCambios = true;
      }
    }

    if (huboCambios || !fs.existsSync(this.#rutaJugados)) {
      this.#escribirJson(this.#rutaJugados, existentes);
    }
  }

  // ===== Persistencia de Equipos (data/equipos.json - SOLO ANEXAR) =====
  cargarEquiposLocal() {
    const raw = this.#leerJson(this.#rutaEquipos, []);
    if (!Array.isArray(raw)) return [];
    return raw.map((e) => (e instanceof Equipo ? e : formatearEquipoAPI(e)));
  }

  anexarEquipoLocal(equipo) {
    if (!equipo) return;
    this.anexarEquiposLocal([equipo]);
  }

  anexarEquiposLocal(equiposNuevos = []) {
    if (!Array.isArray(equiposNuevos) || equiposNuevos.length === 0) return;
    const existentesRaw = this.#leerJson(this.#rutaEquipos, []);
    const existentes = Array.isArray(existentesRaw) ? [...existentesRaw] : [];

    const idsExistentes = new Set(
      existentes.map((e) => String(e.id ?? e.idTeam ?? "")).filter(Boolean)
    );
    const nombresExistentes = new Set(
      existentes.map((e) => normalizarTexto(e.nombre ?? e.strTeam ?? "")).filter(Boolean)
    );

    let huboCambios = false;
    for (const eq of equiposNuevos) {
      if (!eq) continue;
      const serializado = exponerEquipo(
        eq instanceof Equipo ? eq : formatearEquipoAPI(eq)
      );
      const idStr = String(serializado?.id ?? "");
      const nomNorm = normalizarTexto(serializado?.nombre ?? "");

      if ((idStr && idsExistentes.has(idStr)) || (nomNorm && nombresExistentes.has(nomNorm))) {
        continue;
      }

      if (idStr || nomNorm) {
        // Guardamos únicamente los datos base del equipo (sin objetos dinámicos de ruta)
        const registroLimpio = {
          id: serializado.id,
          nombre: serializado.nombre,
          escudo: serializado.escudo,
          estadio: serializado.estadio,
          pais: serializado.pais,
          fundacion: serializado.fundacion,
          descripcion: serializado.descripcion,
          sitioWeb: serializado.sitioWeb,
          idLiga: serializado.idLiga,
          nombreLiga: serializado.nombreLiga,
        };
        existentes.push(registroLimpio);
        if (idStr) idsExistentes.add(idStr);
        if (nomNorm) nombresExistentes.add(nomNorm);
        huboCambios = true;
      }
    }

    if (huboCambios || !fs.existsSync(this.#rutaEquipos)) {
      this.#escribirJson(this.#rutaEquipos, existentes);
    }
  }

  buscarEquipoLocal(termino) {
    if (!termino) return null;
    const clave = String(termino).trim();
    const claveNorm = normalizarTexto(clave);
    const equipos = this.cargarEquiposLocal();
    return (
      equipos.find((e) => {
        if (String(e.id) === clave) return true;
        const eNorm = normalizarTexto(e.nombre);
        return Boolean(eNorm && eNorm === claveNorm);
      }) || null
    );
  }

  // ===== Cliente HTTP seguro =====
  async #esperarTurnoPeticion() {
    if (this.#intervaloMinimoMs <= 0) return;
    const ahora = Date.now();
    const transcurrido = ahora - this.#ultimaPeticionMs;
    if (transcurrido < this.#intervaloMinimoMs) {
      await esperar(this.#intervaloMinimoMs - transcurrido);
    }
    this.#ultimaPeticionMs = Date.now();
  }

  async fetchSeguro(url, maxReintentos = 2) {
    const ejecutar = async () => {
      for (let intento = 0; intento < maxReintentos; intento++) {
        await this.#esperarTurnoPeticion();
        let respuesta;
        try {
          respuesta = await this.#fetchFn(url, {
            headers: {
              accept: "application/json",
              "User-Agent": "curl/7.88.1",
            },
          });
        } catch (error) {
          if (intento === maxReintentos - 1) throw error;
          await esperar(400 * (intento + 1));
          continue;
        }

        if (respuesta.status === 429) {
          const headerEspera = respuesta.headers?.get("retry-after");
          const segundos = headerEspera ? parseInt(headerEspera, 10) : 2 * (intento + 1);
          if (segundos <= 5 && intento < maxReintentos - 1) {
            await esperar((segundos + 1) * 1000);
            continue;
          }
          throw new Error(
            headerEspera
              ? `Límite de peticiones de la API alcanzado. Reintenta en ${headerEspera} segundos.`
              : "Límite de peticiones de la API alcanzado. Reintenta más tarde."
          );
        }

        if (!respuesta.ok) {
          throw new Error(`Falla de la API: ${respuesta.status}`);
        }

        return respuesta;
      }
    };

    const turno = this.#colaPeticiones.then(ejecutar, ejecutar);
    this.#colaPeticiones = turno.catch(() => {});
    return turno;
  }

  // ===== Endpoints TheSportsDB =====
  async listarLigas() {
    try {
      const url = new URL("all_leagues.php", this.#rutaBase);
      const respuesta = await this.fetchSeguro(url);
      const datos = (await respuesta.json()).leagues.filter((liga) =>
        LIGAS_UTILIZADAS_IDS.includes(liga.idLeague)
      );
      return datos.map((liga) => formatearLigaAPI(liga));
    } catch (error) {
      console.warn("Aviso en listarLigas de API, usando JSON local:", error.message);
      return this.cargarLigasLocal().map((l) => exponerLiga(l));
    }
  }

  async buscarLigaPorId(id) {
    const clave = String(id);
    try {
      const url = new URL("lookupleague.php", this.#rutaBase);
      url.searchParams.set("id", clave);
      const respuesta = await this.fetchSeguro(url);
      const datos = (await respuesta.json()).leagues;
      if (!datos || datos.length === 0) {
        throw new Error(`Liga con id ${id} no encontrada`);
      }
      return formatearLigaAPI(datos[0]);
    } catch (error) {
      const local = this.cargarLigasLocal().find((l) => String(l.id) === clave);
      if (local) return exponerLiga(local);
      throw error;
    }
  }

  async buscarTablaDeLiga(id, { lanzarError = false, temporada = "" } = {}) {
    const clave = String(id);
    try {
      const url = new URL("lookuptable.php", this.#rutaBase);
      url.searchParams.set("l", clave);
      const respuesta = await this.fetchSeguro(url);
      let datos = (await respuesta.json()).table;

      if ((!Array.isArray(datos) || datos.length === 0) && temporada) {
        const urlTemp = new URL("lookuptable.php", this.#rutaBase);
        urlTemp.searchParams.set("l", clave);
        urlTemp.searchParams.set("s", String(temporada));
        const resTemp = await this.fetchSeguro(urlTemp);
        datos = (await resTemp.json()).table;
      }

      return formatearTablaAPI(datos || []);
    } catch (error) {
      console.warn(`Aviso al buscar tabla de liga ${id}:`, error.message);
      if (lanzarError) throw error;
      return [];
    }
  }

  async buscarProximosEventosLiga(idLiga, opciones = {}) {
    if (!idLiga) return [];
    const {
      idsExistentes = new Set(),
      cantidadNuevaObjetivo = 3,
      fechaReferencia = new Date(),
    } = opciones;

    const esNuevoValido = (p) =>
      Boolean(p?.id) &&
      !p.esJugado &&
      !p.yaPasoFecha(fechaReferencia) &&
      !idsExistentes.has(String(p.id));

    try {
      const url = new URL("eventsnextleague.php", this.#rutaBase);
      url.searchParams.set("id", String(idLiga));
      const respuesta = await this.fetchSeguro(url);
      const cuerpo = await respuesta.json();
      const eventosCrudos = Array.isArray(cuerpo?.events) ? cuerpo.events : [];
      const partidos = eventosCrudos.map((e) => formatearPartidoAPI(e));

      const nuevosEncontrados = () => partidos.filter(esNuevoValido).length;

      // La API gratuita devuelve pocos eventos en eventsnextleague; si faltan partidos nuevos
      // para alcanzar el objetivo de este arranque, consultamos rondas consecutivas con eventsround.php.
      if (partidos.length > 0 && nuevosEncontrados() < cantidadNuevaObjetivo) {
        const ref = partidos[0];
        if (ref.jornada && ref.temporada) {
          const ids = new Set(partidos.map((p) => String(p.id)));
          const rondasAProbar = [];
          const numRonda = parseInt(ref.jornada, 10);
          if (!Number.isNaN(numRonda)) {
            for (let offset = 0; offset < 4; offset++) {
              rondasAProbar.push(String(numRonda + offset));
            }
          } else {
            rondasAProbar.push(String(ref.jornada));
          }

          let rondasVaciasSeguidas = 0;
          for (const ronda of rondasAProbar) {
            if (nuevosEncontrados() >= cantidadNuevaObjetivo) break;
            if (rondasVaciasSeguidas >= 2) break;
            try {
              const urlRonda = new URL("eventsround.php", this.#rutaBase);
              urlRonda.searchParams.set("id", String(idLiga));
              urlRonda.searchParams.set("r", ronda);
              urlRonda.searchParams.set("s", String(ref.temporada));
              const resRonda = await this.fetchSeguro(urlRonda);
              const cuerpoRonda = await resRonda.json();
              const crudosRonda = Array.isArray(cuerpoRonda?.events) ? cuerpoRonda.events : [];
              if (crudosRonda.length === 0) {
                rondasVaciasSeguidas += 1;
                continue;
              }
              rondasVaciasSeguidas = 0;
              for (const ev of crudosRonda) {
                const p = formatearPartidoAPI(ev);
                if (p.id && !ids.has(String(p.id))) {
                  partidos.push(p);
                  ids.add(String(p.id));
                }
              }
            } catch (errRonda) {
              console.warn(`Aviso al consultar ronda ${ronda} de liga ${idLiga}:`, errRonda.message);
            }
          }
        }
      }

      return partidos;
    } catch (error) {
      console.warn(`Aviso al buscar próximos eventos de liga ${idLiga}:`, error.message);
      return [];
    }
  }

  async buscarEventoPorId(idEvento) {
    if (!idEvento) return null;
    try {
      const url = new URL("lookupevent.php", this.#rutaBase);
      url.searchParams.set("id", String(idEvento));
      const respuesta = await this.fetchSeguro(url);
      const cuerpo = await respuesta.json();
      const lista = Array.isArray(cuerpo?.events)
        ? cuerpo.events
        : Array.isArray(cuerpo?.results)
          ? cuerpo.results
          : [];
      if (lista.length === 0) return null;
      return formatearPartidoAPI(lista[0]);
    } catch (error) {
      console.warn(`Aviso al consultar evento ${idEvento} en API:`, error.message);
      return null;
    }
  }

  async buscarEquipoPorId(idEquipo) {
    if (!idEquipo) return null;
    const clave = String(idEquipo);
    const local = this.buscarEquipoLocal(clave);
    if (local) return local;

    try {
      const url = new URL("lookupteam.php", this.#rutaBase);
      url.searchParams.set("id", clave);
      const respuesta = await this.fetchSeguro(url);
      const cuerpo = await respuesta.json();
      const equipos = Array.isArray(cuerpo?.teams) ? cuerpo.teams : [];
      if (equipos.length === 0) return null;
      const equipo = formatearEquipoAPI(equipos[0]);
      this.anexarEquipoLocal(equipo);
      return equipo;
    } catch (error) {
      console.warn(`Aviso al buscar equipo por ID ${idEquipo}:`, error.message);
      return null;
    }
  }

  async buscarEquiposPorNombre(nombreEquipo) {
    if (!nombreEquipo) return [];
    const termino = String(nombreEquipo).trim();
    if (!termino) return [];

    try {
      const url = new URL("searchteams.php", this.#rutaBase);
      url.searchParams.set("t", termino);
      const respuesta = await this.fetchSeguro(url);
      const cuerpo = await respuesta.json();
      const equiposCrudos = Array.isArray(cuerpo?.teams) ? cuerpo.teams : [];
      const soloFutbol = equiposCrudos.filter(
        (t) => !t.strSport || String(t.strSport).toLowerCase() === "soccer"
      );
      const formateados = soloFutbol.map((t) => formatearEquipoAPI(t));
      if (formateados.length > 0) {
        this.anexarEquiposLocal(formateados);
      }
      return formateados;
    } catch (error) {
      console.warn(`Aviso al buscar equipos por nombre ${nombreEquipo}:`, error.message);
      return [];
    }
  }

  async buscarEquipoPorNombre(nombreEquipo) {
    if (!nombreEquipo) return null;
    const local = this.buscarEquipoLocal(nombreEquipo);
    if (local) return local;

    const encontrados = await this.buscarEquiposPorNombre(nombreEquipo);
    return encontrados[0] || null;
  }

  async buscarProximosEventosEquipo(idEquipo) {
    if (!idEquipo) return [];
    try {
      const url = new URL("eventsnext.php", this.#rutaBase);
      url.searchParams.set("id", String(idEquipo));
      const respuesta = await this.fetchSeguro(url);
      const cuerpo = await respuesta.json();
      const eventosCrudos = Array.isArray(cuerpo?.events) ? cuerpo.events : [];
      return eventosCrudos.map((e) => formatearPartidoAPI(e));
    } catch (error) {
      console.warn(`Aviso al buscar próximos eventos para equipo ${idEquipo}:`, error.message);
      return [];
    }
  }

  async buscarUltimosEventosEquipo(idEquipo) {
    if (!idEquipo) return [];
    try {
      const url = new URL("eventslast.php", this.#rutaBase);
      url.searchParams.set("id", String(idEquipo));
      const respuesta = await this.fetchSeguro(url);
      const cuerpo = await respuesta.json();
      const eventosCrudos = Array.isArray(cuerpo?.results) ? cuerpo.results : [];
      return eventosCrudos.map((e) => formatearPartidoAPI(e));
    } catch (error) {
      console.warn(`Aviso al buscar últimos eventos para equipo ${idEquipo}:`, error.message);
      return [];
    }
  }

  resolverEscudoEquipoLocal(idEquipo, nombreEquipo, { repositorioEquipos = null, repositorioLigas = null } = {}) {
    const idStr = idEquipo ? String(idEquipo) : "";
    const nom = normalizarTexto(nombreEquipo);

    if (repositorioEquipos) {
      const eq = repositorioEquipos.obtenerEquipo(idStr || nombreEquipo);
      if (eq?.escudo) return eq.escudo;
    }

    const eqLocal = this.buscarEquipoLocal(idStr || nombreEquipo);
    if (eqLocal?.escudo) return eqLocal.escudo;

    if (repositorioLigas) {
      for (const liga of repositorioLigas.ligas) {
        for (const pos of liga.tabla) {
          if (idStr && String(pos.idEquipo) === idStr && pos.escudoEquipo) return pos.escudoEquipo;
          if (nom && normalizarTexto(pos.nombreEquipo) === nom && pos.escudoEquipo) return pos.escudoEquipo;
        }
      }
    }

    return "";
  }
}

export default ServicioFutbol;
