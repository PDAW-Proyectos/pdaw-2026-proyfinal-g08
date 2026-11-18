import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createUserStore } from "./usuarios/users.js";
import { RepositorioLigas } from "./Futbol/RepositorioLigas.js";
import { RepositorioPartidos } from "./Futbol/RepositorioPartidos.js";
import { RepositorioEquipos } from "./Futbol/RepositorioEquipos.js";
import {
  ServicioFutbol,
  LIGAS_UTILIZADAS_IDS,
} from "./Futbol/ServicioFutbol.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const NUEVOS_POR_LIGA_AL_INICIAR = 1; // En cada arranque se suma hasta 1 próximo partido nuevo por cada liga principal (5 por inicio)

async function asegurarEscudosPartido(
  partido,
  repositorioEquipos,
  repositorioLigas,
  servicioFutbol,
) {
  if (!partido) return partido;

  if (!partido.escudoEquipoLocal) {
    const escudoLocal = servicioFutbol.resolverEscudoEquipoLocal(
      partido.idEquipoLocal,
      partido.nombreEquipoLocal,
      { repositorioEquipos, repositorioLigas },
    );
    if (escudoLocal) {
      partido.escudoEquipoLocal = escudoLocal;
    } else if (partido.idEquipoLocal || partido.nombreEquipoLocal) {
      const eqLocal = partido.idEquipoLocal
        ? await servicioFutbol.buscarEquipoPorId(partido.idEquipoLocal)
        : await servicioFutbol.buscarEquipoPorNombre(partido.nombreEquipoLocal);
      if (eqLocal) {
        repositorioEquipos.agregarEquipo(eqLocal);
        if (eqLocal.escudo) partido.escudoEquipoLocal = eqLocal.escudo;
      }
    }
  }

  if (!partido.escudoEquipoVisitante) {
    const escudoVisitante = servicioFutbol.resolverEscudoEquipoLocal(
      partido.idEquipoVisitante,
      partido.nombreEquipoVisitante,
      { repositorioEquipos, repositorioLigas },
    );
    if (escudoVisitante) {
      partido.escudoEquipoVisitante = escudoVisitante;
    } else if (partido.idEquipoVisitante || partido.nombreEquipoVisitante) {
      const eqVis = partido.idEquipoVisitante
        ? await servicioFutbol.buscarEquipoPorId(partido.idEquipoVisitante)
        : await servicioFutbol.buscarEquipoPorNombre(
            partido.nombreEquipoVisitante,
          );
      if (eqVis) {
        repositorioEquipos.agregarEquipo(eqVis);
        if (eqVis.escudo) partido.escudoEquipoVisitante = eqVis.escudo;
      }
    }
  }

  return partido;
}

export function cargarDatosLocales(
  servicioFutbol = new ServicioFutbol(),
  repositorioPartidos = new RepositorioPartidos(),
  repositorioEquipos = new RepositorioEquipos(),
  fechaReferencia = new Date(),
) {
  const repositorioLigas = new RepositorioLigas();

  // 1. Cargar las 5 ligas principales desde data/ligas.json (sin peticiones a la API ni tablas por adelantado)
  const ligasLocales = servicioFutbol.cargarLigasLocal();
  repositorioLigas.cargarLigas(ligasLocales);

  // 2. Cargar equipos almacenados desde data/equipos.json (sin sobrescribir ni consultar API)
  const equiposLocales = servicioFutbol.cargarEquiposLocal();
  repositorioEquipos.agregarEquipos(equiposLocales);

  // 3. Cargar partidos jugados históricos desde data/partidos_jugados.json
  const jugadosLocales = servicioFutbol.cargarPartidosJugadosLocal();
  repositorioPartidos.agregarPartidos(jugadosLocales);

  // 4. Precargar en memoria los próximos partidos vigentes para responder al instante
  const proximosLocales = servicioFutbol.cargarProximosPartidosLocal();
  const proximosVigentes = proximosLocales.filter(
    (p) => !p.esJugado && !p.yaPasoFecha(fechaReferencia),
  );
  repositorioPartidos.agregarPartidos(proximosVigentes);

  for (const p of repositorioPartidos.partidos) {
    if (!p.escudoEquipoLocal) {
      const esc = servicioFutbol.resolverEscudoEquipoLocal(
        p.idEquipoLocal,
        p.nombreEquipoLocal,
        { repositorioEquipos, repositorioLigas },
      );
      if (esc) p.escudoEquipoLocal = esc;
    }
    if (!p.escudoEquipoVisitante) {
      const esc = servicioFutbol.resolverEscudoEquipoLocal(
        p.idEquipoVisitante,
        p.nombreEquipoVisitante,
        { repositorioEquipos, repositorioLigas },
      );
      if (esc) p.escudoEquipoVisitante = esc;
    }
  }

  repositorioLigas.repositorioPartidos = repositorioPartidos;
  repositorioLigas.repositorioEquipos = repositorioEquipos;
  repositorioLigas.servicioFutbol = servicioFutbol;
  return repositorioLigas;
}

