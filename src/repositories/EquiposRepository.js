import { Equipo } from "../models/Equipo.js";
import { normalizarTexto } from "../utils/texto.js";
import { existeArchivo, leerJson, escribirJson } from "../utils/jsonFile.js";
import { mapearEquipoAPI } from "../utils/apiMappers.js";
import { crearError } from "../utils/errores.js";

export class EquiposRepository {
  #equipos;
  #rutaEquipos;

  constructor(rutaEquipos = "./data/equipos.json") {
    this.#equipos = [];
    this.#rutaEquipos = rutaEquipos;
  }

  get equipos() {
    return [...this.#equipos];
  }

  get rutaEquipos() {
    return this.#rutaEquipos;
  }
  set rutaEquipos(ruta) {
    this.#rutaEquipos = ruta;
  }

  cargarLocal() {
    const raw = leerJson(this.#rutaEquipos, []);
    if (!Array.isArray(raw)) return [];
    const equipos = raw.map((e) => mapearEquipoAPI(e));
    this.agregarVarios(equipos);
    return equipos;
  }

  anexarLocal(equiposNuevos = []) {
    const lista = Array.isArray(equiposNuevos)
      ? equiposNuevos
      : [equiposNuevos];
    if (lista.length === 0) return;

    const existentesRaw = leerJson(this.#rutaEquipos, []);
    const existentes = Array.isArray(existentesRaw) ? [...existentesRaw] : [];
    const idsExistentes = new Set(
      existentes.map((e) => String(e.id ?? e.idTeam ?? "")).filter(Boolean),
    );
    const nombresExistentes = new Set(
      existentes
        .map((e) => normalizarTexto(e.nombre ?? e.strTeam ?? ""))
        .filter(Boolean),
    );

    let huboCambios = false;
    for (const eq of lista) {
      if (!eq) continue;
      const serializado = mapearEquipoAPI(eq).toJSON();
      const idStr = String(serializado.id ?? "");
      const nomNorm = normalizarTexto(serializado.nombre ?? "");

      if (
        (idStr && idsExistentes.has(idStr)) ||
        (nomNorm && nombresExistentes.has(nomNorm))
      ) {
        continue;
      }

      if (idStr || nomNorm) {
        existentes.push({
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
        });
        if (idStr) idsExistentes.add(idStr);
        if (nomNorm) nombresExistentes.add(nomNorm);
        huboCambios = true;
      }
    }

    if (huboCambios || !existeArchivo(this.#rutaEquipos)) {
      escribirJson(this.#rutaEquipos, existentes);
    }
  }

  agregar(datos) {
    if (!datos) return null;
    const obj = new Equipo(datos);
    if (!obj.id && !obj.nombre) return null;

    const idStr = String(obj.id);
    const nomNorm = normalizarTexto(obj.nombre);
    const idx = this.#equipos.findIndex(
      (e) =>
        (idStr && String(e.id) === idStr) ||
        (nomNorm && normalizarTexto(e.nombre) === nomNorm),
    );

    if (idx !== -1) {
      const actual = this.#equipos[idx];
      const fusionado = new Equipo({
        id: obj.id || actual.id,
        nombre: obj.nombre || actual.nombre,
        escudo: obj.escudo || actual.escudo,
        estadio: obj.estadio || actual.estadio,
        pais: obj.pais || actual.pais,
        fundacion: obj.fundacion || actual.fundacion,
        descripcion: obj.descripcion || actual.descripcion,
        sitioWeb: obj.sitioWeb || actual.sitioWeb,
        idLiga: obj.idLiga || actual.idLiga,
        nombreLiga: obj.nombreLiga || actual.nombreLiga,
        proximoPartido: obj.proximoPartido || actual.proximoPartido,
        ultimoPartido: obj.ultimoPartido || actual.ultimoPartido,
        posicion: obj.posicion || actual.posicion,
        liga: obj.liga || actual.liga,
      });
      this.#equipos[idx] = fusionado;
      return fusionado;
    }

    this.#equipos.push(obj);
    return obj;
  }

  agregarVarios(datos) {
    if (Array.isArray(datos)) {
      return datos.map((d) => this.agregar(d)).filter(Boolean);
    }
    return this.agregar(datos);
  }

  obtener(id) {
    if (!id) return null;
    const termino = String(id).trim();
    const terminoNorm = normalizarTexto(termino);

    return (
      this.#equipos.find((e) => {
        if (String(e.id) === termino) return true;
        const eNorm = normalizarTexto(e.nombre);
        if (eNorm && eNorm === terminoNorm) return true;
        return (
          terminoNorm.length >= 4 &&
          (eNorm.includes(terminoNorm) || terminoNorm.includes(eNorm))
        );
      }) || null
    );
  }

  buscar(id) {
    const equipo = this.obtener(id);
    if (!equipo)
      throw crearError(404, "team_not_found", `El equipo '${id}' no existe.`);
    return equipo;
  }

  buscarCoincidencias(termino, limite = 10) {
    const q = normalizarTexto(termino);
    if (!q) return [];

    const coincidencias = this.#equipos.filter((eq) => {
      const nomNorm = normalizarTexto(eq.nombre);
      return Boolean(nomNorm && nomNorm.includes(q));
    });

    coincidencias.sort((a, b) => {
      const na = normalizarTexto(a.nombre);
      const nb = normalizarTexto(b.nombre);
      const rankA = na === q ? 0 : na.startsWith(q) ? 1 : 2;
      const rankB = nb === q ? 0 : nb.startsWith(q) ? 1 : 2;
      return rankA !== rankB ? rankA - rankB : a.nombre.localeCompare(b.nombre);
    });

    return coincidencias.slice(0, limite).map((e) => e.toJSON());
  }

  listar() {
    return this.#equipos.map((e) => e.toJSON());
  }
}

export default EquiposRepository;
