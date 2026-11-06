import { Liga } from "./Liga.js";
import { exponerLiga } from "./formatos.js";
import { Posicion } from "./Posicion.js";

export class RepositorioLigas {
  constructor() {
    this.ligas = [];
  }

  buscarLiga(id) {
    let ligaResultado = this.ligas.filter((l) => l.id == id);
    if (ligaResultado.length === 0) throw new Error("La liga no existe");
    return ligaResultado[0];
  }
  cargarLigas(datos) {
    datos.forEach((liga) => {
      this.agregarLiga(liga);
    });
  }
  agregarLiga(datos) {
    let tabla = datos.tabla.map((posicionCruda) => new Posicion(posicionCruda));
    let nuevaLiga = new Liga(
      datos.id,
      datos.nombre,
      datos.pais,
      datos.escudo,
      datos.temporada,
      tabla,
    );
    this.ligas.push(nuevaLiga);
  }
  listarLigas() {
    let resultado = this.ligas.map((l) => exponerLiga(l));
    return resultado;
  }
}