export async function sincronizarDatosApi(
  servicioFutbol,
  repositorioLigas,
  repositorioPartidos,
  repositorioEquipos,
  fechaReferencia = new Date(),
) {
  // 1. Cargar próximos partidos y verificar si ya pasaron su fecha
  const proximosLocales = servicioFutbol.cargarProximosPartidosLocal();
  const proximosVigentes = [];
  const nuevosJugados = [];
  let huboCambiosProximos = false;

  for (const partido of proximosLocales) {
    if (partido.yaPasoFecha(fechaReferencia) || partido.esJugado) {
      huboCambiosProximos = true;
      repositorioPartidos.eliminarPartido(partido.id);
      // Solicitar el partido jugado a la API y anexarlo a partidos_jugados.json
      const eventoActualizado = await servicioFutbol.buscarEventoPorId(
        partido.id,
      );
      if (eventoActualizado) {
        await asegurarEscudosPartido(
          eventoActualizado,
          repositorioEquipos,
          repositorioLigas,
          servicioFutbol,
        );
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
    servicioFutbol.anexarPartidosJugadosLocal(nuevosJugados);
    repositorioPartidos.agregarPartidos(nuevosJugados);
  }

  // 2. Conservar todos los partidos vigentes (incluidas competiciones descubiertas desde equipos)
  // y sumar hasta 1 próximo partido nuevo por cada una de las 5 ligas principales (5 por inicio)
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
    const eventosLiga = await servicioFutbol.buscarProximosEventosLiga(idLiga, {
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
          !idsYaIncluidos.has(String(ev.id)),
      )
      .sort((a, b) => {
        const ta = a.fechaDate ? a.fechaDate.getTime() : 0;
        const tb = b.fechaDate ? b.fechaDate.getTime() : 0;
        return ta - tb;
      })
      .slice(0, NUEVOS_POR_LIGA_AL_INICIAR);

    for (const partidoNuevo of candidatos) {
      await asegurarEscudosPartido(
        partidoNuevo,
        repositorioEquipos,
        repositorioLigas,
        servicioFutbol,
      );
      proximosAcumulados.push(partidoNuevo);
      idsYaIncluidos.add(String(partidoNuevo.id));
      huboCambiosProximos = true;
    }

    if (candidatos.length > 0) {
      await esperar(150);
    }
  }

  const proximosFinales = proximosAcumulados.sort((a, b) => {
    const ta = a.fechaDate ? a.fechaDate.getTime() : 0;
    const tb = b.fechaDate ? b.fechaDate.getTime() : 0;
    return ta - tb;
  });

  // Asegurar escudos en partidos en memoria usando el repositorio local de equipos/tablas
  for (const p of repositorioPartidos.partidos) {
    if (!p.escudoEquipoLocal) {
      const esc = servicioFutbol.resolverEscudoEquipoLocal(
        p.idEquipoLocal,
        p.nombreEquipoLocal,
        { repositorioEquipos, repositorioLigas },
      );
      if (esc) p.escudoEquipoLocal = esc;
    }
    if (!p.escudoEquipoVisitante) {
      const esc = servicioFutbol.resolverEscudoEquipoLocal(
        p.idEquipoVisitante,
        p.nombreEquipoVisitante,
        { repositorioEquipos, repositorioLigas },
      );
      if (esc) p.escudoEquipoVisitante = esc;
    }
  }

  repositorioPartidos.agregarPartidos(proximosFinales);

  if (
    huboCambiosProximos ||
    proximosFinales.length !== proximosLocales.length
  ) {
    servicioFutbol.sobrescribirProximosPartidosLocal(proximosFinales);
  }

  console.log(
    `Repositorio listo con ${repositorioLigas.listarLigas().length} ligas, ${repositorioEquipos.listarEquipos().length} equipos y ${repositorioPartidos.obtenerTodos().length} partidos.`,
  );

  return repositorioLigas;
}

export async function inicializarLigas(
  servicioFutbol = new ServicioFutbol(),
  repositorioPartidos = new RepositorioPartidos(),
  repositorioEquipos = new RepositorioEquipos(),
  fechaReferencia = new Date(),
) {
  const repositorioLigas = cargarDatosLocales(
    servicioFutbol,
    repositorioPartidos,
    repositorioEquipos,
    fechaReferencia,
  );
  await sincronizarDatosApi(
    servicioFutbol,
    repositorioLigas,
    repositorioPartidos,
    repositorioEquipos,
    fechaReferencia,
  );
  return repositorioLigas;
}

function resolverPuertoServidor() {
  const puertoEnv = Number(process.env.PORT);
  const puertoNginx = Number(process.env.NGINX_PORT);
  const puertoDefaultApp = Number(process.env.DEFAULT_APP_PORT) || 3000;

  if (puertoEnv && (!puertoNginx || puertoEnv !== puertoNginx)) {
    return puertoEnv;
  }
  return puertoDefaultApp;
}

export async function startServer() {
  const users = await createUserStore(process.env.USER_STORE_PATH);
  const servicioFutbol = new ServicioFutbol();
  const repositorioPartidos = new RepositorioPartidos();
  const repositorioEquipos = new RepositorioEquipos();
  const repositorioLigas = cargarDatosLocales(
    servicioFutbol,
    repositorioPartidos,
    repositorioEquipos,
  );

  const app = createApp({
    users,
    repositorioLigas,
    repositorioPartidos,
    repositorioEquipos,
    servicioFutbol,
    production: process.env.NODE_ENV === "production",
  });

  const port = resolverPuertoServidor();
  const host = "localhost";

  const server = app.listen(port, host, () => {
    console.log(`Servidor Orsai disponible en http://${host}:${port}`);
    sincronizarDatosApi(
      servicioFutbol,
      repositorioLigas,
      repositorioPartidos,
      repositorioEquipos,
    ).catch((error) => {
      console.warn(
        "Aviso al sincronizar partidos en segundo plano:",
        error.message,
      );
    });
  });

  server.on("error", (error) => {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  });

  return { app, server };
}

const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  startServer().catch((error) => {
    console.error("No se pudo iniciar el servidor:", error);
    process.exit(1);
  });
}
