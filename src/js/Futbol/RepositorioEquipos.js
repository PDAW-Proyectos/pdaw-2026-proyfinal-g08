import { Equipo } from "./Equipo.js";

export class RepositorioEquipos {
  constructor() {
    this.equipos = [];
  }

  buscarEquipo(id) {
    const resultado = this.equipos.find((e) => String(e.id) === String(id));
    if (!resultado) {
      throw new Error("El equipo no existe");
    }
    return resultado;
  }

  agregarEquipos(datos) {
    const equipoNuevo = new Equipo(
      datos.id,
      datos.nombre,
      datos.escudo,
      datos.proximoPartido
    );
    this.equipos.push(equipoNuevo);
    return equipoNuevo;
  }
}

export default RepositorioEquipos;
