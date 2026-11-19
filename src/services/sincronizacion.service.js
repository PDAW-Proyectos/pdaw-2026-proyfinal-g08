import { LIGAS_UTILIZADAS_IDS, LIGAS_PRINCIPALES_DEFAULT } from "./apiFutbol.service.js";
import { esperar, compararFechaAsc } from "../utils/fechas.js";

const NUEVOS_POR_LIGA_AL_INICIAR = 1;

async function asegurarEscudosPartido(partido, equiposRepo, equiposService) {
  if (!partido) return partido;
  equiposService.completarEscudosPartidos([partido]);

  if (!partido.escudoEquipoLocal && (partido.idEquipoLocal || partido.nombreEquipoLocal)) {
    const eq = partido.idEquipoLocal
      ? await equiposService.buscarEquipoPorId(partido.idEquipoLocal)
      : await equiposService.buscarEquipoPorNombre(partido.nombreEquipoLocal);
    if (eq) {
      equiposRepo.agregar(eq);
      if (eq.escudo) partido.escudoEquipoLocal = eq.escudo;
    }
  }

  if (!partido.escudoEquipoVisitante && (partido.idEquipoVisitante || partido.nombreEquipoVisitante)) {
    const eq = partido.idEquipoVisitante
      ? await equiposService.buscarEquipoPorId(partido.idEquipoVisitante)
      : await equiposService.buscarEquipoPorNombre(partido.nombreEquipoVisitante);
    if (eq) {
      equiposRepo.agregar(eq);
      if (eq.escudo) partido.escudoEquipoVisitante = eq.escudo;
    }
  }

  return partido;
}

export function cargarDatosLocales({
  ligasRepo,
  partidosRepo,
  equiposRepo,
  equiposService,
  fechaReferencia = new Date(),
}) {
  ligasRepo.cargarLocal(LIGAS_PRINCIPALES_DEFAULT);
  equiposRepo.cargarLocal();
  partidosRepo.agregarVarios(partidosRepo.cargarJugadosLocal());

  const proximosVigentes = partidosRepo
    .cargarProximosLocal()
    .filter((p) => !p.esJugado && !p.yaPasoFecha(fechaReferencia));
  partidosRepo.agregarVarios(proximosVigentes);

  equiposService.completarEscudosPartidos(partidosRepo.partidos);
  return ligasRepo;
}

export async function sincronizarDatosApi({
  ligasRepo,
  partidosRepo,
  equiposRepo,
  partidosService,
  equiposService,
  fechaReferencia = new Date(),
}) {
  const proximosLocales = partidosRepo.cargarProximosLocal();
  const proximosVigentes = [];
  const nuevosJugados = [];
  let huboCambiosProximos = false;

  for (const partido of proximosLocales) {
    if (partido.yaPasoFecha(fechaReferencia) || partido.esJugado) {
      huboCambiosProximos = true;
      partidosRepo.eliminar(partido.id);
      const eventoActualizado = await partidosService.buscarEventoPorId(partido.id);
      if (eventoActualizado) {
        await asegurarEscudosPartido(eventoActualizado, equiposRepo, equiposService);
        nuevosJugados.push(eventoActualizado);
      } else if (partido.esJugado) {
        nuevosJugados.push(partido);
      }
      await esperar(100);
    } else {
      proximosVigentes.push(partido);
    }
  }

  if (nuevosJugados.length > 0) {
    partidosRepo.anexarJugadosLocal(nuevosJugados);
    partidosRepo.agregarVarios(nuevosJugados);
  }

  const proximosAcumulados = [];
  const idsYaIncluidos = new Set();

  for (const partido of proximosVigentes) {
    const idStr = String(partido.id ?? "");
    if (!idStr || idsYaIncluidos.has(idStr)) {
      huboCambiosProximos = true;
      continue;
    }
    proximosAcumulados.push(partido);
    idsYaIncluidos.add(idStr);
  }

  for (const idLiga of LIGAS_UTILIZADAS_IDS) {
    const eventosLiga = await partidosService.buscarProximosEventosLiga(idLiga, {
      idsExistentes: idsYaIncluidos,
      cantidadNuevaObjetivo: NUEVOS_POR_LIGA_AL_INICIAR,
      fechaReferencia,
    });
    const candidatos = eventosLiga
      .filter(
        (ev) =>
          ev.id &&
          !ev.esJugado &&
          !ev.yaPasoFecha(fechaReferencia) &&
          !idsYaIncluidos.has(String(ev.id))
      )
      .sort(compararFechaAsc)
      .slice(0, NUEVOS_POR_LIGA_AL_INICIAR);

    for (const partidoNuevo of candidatos) {
      await asegurarEscudosPartido(partidoNuevo, equiposRepo, equiposService);
      proximosAcumulados.push(partidoNuevo);
      idsYaIncluidos.add(String(partidoNuevo.id));
      huboCambiosProximos = true;
    }

    if (candidatos.length > 0) await esperar(150);
  }

  const proximosFinales = proximosAcumulados.sort(compararFechaAsc);
  equiposService.completarEscudosPartidos(partidosRepo.partidos);
  partidosRepo.agregarVarios(proximosFinales);

  if (huboCambiosProximos || proximosFinales.length !== proximosLocales.length) {
    partidosRepo.sobrescribirProximosLocal(proximosFinales);
  }

  console.log(
    `Repositorio listo con ${ligasRepo.listar().length} ligas, ${equiposRepo.listar().length} equipos y ${partidosRepo.obtenerTodos().length} partidos.`
  );

  return ligasRepo;
}

export async function inicializarDatosFutbol(contexto) {
  cargarDatosLocales(contexto);
  await sincronizarDatosApi(contexto);
  return contexto.ligasRepo;
}
